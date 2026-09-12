const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware');

// GET /api/notifications
router.get('/', authenticateToken, (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT id, userId, title, text, read, createdAt
      FROM notifications
      WHERE userId = ? OR userId IS NULL
      ORDER BY createdAt DESC
      LIMIT 50
    `).all(req.user.id);

    res.json(notifications);
  } catch (error) {
    console.error('[Get Notifications Error]', error);
    res.status(500).json({ error: 'Error al consultar notificaciones.' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticateToken, (req, res) => {
  try {
    db.prepare(`
      UPDATE notifications
      SET read = 1
      WHERE userId = ? OR userId IS NULL
    `).run(req.user.id);

    res.json({ message: 'Todas las notificaciones fueron marcadas como leídas.' });
  } catch (error) {
    console.error('[Read All Notifications Error]', error);
    res.status(500).json({ error: 'Error al marcar notificaciones.' });
  }
});

module.exports = router;
