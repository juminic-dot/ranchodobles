const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticateToken, loginLimiter, registerLimiter } = require('../middleware');

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const {
      apellido,
      nombre,
      tipoDocumento,
      numeroDocumento,
      telefono,
      email,
      password,
      confirmPassword
    } = req.body;

    if (!apellido || !nombre || !tipoDocumento || !numeroDocumento || !telefono || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const emailNormalized = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailNormalized);
    if (existing) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email registrado.' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password.trim(), saltRounds);
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (apellido, nombre, tipoDocumento, numeroDocumento, telefono, email, passwordHash, role, approved, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'user', 0, ?)
    `);

    const result = insertUser.run(
      apellido.trim(),
      nombre.trim(),
      tipoDocumento.trim(),
      numeroDocumento.trim(),
      telefono.trim(),
      emailNormalized,
      passwordHash,
      now
    );

    // Notify administrators of pending registration
    const notifStmt = db.prepare(`
      INSERT INTO notifications (userId, title, text, read, createdAt)
      VALUES (?, ?, ?, 0, ?)
    `);
    notifStmt.run(
      null, // general admin notification
      'Nueva solicitud de acceso',
      `${nombre} ${apellido} (${emailNormalized}) solicitó acceso al portal.`,
      now
    );

    res.status(201).json({
      message: 'Solicitud de acceso enviada correctamente. Será revisada por la administración.',
      userId: Number(result.lastInsertRowid)
    });
  } catch (error) {
    console.error('[Register Error]', error);
    res.status(500).json({ error: 'Error interno al procesar el registro.' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Por favor complete email y contraseña.' });
    }

    const input = email.trim();
    const inputLower = input.toLowerCase();
    // Allow login by email, username, or document number
    const user = db.prepare(`
      SELECT * FROM users
      WHERE LOWER(email) = ? OR LOWER(COALESCE(username, '')) = ? OR numeroDocumento = ?
    `).get(inputLower, inputLower, input);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const passwordMatch = await bcrypt.compare(password.trim(), user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    if (!user.approved) {
      return res.status(403).json({ error: 'Tu solicitud de acceso aún está pendiente de aprobación por la administración.' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        nombre: user.nombre,
        apellido: user.apellido,
        lote: user.lote,
        manzana: user.manzana
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Inicio de sesión exitoso.',
      token,
      user: {
        id: user.id,
        apellido: user.apellido,
        nombre: user.nombre,
        username: user.username,
        lote: user.lote,
        manzana: user.manzana,
        tipoDocumento: user.tipoDocumento,
        numeroDocumento: user.numeroDocumento,
        telefono: user.telefono,
        email: user.email,
        role: user.role,
        approved: user.approved
      }
    });
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({ error: 'Error interno al procesar el ingreso.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare(`
    SELECT id, apellido, nombre, username, lote, manzana, tipoDocumento, numeroDocumento, telefono, email, role, approved, createdAt
    FROM users WHERE id = ?
  `).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({ user });
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { nombre, apellido, telefono, email } = req.body;

    if (!nombre || !apellido || !telefono || !email) {
      return res.status(400).json({ error: 'Nombre, apellido, teléfono y email son obligatorios.' });
    }

    const emailNormalized = email.trim().toLowerCase();

    // Check email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
      return res.status(400).json({ error: 'El formato de correo electrónico no es válido.' });
    }

    // Check if email already used by another user
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?').get(emailNormalized, req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'Ya existe otro vecino registrado con este correo electrónico.' });
    }

    db.prepare(`
      UPDATE users
      SET nombre = ?, apellido = ?, telefono = ?, email = ?
      WHERE id = ?
    `).run(
      nombre.trim(),
      apellido.trim(),
      telefono.trim(),
      emailNormalized,
      req.user.id
    );

    const updatedUser = db.prepare(`
      SELECT id, apellido, nombre, username, lote, manzana, tipoDocumento, numeroDocumento, telefono, email, role, approved, createdAt
      FROM users WHERE id = ?
    `).get(req.user.id);

    res.json({
      message: 'Datos de contacto actualizados correctamente.',
      user: updatedUser
    });
  } catch (error) {
    console.error('[Update Profile Error]', error);
    res.status(500).json({ error: 'Error interno al actualizar datos del perfil.' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ error: 'Todos los campos de contraseña son obligatorios.' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: 'La nueva contraseña y su confirmación no coinciden.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const user = db.prepare('SELECT id, passwordHash FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const match = await bcrypt.compare(currentPassword.trim(), user.passwordHash);
    if (!match) {
      return res.status(400).json({ error: 'La contraseña actual ingresada es incorrecta.' });
    }

    const saltRounds = 10;
    const newHash = await bcrypt.hash(newPassword.trim(), saltRounds);

    db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(newHash, req.user.id);

    // Register security notification
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO notifications (userId, title, text, read, createdAt)
      VALUES (?, ?, ?, 0, ?)
    `).run(
      req.user.id,
      'Seguridad de la cuenta',
      'Tu contraseña de acceso fue actualizada correctamente desde tu panel.',
      now
    );

    res.json({ message: 'Contraseña actualizada con éxito.' });
  } catch (error) {
    console.error('[Change Password Error]', error);
    res.status(500).json({ error: 'Error interno al cambiar la contraseña.' });
  }
});

module.exports = router;

