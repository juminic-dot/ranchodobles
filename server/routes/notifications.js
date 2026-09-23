const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db');
const { authenticateToken, requireAdmin, requireAdminOrGuard } = require('../middleware');

// GET /api/notifications
// Retrieves notifications filtered strictly by user role and ownership
router.get('/', authenticateToken, (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const isGuard = req.user.role === 'guardia';
    let notifications;

    if (isAdmin) {
      // Admin sees:
      // 1. Personal notifications for their own account
      // 2. Operational admin events (targetRole = 'admin')
      // 3. Community broadcasts (targetRole = 'all')
      // 4. Notifications sent by this admin
      // (Notices between guardia and residents are strictly private between them)
      notifications = db.prepare(`
        SELECT n.id, n.userId, COALESCE(n.targetRole, 'user') AS targetRole, n.title, n.text, n.senderName, n.senderId, n.createdAt,
               CASE
                 WHEN n.userId = ? THEN n.read
                 ELSE CASE WHEN nr.notificationId IS NOT NULL THEN 1 ELSE 0 END
               END AS read
        FROM notifications n
        LEFT JOIN notification_reads nr
          ON n.id = nr.notificationId AND nr.userId = ?
        WHERE (n.userId = ?)
           OR (n.targetRole = 'admin')
           OR (n.targetRole = 'all')
           OR (n.senderId = ?)
        ORDER BY n.createdAt DESC
        LIMIT 60
      `).all(req.user.id, req.user.id, req.user.id, req.user.id);
    } else if (isGuard) {
      // Guardia sees:
      // 1. Notices directed to guardia (targetRole = 'guardia')
      // 2. Community broadcasts (targetRole = 'all')
      // 3. Notifications directly assigned to or sent by this guard
      notifications = db.prepare(`
        SELECT n.id, n.userId, COALESCE(n.targetRole, 'guardia') AS targetRole, n.title, n.text, n.senderName, n.senderId, n.createdAt,
               CASE
                 WHEN n.userId = ? THEN n.read
                 ELSE CASE WHEN nr.notificationId IS NOT NULL THEN 1 ELSE 0 END
               END AS read
        FROM notifications n
        LEFT JOIN notification_reads nr
          ON n.id = nr.notificationId AND nr.userId = ?
        WHERE (n.targetRole = 'guardia')
           OR (n.targetRole = 'all')
           OR (n.userId = ?)
           OR (n.senderId = ?)
        ORDER BY n.createdAt DESC
        LIMIT 60
      `).all(req.user.id, req.user.id, req.user.id, req.user.id);
    } else {
      // Resident sees strictly:
      // 1. Their own personal notifications (n.userId = req.user.id)
      // 2. General community broadcasts (targetRole = 'all')
      notifications = db.prepare(`
        SELECT n.id, n.userId, COALESCE(n.targetRole, 'user') AS targetRole, n.title, n.text, n.senderName, n.senderId, n.createdAt,
               CASE
                 WHEN n.userId = ? THEN n.read
                 ELSE CASE WHEN nr.notificationId IS NOT NULL THEN 1 ELSE 0 END
               END AS read
        FROM notifications n
        LEFT JOIN notification_reads nr
          ON n.id = nr.notificationId AND nr.userId = ?
        WHERE (n.userId = ? AND (n.targetRole = 'user' OR n.targetRole IS NULL))
           OR (n.targetRole = 'all')
        ORDER BY n.createdAt DESC
        LIMIT 60
      `).all(req.user.id, req.user.id, req.user.id);
    }

    res.json(notifications);
  } catch (error) {
    console.error('[Get Notifications Error]', error);
    res.status(500).json({ error: 'Error al consultar notificaciones.' });
  }
});

// GET /api/notifications/admin/broadcasts
router.get('/admin/broadcasts', authenticateToken, requireAdmin, (req, res) => {
  try {
    const broadcasts = db.prepare(`
      SELECT id, title, text, createdAt
      FROM notifications
      WHERE targetRole = 'all'
      ORDER BY createdAt DESC
      LIMIT 50
    `).all();
    res.json(broadcasts);
  } catch (error) {
    console.error('[Get Admin Broadcasts Error]', error);
    res.status(500).json({ error: 'Error al consultar alertas emitidas.' });
  }
});

// POST /api/notifications/broadcast
router.post('/broadcast', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, text } = req.body;
    if (!title || !text) {
      return res.status(400).json({ error: 'El título y el mensaje de la alerta son obligatorios.' });
    }

    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (NULL, 'all', ?, ?, 0, ?)
    `).run(title.trim(), text.trim(), now);

    res.status(201).json({
      message: 'Alerta comunitaria emitida a toda la comunidad.',
      alert: {
        id: Number(result.lastInsertRowid),
        title: title.trim(),
        text: text.trim(),
        createdAt: now
      }
    });
  } catch (error) {
    console.error('[Broadcast Alert Error]', error);
    res.status(500).json({ error: 'Error al emitir la alerta general.' });
  }
});

// POST /api/notifications/guard-to-admin
// Guard sends a direct notification/report to Administration. Audited in activity_logs!
router.post('/guard-to-admin', authenticateToken, requireAdminOrGuard, (req, res) => {
  try {
    const { title, text } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'El título del aviso a administración es obligatorio.' });
    }
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'El mensaje o detalle del aviso es obligatorio.' });
    }

    const cleanTitle = String(title).trim();
    const cleanText = String(text).trim();
    const now = new Date().toISOString();
    const guardName = `${req.user.nombre} ${req.user.apellido}`.trim();
    const senderName = `${guardName} (${req.user.role === 'guardia' ? 'Guardia' : 'Admin'})`;
    const guardIdentifier = `${senderName} (${req.user.username || req.user.email})`;

    const result = db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, senderId, senderName, createdAt)
      VALUES (NULL, 'admin', ?, ?, 0, ?, ?, ?)
    `).run(cleanTitle, cleanText, req.user.id, senderName, now);

    // Audit log
    logActivity(
      req.user.id,
      guardIdentifier,
      req.user.role,
      'NOTIFICACION_GUARDIA_ADMIN',
      `Notificación para Administración - Título: "${cleanTitle}" - Mensaje: "${cleanText}"`,
      req.ip || ''
    );

    res.status(201).json({
      message: 'Notificación enviada a la Administración con éxito.',
      notification: {
        id: Number(result.lastInsertRowid),
        title: cleanTitle,
        text: cleanText,
        senderName,
        createdAt: now
      }
    });
  } catch (error) {
    console.error('[Guard to Admin Notification Error]', error);
    res.status(500).json({ error: 'Error al enviar notificación a la administración.' });
  }
});

// POST /api/notifications/admin-to-guard
// Admin sends an instruction or notification to Guard. Audited in activity_logs!
router.post('/admin-to-guard', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, text } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'El título o asunto para la guardia es obligatorio.' });
    }
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'El mensaje o instrucción es obligatorio.' });
    }

    const cleanTitle = String(title).trim();
    const cleanText = String(text).trim();
    const now = new Date().toISOString();
    const senderName = `${req.user.nombre} ${req.user.apellido} (Administración)`;
    const adminIdentifier = `${senderName} (${req.user.username || req.user.email})`;

    const result = db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, senderId, senderName, createdAt)
      VALUES (NULL, 'guardia', ?, ?, 0, ?, ?, ?)
    `).run(cleanTitle, cleanText, req.user.id, senderName, now);

    // Audit log
    logActivity(
      req.user.id,
      adminIdentifier,
      'admin',
      'NOTIFICACION_ADMIN_GUARDIA',
      `Instrucción para Guardia - Título: "${cleanTitle}" - Detalle: "${cleanText}"`,
      req.ip || ''
    );

    res.status(201).json({
      message: 'Notificación enviada al personal de guardia con éxito.',
      notification: {
        id: Number(result.lastInsertRowid),
        title: cleanTitle,
        text: cleanText,
        senderName,
        createdAt: now
      }
    });
  } catch (error) {
    console.error('[Admin to Guard Notification Error]', error);
    res.status(500).json({ error: 'Error al enviar notificación a la guardia.' });
  }
});

// POST /api/notifications/admin/notify-residents
// Admin sends private notifications to one or several specific residents. Audited in activity_logs!
router.post('/admin/notify-residents', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { residentIds, title, text } = req.body;
    if (!residentIds || !Array.isArray(residentIds) || residentIds.length === 0) {
      return res.status(400).json({ error: 'Debes seleccionar al menos un vecino destinatario.' });
    }
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'El título o asunto de la notificación es obligatorio.' });
    }
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'El mensaje de la notificación es obligatorio.' });
    }

    const cleanTitle = String(title).trim();
    const cleanText = String(text).trim();
    const now = new Date().toISOString();
    const senderName = `${req.user.nombre} ${req.user.apellido} (Administración)`;
    const adminIdentifier = `${senderName} (${req.user.username || req.user.email})`;

    const insertStmt = db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, senderId, senderName, createdAt)
      VALUES (?, 'user', ?, ?, 0, ?, ?, ?)
    `);

    const selectUserStmt = db.prepare('SELECT id, nombre, apellido, lote, manzana FROM users WHERE id = ? AND approved = 1');

    let sentCount = 0;
    const recipientNames = [];

    for (const rawId of residentIds) {
      const uId = Number(rawId);
      if (!uId) continue;
      const user = selectUserStmt.get(uId);
      if (!user) continue;

      insertStmt.run(user.id, cleanTitle, cleanText, req.user.id, senderName, now);
      sentCount++;
      const loc = user.lote ? ` (L${user.lote})` : '';
      recipientNames.push(`${user.nombre} ${user.apellido}${loc}`);
    }

    if (sentCount === 0) {
      return res.status(400).json({ error: 'No se encontraron vecinos habilitados entre los seleccionados.' });
    }

    // Audit log
    logActivity(
      req.user.id,
      adminIdentifier,
      'admin',
      'NOTIFICACION_ADMIN_VECINOS_ESPECIFICOS',
      `Notificación enviada a ${sentCount} vecino(s): [${recipientNames.join(', ')}] - Título: "${cleanTitle}" - Mensaje: "${cleanText}"`,
      req.ip || ''
    );

    res.status(201).json({
      message: `Notificación enviada exitosamente a ${sentCount} vecino${sentCount === 1 ? '' : 's'}.`,
      sentCount,
      recipients: recipientNames
    });
  } catch (error) {
    console.error('[Admin Notify Specific Residents Error]', error);
    res.status(500).json({ error: 'Error al enviar notificaciones a los vecinos seleccionados.' });
  }
});

// DELETE /api/notifications/admin/:id
router.delete('/admin/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const alertId = Number(req.params.id);
    const alert = db.prepare('SELECT id, title FROM notifications WHERE id = ? AND targetRole = "all"').get(alertId);

    if (!alert) {
      return res.status(404).json({ error: 'Alerta no encontrada o no es un aviso general.' });
    }

    db.prepare('DELETE FROM notification_reads WHERE notificationId = ?').run(alertId);
    db.prepare('DELETE FROM notifications WHERE id = ?').run(alertId);

    res.json({ message: `Alerta "${alert.title}" eliminada de la comunidad.` });
  } catch (error) {
    console.error('[Delete Broadcast Alert Error]', error);
    res.status(500).json({ error: 'Error al eliminar alerta.' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticateToken, (req, res) => {
  try {
    const now = new Date().toISOString();
    const isAdmin = req.user.role === 'admin';

    // 1. Mark user's personal notifications as read
    db.prepare(`
      UPDATE notifications
      SET read = 1
      WHERE userId = ?
    `).run(req.user.id);

    // 2. Mark shared notifications as read for this specific user
    const isGuard = req.user.role === 'guardia';
    if (isAdmin) {
      db.prepare(`
        INSERT OR IGNORE INTO notification_reads (notificationId, userId, readAt)
        SELECT id, ?, ?
        FROM notifications
        WHERE targetRole IN ('all', 'admin')
      `).run(req.user.id, now);
    } else if (isGuard) {
      db.prepare(`
        INSERT OR IGNORE INTO notification_reads (notificationId, userId, readAt)
        SELECT id, ?, ?
        FROM notifications
        WHERE targetRole IN ('all', 'guardia')
      `).run(req.user.id, now);
    } else {
      db.prepare(`
        INSERT OR IGNORE INTO notification_reads (notificationId, userId, readAt)
        SELECT id, ?, ?
        FROM notifications
        WHERE targetRole = 'all'
      `).run(req.user.id, now);
    }

    res.json({ message: 'Todas las notificaciones fueron marcadas como leídas.' });
  } catch (error) {
    console.error('[Read All Notifications Error]', error);
    res.status(500).json({ error: 'Error al marcar notificaciones.' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticateToken, (req, res) => {
  try {
    const notifId = Number(req.params.id);
    const notif = db.prepare('SELECT id, userId, targetRole FROM notifications WHERE id = ?').get(notifId);

    if (!notif) {
      return res.status(404).json({ error: 'Notificación no encontrada.' });
    }

    const now = new Date().toISOString();
    const isAdmin = req.user.role === 'admin';
    const isGuard = req.user.role === 'guardia';

    if (notif.userId === req.user.id) {
      db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(notifId);
    } else if (
      notif.targetRole === 'all' ||
      (isAdmin && notif.targetRole === 'admin') ||
      (isGuard && notif.targetRole === 'guardia')
    ) {
      db.prepare(`
        INSERT OR IGNORE INTO notification_reads (notificationId, userId, readAt)
        VALUES (?, ?, ?)
      `).run(notifId, req.user.id, now);
    } else {
      return res.status(403).json({ error: 'No tenés permisos para esta notificación.' });
    }

    res.json({ message: 'Notificación marcada como leída.' });
  } catch (error) {
    console.error('[Read Notification Error]', error);
    res.status(500).json({ error: 'Error al marcar notificación.' });
  }
});

module.exports = router;
