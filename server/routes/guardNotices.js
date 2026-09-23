const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db');
const { authenticateToken, requireAdminOrGuard } = require('../middleware');

const VALID_CATEGORIES = [
  'Delivery',
  'Proveedor de servicios',
  'Consulta de ingresos',
  'Animales sueltos',
  'Otros…',
  'Otros'
];

// GET /api/guard-notices
// Residents see their own notices; Guard and Admin see all notices
router.get('/', authenticateToken, (req, res) => {
  try {
    const isGuard = req.user.role === 'guardia';
    const isAdmin = req.user.role === 'admin';
    const canSeeAll = isGuard || isAdmin;
    const { status } = req.query;

    let query = `
      SELECT id, userId, residentName, lote, manzana, category, company, timeEstimated, details, status, response, resolvedAt, resolvedBy, createdAt
      FROM guard_notices
    `;
    const params = [];
    const conditions = [];

    if (!canSeeAll) {
      conditions.push('userId = ?');
      params.push(req.user.id);
    }

    if (status && status.trim()) {
      conditions.push('status = ?');
      params.push(status.trim());
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += " ORDER BY CASE WHEN status = 'Pendiente' THEN 0 ELSE 1 END, createdAt DESC LIMIT 100";

    const notices = db.prepare(query).all(...params);
    res.json(notices);
  } catch (error) {
    console.error('[Get Guard Notices Error]', error);
    res.status(500).json({ error: 'Error al consultar avisos a guardia.' });
  }
});

// POST /api/guard-notices
// Resident submits a notice to guard
router.post('/', authenticateToken, (req, res) => {
  try {
    const { category, details, company, timeEstimated } = req.body;

    if (!category || !VALID_CATEGORIES.includes(category.trim())) {
      return res.status(400).json({
        error: 'Categoría no válida. Opciones: Delivery, Proveedor de servicios, Consulta de ingresos, Animales sueltos, Otros…'
      });
    }

    if (!details || !String(details).trim()) {
      return res.status(400).json({ error: 'El detalle o comentario del aviso es obligatorio.' });
    }

    const cleanCategory = category.trim();
    const cleanDetails = String(details).trim();
    const cleanCompany = company && String(company).trim() ? String(company).trim() : null;
    const cleanTime = timeEstimated && String(timeEstimated).trim() ? String(timeEstimated).trim() : null;

    const residentFullName = `${req.user.nombre} ${req.user.apellido}`.trim();
    const lote = req.user.lote || null;
    const manzana = req.user.manzana || null;
    const locationStr = lote || manzana ? `(Lote ${lote || '-'}, Mz ${manzana || '-'})` : '';
    const now = new Date().toISOString();

    const insertNotice = db.prepare(`
      INSERT INTO guard_notices (userId, residentName, lote, manzana, category, company, timeEstimated, details, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?)
    `);

    const result = insertNotice.run(
      req.user.id,
      residentFullName,
      lote,
      manzana,
      cleanCategory,
      cleanCompany,
      cleanTime,
      cleanDetails,
      now
    );

    const noticeId = Number(result.lastInsertRowid);

    // Notify Guard role in real-time
    const guardNotifText = `${residentFullName} ${locationStr}: ${cleanDetails}${cleanCompany ? ` [Empresa: ${cleanCompany}]` : ''}${cleanTime ? ` [Horario: ${cleanTime}]` : ''}`;
    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (NULL, 'guardia', ?, ?, 0, ?)
    `).run(`Aviso de vecino: ${cleanCategory}`, guardNotifText, now);

    // Audit activity in activity_logs
    logActivity(
      req.user.id,
      `${residentFullName} (${req.user.username || req.user.email})`,
      req.user.role,
      'AVISO_A_GUARDIA',
      `Aviso para guardia - Categoría: "${cleanCategory}" - ${locationStr} - Detalle: "${cleanDetails}"`,
      req.ip || ''
    );

    res.status(201).json({
      message: 'Aviso enviado a la guardia con éxito.',
      notice: {
        id: noticeId,
        userId: req.user.id,
        residentName: residentFullName,
        lote,
        manzana,
        category: cleanCategory,
        company: cleanCompany,
        timeEstimated: cleanTime,
        details: cleanDetails,
        status: 'Pendiente',
        createdAt: now
      }
    });
  } catch (error) {
    console.error('[Create Guard Notice Error]', error);
    res.status(500).json({ error: 'Error al enviar aviso a guardia.' });
  }
});

// PATCH /api/guard-notices/:id/status
// Guard or Admin marks notice as attended or updates status/response
router.patch('/:id/status', authenticateToken, requireAdminOrGuard, (req, res) => {
  try {
    const noticeId = Number(req.params.id);
    const { status, response: responseText } = req.body;

    const allowed = ['Pendiente', 'Atendido', 'Finalizado'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: 'Estado no válido. Opciones: Pendiente, Atendido, Finalizado.' });
    }

    const notice = db.prepare('SELECT * FROM guard_notices WHERE id = ?').get(noticeId);
    if (!notice) {
      return res.status(404).json({ error: 'Aviso a guardia no encontrado.' });
    }

    const now = new Date().toISOString();
    const guardName = `${req.user.nombre} ${req.user.apellido} (${req.user.role === 'guardia' ? 'Guardia' : 'Admin'})`;
    const cleanResponse = responseText && String(responseText).trim() ? String(responseText).trim() : null;

    db.prepare(`
      UPDATE guard_notices
      SET status = ?, response = ?, resolvedAt = ?, resolvedBy = ?
      WHERE id = ?
    `).run(status, cleanResponse || notice.response, now, guardName, noticeId);

    // Notify the resident who created the notice
    let residentNotifText = `Tu aviso de "${notice.category}" fue marcado como ${status.toLowerCase()} por ${guardName}.`;
    if (cleanResponse) {
      residentNotifText += ` Comentario de guardia: "${cleanResponse}"`;
    }

    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (?, 'user', 'Aviso atendido por guardia', ?, 0, ?)
    `).run(notice.userId, residentNotifText, now);

    // Audit activity in activity_logs
    logActivity(
      req.user.id,
      `${req.user.nombre} ${req.user.apellido} (${req.user.username || req.user.email})`,
      req.user.role,
      'ATENDER_AVISO_GUARDIA',
      `Aviso #${noticeId} (${notice.category} de ${notice.residentName}) actualizado a "${status}".${cleanResponse ? ` Respuesta: "${cleanResponse}"` : ''}`,
      req.ip || ''
    );

    res.json({
      message: `Aviso actualizado a "${status}".`,
      notice: {
        id: noticeId,
        status,
        response: cleanResponse || notice.response,
        resolvedAt: now,
        resolvedBy: guardName
      }
    });
  } catch (error) {
    console.error('[Update Guard Notice Status Error]', error);
    res.status(500).json({ error: 'Error al actualizar aviso a guardia.' });
  }
});

// GET /api/guard-notices/residents
// Guard or Admin fetches list of active approved residents to notify
router.get('/residents', authenticateToken, requireAdminOrGuard, (req, res) => {
  try {
    const residents = db.prepare(`
      SELECT id, nombre, apellido, username, lote, manzana, telefono, email
      FROM users
      WHERE approved = 1 AND role = 'user'
      ORDER BY
        CASE WHEN lote IS NOT NULL AND lote != '' THEN CAST(lote AS INTEGER) ELSE 9999 END ASC,
        apellido ASC,
        nombre ASC
    `).all();

    res.json(residents);
  } catch (error) {
    console.error('[Get Residents For Guard Error]', error);
    res.status(500).json({ error: 'Error al consultar lista de vecinos.' });
  }
});

// POST /api/guard-notices/notify-resident
// Guard sends notification to a specific resident with a free text field. Fully audited!
router.post('/notify-resident', authenticateToken, requireAdminOrGuard, (req, res) => {
  try {
    const { residentId, title, message } = req.body;

    if (!residentId) {
      return res.status(400).json({ error: 'El vecino destinatario es obligatorio.' });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'El comentario o texto de la notificación es obligatorio.' });
    }

    const targetUser = db.prepare(`
      SELECT id, nombre, apellido, username, lote, manzana, telefono, email, approved, role
      FROM users
      WHERE id = ?
    `).get(Number(residentId));

    if (!targetUser) {
      return res.status(404).json({ error: 'El vecino seleccionado no existe en el sistema.' });
    }

    if (!targetUser.approved) {
      return res.status(400).json({ error: 'El vecino seleccionado no se encuentra activo.' });
    }

    const cleanTitle = title && String(title).trim() ? String(title).trim() : 'Aviso de Guardia';
    const cleanMessage = String(message).trim();
    const now = new Date().toISOString();
    const guardFullName = `${req.user.nombre} ${req.user.apellido}`.trim();
    const guardIdentifier = `${guardFullName} (${req.user.username || req.user.email})`;
    const residentLocation = targetUser.lote || targetUser.manzana ? `(Lote ${targetUser.lote || '-'}, Mz ${targetUser.manzana || '-'})` : '';

    // Insert personal notification strictly for the selected neighbor
    const notifResult = db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, senderId, senderName, createdAt)
      VALUES (?, 'user', ?, ?, 0, ?, ?, ?)
    `).run(
      targetUser.id,
      cleanTitle,
      cleanMessage,
      req.user.id,
      `${guardFullName} (Guardia)`,
      now
    );

    // AUDIT LOG (Strict requirement: "Todo debe quedar auditado")
    const auditAction = 'NOTIFICACION_GUARDIA_VECINO';
    const auditDetails = `Notificación enviada a vecino ${targetUser.nombre} ${targetUser.apellido} ${residentLocation} [Usuario: ${targetUser.username || targetUser.email}] - Título: "${cleanTitle}" - Comentario: "${cleanMessage}"`;

    logActivity(
      req.user.id,
      guardIdentifier,
      req.user.role,
      auditAction,
      auditDetails,
      req.ip || ''
    );

    res.status(201).json({
      message: `Notificación enviada al vecino ${targetUser.nombre} ${targetUser.apellido}. Registro auditado.`,
      notification: {
        id: Number(notifResult.lastInsertRowid),
        residentId: targetUser.id,
        residentName: `${targetUser.nombre} ${targetUser.apellido}`,
        title: cleanTitle,
        text: cleanMessage,
        createdAt: now
      },
      audit: {
        action: auditAction,
        details: auditDetails,
        timestamp: now,
        operator: guardIdentifier
      }
    });
  } catch (error) {
    console.error('[Guard Notify Resident Error]', error);
    res.status(500).json({ error: 'Error al enviar notificación al vecino.' });
  }
});

module.exports = router;
