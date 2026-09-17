const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware');

// Apply auth and admin check to all admin routes
router.use(authenticateToken, requireAdmin);

// GET /api/admin/users
router.get('/users', (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT id, apellido, nombre, tipoDocumento, numeroDocumento, telefono, email, username, lote, manzana, role, approved, createdAt
      FROM users
    `;
    const conditions = [];
    const params = [];

    if (status === 'pending') {
      conditions.push('approved = 0');
    } else if (status === 'approved') {
      conditions.push('approved = 1');
    }

    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(nombre) LIKE ? OR
        LOWER(apellido) LIKE ? OR
        LOWER(email) LIKE ? OR
        numeroDocumento LIKE ? OR
        telefono LIKE ? OR
        LOWER(COALESCE(username, '')) LIKE ? OR
        LOWER(COALESCE(lote, '')) LIKE ? OR
        LOWER(COALESCE(manzana, '')) LIKE ?
      )`);
      params.push(s, s, s, s, s, s, s, s);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY approved ASC, role DESC, apellido ASC, nombre ASC';

    const users = db.prepare(query).all(...params);
    res.json(users);
  } catch (error) {
    console.error('[Admin Users Error]', error);
    res.status(500).json({ error: 'Error al consultar usuarios.' });
  }
});

// POST /api/admin/users (Admin user creation)
router.post('/users', async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      tipoDocumento = 'DNI',
      numeroDocumento,
      telefono,
      email,
      password,
      username,
      lote,
      manzana,
      role = 'user'
    } = req.body;

    if (!nombre || !apellido || !numeroDocumento || !telefono || !email || !password) {
      return res.status(400).json({ error: 'Nombre, apellido, documento, teléfono, email y contraseña son obligatorios.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const emailNormalized = email.trim().toLowerCase();
    const existingEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(emailNormalized);
    if (existingEmail) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese correo electrónico.' });
    }

    // Determine username if provided or derive from lote + manzana (e.g. L9M2)
    let userIdentifier = username ? username.trim() : '';
    if (!userIdentifier && lote && manzana) {
      const cleanL = lote.toString().replace(/\D/g, '') || lote.toString().trim();
      const cleanM = manzana.toString().replace(/\D/g, '') || manzana.toString().trim();
      userIdentifier = `L${cleanL}M${cleanM}`;
    }

    if (userIdentifier) {
      const existingUsername = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(userIdentifier.toLowerCase());
      if (existingUsername) {
        return res.status(400).json({ error: `El identificador de usuario '${userIdentifier}' ya está en uso.` });
      }
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password.trim(), saltRounds);
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (
        apellido, nombre, tipoDocumento, numeroDocumento, telefono, email, username, lote, manzana, passwordHash, role, approved, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const result = insertUser.run(
      apellido.trim(),
      nombre.trim(),
      tipoDocumento.trim(),
      numeroDocumento.trim(),
      telefono.trim(),
      emailNormalized,
      userIdentifier || null,
      lote ? lote.toString().trim() : null,
      manzana ? manzana.toString().trim() : null,
      passwordHash,
      role === 'admin' ? 'admin' : 'user',
      now
    );

    const newUserId = Number(result.lastInsertRowid);

    // Initial welcome notification
    db.prepare(`
      INSERT INTO notifications (userId, title, text, read, createdAt)
      VALUES (?, ?, ?, 0, ?)
    `).run(
      newUserId,
      '¡Bienvenido a Rancho Doble S!',
      'Tu cuenta de propietario ha sido creada por la administración. Podés acceder con tu usuario o email para gestionar expensas, visitas y reservas.',
      now
    );

    res.status(201).json({
      message: `Usuario ${nombre.trim()} ${apellido.trim()} creado y habilitado con éxito.`,
      user: {
        id: newUserId,
        apellido: apellido.trim(),
        nombre: nombre.trim(),
        email: emailNormalized,
        username: userIdentifier || null,
        lote: lote ? lote.toString().trim() : null,
        manzana: manzana ? manzana.toString().trim() : null,
        role: role === 'admin' ? 'admin' : 'user',
        approved: 1
      }
    });
  } catch (error) {
    console.error('[Admin Create User Error]', error);
    res.status(500).json({ error: 'Error interno al crear el usuario.' });
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
    db.prepare('DELETE FROM notification_reads WHERE userId = ?').run(targetUserId);
    db.prepare('DELETE FROM expenses WHERE userId = ?').run(targetUserId);
    db.prepare('DELETE FROM invites WHERE hostId = ?').run(targetUserId);
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
