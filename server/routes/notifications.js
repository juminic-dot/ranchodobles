const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware');

// GET /api/notifications
// Retrieves notifications filtered strictly by user role and ownership
router.get('/', authenticateToken, (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let notifications;

    if (isAdmin) {
      // Admin sees:
      // 1. Personal notifications for their own account
      // 2. Operational admin events (targetRole = 'admin')
      // 3. Community broadcasts (targetRole = 'all')
      notifications = db.prepare(`
        SELECT n.id, n.userId, COALESCE(n.targetRole, 'user') AS targetRole, n.title, n.text, n.createdAt,
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
        ORDER BY n.createdAt DESC
        LIMIT 60
      `).all(req.user.id, req.user.id, req.user.id);
    } else {
      // Resident sees strictly:
      // 1. Their own personal notifications (n.userId = req.user.id)
      // 2. General community broadcasts (targetRole = 'all')
      // ZERO leakage of any other neighbor's payments, bookings, visits, or admin notices!
      notifications = db.prepare(`
        SELECT n.id, n.userId, COALESCE(n.targetRole, 'user') AS targetRole, n.title, n.text, n.createdAt,
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
    if (isAdmin) {
      db.prepare(`
        INSERT OR IGNORE INTO notification_reads (notificationId, userId, readAt)
        SELECT id, ?, ?
        FROM notifications
        WHERE targetRole IN ('all', 'admin')
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

    if (notif.userId === req.user.id) {
      db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(notifId);
    } else if (notif.targetRole === 'all' || (isAdmin && notif.targetRole === 'admin')) {
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
