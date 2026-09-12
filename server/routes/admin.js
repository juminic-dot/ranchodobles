const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware');

// Apply auth and admin check to all admin routes
router.use(authenticateToken, requireAdmin);

// GET /api/admin/users
router.get('/users', (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT id, apellido, nombre, tipoDocumento, numeroDocumento, telefono, email, role, approved, createdAt
      FROM users
    `;
    const params = [];

    if (status === 'pending') {
      query += ' WHERE approved = 0';
    } else if (status === 'approved') {
      query += ' WHERE approved = 1';
    }

    query += ' ORDER BY approved ASC, createdAt DESC';

    const users = db.prepare(query).all(...params);
    res.json(users);
  } catch (error) {
    console.error('[Admin Users Error]', error);
    res.status(500).json({ error: 'Error al consultar usuarios.' });
  }
});

// PATCH /api/admin/users/:id/approve
router.patch('/users/:id/approve', (req, res) => {
  try {
    const userId = Number(req.params.id);
    const user = db.prepare('SELECT id, nombre, apellido, email FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    db.prepare('UPDATE users SET approved = 1 WHERE id = ?').run(userId);

    // Notify user
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO notifications (userId, title, text, read, createdAt)
      VALUES (?, ?, ?, 0, ?)
    `).run(
      userId,
      '¡Cuenta aprobada!',
      'Tu cuenta ha sido aprobada por la administración. Ya podés utilizar todos los servicios del portal.',
      now
    );

    res.json({ message: `Usuario ${user.nombre} ${user.apellido} aprobado con éxito.` });
  } catch (error) {
    console.error('[Admin Approve Error]', error);
    res.status(500).json({ error: 'Error al aprobar usuario.' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'No podés eliminar tu propia cuenta de administrador.' });
    }

    const user = db.prepare('SELECT nombre, apellido FROM users WHERE id = ?').get(targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Delete dependent records
    db.prepare('DELETE FROM bookings WHERE userId = ?').run(targetUserId);
    db.prepare('DELETE FROM visits WHERE userId = ?').run(targetUserId);
    db.prepare('DELETE FROM notifications WHERE userId = ?').run(targetUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(targetUserId);

    res.json({ message: `Usuario ${user.nombre} ${user.apellido} eliminado.` });
  } catch (error) {
    console.error('[Admin Delete User Error]', error);
    res.status(500).json({ error: 'Error al eliminar usuario.' });
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Rol no válido.' });
    }

    if (targetUserId === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'No podés quitarte tu propio rol de administrador.' });
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetUserId);
    res.json({ message: `Rol actualizado a ${role}.` });
  } catch (error) {
    console.error('[Admin Update Role Error]', error);
    res.status(500).json({ error: 'Error al actualizar rol.' });
  }
});

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE approved = 1').get().count;
    const pendingUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE approved = 0').get().count;
    const todayVisits = db.prepare('SELECT COUNT(*) as count FROM visits WHERE date = ?').get(today).count;
    const todayBookings = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE date = ?').get(today).count;

    res.json({
      totalUsers,
      pendingUsers,
      todayVisits,
      todayBookings
    });
  } catch (error) {
    console.error('[Admin Stats Error]', error);
    res.status(500).json({ error: 'Error al obtener métricas.' });
  }
});

module.exports = router;
