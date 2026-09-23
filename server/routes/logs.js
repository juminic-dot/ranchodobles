const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware');

// GET /api/activity-logs (Strictly Admin only: audit trail of all app activities)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { userId, role, action, search, limit = 200 } = req.query;

    let query = `
      SELECT id, userId, userName, userRole, action, details, ip, createdAt
      FROM activity_logs
    `;
    const conditions = [];
    const params = [];

    if (userId) {
      conditions.push('userId = ?');
      params.push(Number(userId));
    }

    if (role && role.trim() && role !== 'all') {
      conditions.push('userRole = ?');
      params.push(role.trim());
    }

    if (action && action.trim()) {
      conditions.push('action LIKE ?');
      params.push(`%${action.trim()}%`);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push('(userName LIKE ? OR action LIKE ? OR details LIKE ?)');
      params.push(term, term, term);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(Math.min(Number(limit) || 200, 500));

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
