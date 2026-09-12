const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware');

// POST /api/auth/register
router.post('/register', (req, res) => {
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
    const passwordHash = bcrypt.hashSync(password.trim(), saltRounds);
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
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Por favor complete email y contraseña.' });
    }

    const input = email.trim().toLowerCase();
    // Allow login by email or document number
    const user = db.prepare(`
      SELECT * FROM users
      WHERE LOWER(email) = ? OR numeroDocumento = ?
    `).get(input, input);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const passwordMatch = bcrypt.compareSync(password.trim(), user.passwordHash);
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
        role: user.role,
        nombre: user.nombre,
        apellido: user.apellido
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
  res.json({ user: req.user });
});

module.exports = router;
