const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware');
const { sendWhatsAppTextMessage } = require('../whatsapp');
const { sendGenericEmail, getMailerStatus } = require('../mailer');

const VALID_CATEGORIES = [
  'Expensas y Pagos',
  'Mantenimiento y Obras',
  'Convivencia y Normas',
  'Trámites y Permisos',
  'Consulta General',
  'Otros…',
  'Otros'
];

// GET /api/admin-notices
// Residents see their own notices; Admin sees all notices
router.get('/', authenticateToken, (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { status } = req.query;

    let query = `
      SELECT id, userId, residentName, lote, manzana, userEmail, userPhone, category, subject, details, status, response, resolvedAt, resolvedBy, createdAt
      FROM admin_notices
    `;
    const params = [];
    const conditions = [];

    if (!isAdmin) {
      conditions.push('userId = ?');
      params.push(req.user.id);
    }

    if (status && String(status).trim()) {
      conditions.push('status = ?');
      params.push(String(status).trim());
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += " ORDER BY CASE WHEN status = 'Pendiente' THEN 0 ELSE 1 END, createdAt DESC LIMIT 150";

    const notices = db.prepare(query).all(...params);
    res.json(notices);
  } catch (error) {
    console.error('[Get Admin Notices Error]', error);
    res.status(500).json({ error: 'Error al consultar avisos a administración.' });
  }
});

// POST /api/admin-notices
// Resident submits a notice to administration
router.post('/', authenticateToken, (req, res) => {
  try {
    const { category, subject, details } = req.body;

    if (!category || !VALID_CATEGORIES.some(cat => cat.toLowerCase() === String(category).trim().toLowerCase())) {
      return res.status(400).json({
        error: 'Categoría no válida. Opciones: Expensas y Pagos, Mantenimiento y Obras, Convivencia y Normas, Trámites y Permisos, Consulta General, Otros…'
      });
    }

    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ error: 'El asunto o título del aviso es obligatorio.' });
    }

    if (!details || !String(details).trim()) {
      return res.status(400).json({ error: 'El detalle o mensaje para la administración es obligatorio.' });
    }

    const cleanCategory = String(category).trim();
    const cleanSubject = String(subject).trim();
    const cleanDetails = String(details).trim();

    const residentFullName = `${req.user.nombre} ${req.user.apellido}`.trim();
    const lote = req.user.lote || null;
    const manzana = req.user.manzana || null;
    const userEmail = req.user.email || null;
    const userPhone = req.user.telefono || null;
    const locationStr = lote || manzana ? `(Lote ${lote || '-'}, Mz ${manzana || '-'})` : '';
    const now = new Date().toISOString();

    const insertNotice = db.prepare(`
      INSERT INTO admin_notices (userId, residentName, lote, manzana, userEmail, userPhone, category, subject, details, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?)
    `);

    const result = insertNotice.run(
      req.user.id,
      residentFullName,
      lote,
      manzana,
      userEmail,
      userPhone,
      cleanCategory,
      cleanSubject,
      cleanDetails,
      now
    );

    const noticeId = Number(result.lastInsertRowid);

    // Notify Administrator in real-time via in-app notifications
    const adminNotifTitle = `🏛️ Aviso a Administración: ${cleanSubject}`;
    const adminNotifText = `${residentFullName} ${locationStr} [${cleanCategory}]: ${cleanDetails}`;

    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, senderId, senderName, createdAt)
      VALUES (NULL, 'admin', ?, ?, 0, ?, ?, ?)
    `).run(adminNotifTitle, adminNotifText, req.user.id, residentFullName, now);

    // Audit activity in activity_logs
    logActivity(
      req.user.id,
      `${residentFullName} (${req.user.username || req.user.email})`,
      req.user.role,
      'AVISO_A_ADMINISTRACION',
      `Aviso a Administración - [${cleanCategory}] Asunto: "${cleanSubject}" - ${locationStr} - Detalle: "${cleanDetails}"`,
      req.ip || ''
    );

    res.status(201).json({
      message: 'Aviso enviado a la administración con éxito.',
      notice: {
        id: noticeId,
        userId: req.user.id,
        residentName: residentFullName,
        lote,
        manzana,
        userEmail,
        userPhone,
        category: cleanCategory,
        subject: cleanSubject,
        details: cleanDetails,
        status: 'Pendiente',
        createdAt: now
      }
    });
  } catch (error) {
    console.error('[Create Admin Notice Error]', error);
    res.status(500).json({ error: 'Error al enviar aviso a la administración.' });
  }
});

// PATCH /api/admin-notices/:id/status
// Admin updates status (Pendiente, En gestión, Respondido, Resuelto) and adds an official response
router.patch('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const noticeId = Number(req.params.id);
    const { status, response } = req.body;

    const allowedStatuses = ['Pendiente', 'En gestión', 'Respondido', 'Resuelto'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado no válido. Opciones: Pendiente, En gestión, Respondido, Resuelto.' });
    }

    const notice = db.prepare('SELECT * FROM admin_notices WHERE id = ?').get(noticeId);
    if (!notice) {
      return res.status(404).json({ error: 'Aviso no encontrado.' });
    }

    const now = new Date().toISOString();
    const adminName = `${req.user.nombre} ${req.user.apellido} (Administración)`.trim();
    const cleanResponse = response && String(response).trim() ? String(response).trim() : null;

    db.prepare(`
      UPDATE admin_notices
      SET status = ?, response = ?, resolvedAt = ?, resolvedBy = ?
      WHERE id = ?
    `).run(status, cleanResponse || notice.response, now, adminName, noticeId);

    // Notify Resident about the official response/status change
    const resident = db.prepare('SELECT id, nombre, apellido, email, telefono FROM users WHERE id = ?').get(notice.userId);
    const notifTitle = `🏛️ Administración respondió tu aviso: ${notice.subject}`;
    const notifText = cleanResponse
      ? `${adminName}: "${cleanResponse}" (Estado: ${status})`
      : `Tu aviso "${notice.subject}" ha sido actualizado al estado: "${status}" por Administración.`;

    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, senderId, senderName, createdAt)
      VALUES (?, 'user', ?, ?, 0, ?, ?, ?)
    `).run(notice.userId, notifTitle, notifText, req.user.id, adminName, now);

    // Forward response to WhatsApp if configured and phone available
    if (resident && resident.telefono) {
      sendWhatsAppTextMessage({
        phone: resident.telefono,
        title: notifTitle,
        message: notifText,
        senderName: 'Administración Rancho Doble S',
        recipientName: `${resident.nombre} ${resident.apellido}`
      }).catch(err => console.error('[WhatsApp Resident Admin Notice Response Error]', err));
    }

    // Forward response to Email if configured and email available
    const mailerStatus = getMailerStatus();
    if (mailerStatus.configured && resident && resident.email && resident.email.includes('@')) {
      sendGenericEmail({
        to: resident.email,
        subject: `Rancho Doble S — Respuesta a tu aviso: ${notice.subject}`,
        text: `Hola ${resident.nombre} ${resident.apellido},\n\nLa administración ha respondido a tu aviso sobre "${notice.subject}":\n\nEstado: ${status}\nRespuesta:\n${cleanResponse || 'Tu aviso se encuentra ' + status + '.'}\n\nAdministración Rancho Doble S`,
        fromName: 'Administración Rancho Doble S'
      }).catch(err => console.error('[Email Resident Admin Notice Response Error]', err));
    }

    // Audit log
    logActivity(
      req.user.id,
      `${req.user.nombre} ${req.user.apellido} (${req.user.username || req.user.email})`,
      'admin',
      'RESPONDER_AVISO_ADMINISTRACION',
      `Respuesta a aviso ID #${noticeId} (${notice.residentName}, Lote ${notice.lote || '-'}) - Nuevo estado: ${status} - Respuesta: "${cleanResponse || 'Sin mensaje'}"`,
      req.ip || ''
    );

    res.json({
      message: 'Aviso actualizado con éxito.',
      notice: {
        ...notice,
        status,
        response: cleanResponse || notice.response,
        resolvedAt: now,
        resolvedBy: adminName
      }
    });
  } catch (error) {
    console.error('[Update Admin Notice Status Error]', error);
    res.status(500).json({ error: 'Error al actualizar el estado del aviso.' });
  }
});

module.exports = router;
