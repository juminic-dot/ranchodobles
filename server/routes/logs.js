const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db');
const { authenticateToken } = require('../middleware');

// GET /api/activity-logs
router.get('/', authenticateToken, (req, res) => {
  try {
    const { userId, limit = 100 } = req.query;
    const isAdmin = req.user.role === 'admin';
    const isGuard = req.user.role === 'guardia';

    let query = `
      SELECT id, userId, userName, userRole, action, details, ip, createdAt
      FROM activity_logs
    `;
    const params = [];

    if (isAdmin) {
      if (userId) {
        query += ' WHERE userId = ?';
        params.push(userId);
      }
    } else {
      // Guard or resident sees their own activity logs
      query += ' WHERE userId = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(Math.min(Number(limit) || 100, 200));

    const logs = db.prepare(query).all(...params);
    res.json(logs);
  } catch (error) {
    console.error('[Get Activity Logs Error]', error);
    res.status(500).json({ error: 'Error al consultar registro de actividades.' });
  }
});

// POST /api/activity-logs
router.post('/', authenticateToken, (req, res) => {
  try {
    const { action, details } = req.body;
    if (!action) {
      return res.status(400).json({ error: 'La acción es requerida.' });
    }

    const userName = `${req.user.nombre} ${req.user.apellido} (${req.user.username || req.user.email})`;
    logActivity(
      req.user.id,
      userName,
      req.user.role,
      String(action).trim(),
      details ? String(details).trim() : '',
      req.ip || ''
    );

    res.status(201).json({ success: true, message: 'Actividad registrada.' });
  } catch (error) {
    console.error('[Post Activity Log Error]', error);
    res.status(500).json({ error: 'Error al registrar actividad.' });
  }
});

module.exports = router;
