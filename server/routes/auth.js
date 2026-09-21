const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, logActivity } = require('../db');
const { JWT_SECRET, authenticateToken, loginLimiter, registerLimiter } = require('../middleware');
const { sendPasswordResetEmail } = require('../mailer');

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
      lote,
      manzana,
      password,
      confirmPassword
    } = req.body;

    if (!apellido || !nombre || !tipoDocumento || !numeroDocumento || !telefono || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    const cleanLote = String(lote || '').trim().replace(/\D/g, '') || String(lote || '').trim();
    const cleanManzana = String(manzana || '').trim().replace(/\D/g, '') || String(manzana || '').trim();
    if (!cleanLote || !cleanManzana) {
      return res.status(400).json({ error: 'Debes ingresar el número de lote y número de manzana.' });
    }

    const formattedUsername = `L${cleanLote}M${cleanManzana}`;

    if (email.toLowerCase().includes('@guardia') || formattedUsername.toLowerCase().includes('guardia')) {
      return res.status(403).json({ error: 'Las cuentas de guardia solo pueden ser creadas por la administración.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const emailNormalized = email.trim().toLowerCase();
    const existingEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(emailNormalized);
    if (existingEmail) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email registrado.' });
    }

    const existingUsername = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(formattedUsername.toLowerCase());
    if (existingUsername) {
      return res.status(400).json({ error: `Ya existe una cuenta registrada para el Lote ${cleanLote}, Manzana ${cleanManzana} (${formattedUsername}).` });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password.trim(), saltRounds);
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (
        apellido, nombre, tipoDocumento, numeroDocumento, telefono, email, username, lote, manzana, passwordHash, role, approved, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', 0, ?)
    `);

    const result = insertUser.run(
      apellido.trim(),
      nombre.trim(),
      tipoDocumento.trim(),
      numeroDocumento.trim(),
      telefono.trim(),
      emailNormalized,
      formattedUsername,
      cleanLote,
      cleanManzana,
      passwordHash,
      now
    );

    // Notify administrators of pending registration (Admin-only)
    const notifStmt = db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (NULL, 'admin', ?, ?, 0, ?)
    `);
    notifStmt.run(
      'Nueva solicitud de acceso',
      `${nombre} ${apellido} solicitó acceso para Lote ${cleanLote}, Manzana ${cleanManzana} (Usuario: ${formattedUsername}).`,
      now
    );

    res.status(201).json({
      message: 'Registro exitoso. La administración acreditará tu cuenta en breve.',
      username: formattedUsername,
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
      return res.status(400).json({ error: 'Por favor complete usuario y contraseña.' });
    }

    const input = email.trim();
    const inputLower = input.toLowerCase();

    // Find user by exact formatted username or email (case-insensitive)
    let user = db.prepare(`
      SELECT * FROM users
      WHERE LOWER(COALESCE(username, '')) = ?
         OR (LOWER(email) = ? AND (role = 'admin' OR role = 'guardia' OR email LIKE '%@guardia'))
    `).get(inputLower, inputLower);

    // If not found and input does not contain @, try matching guard username with @guardia
    if (!user && !inputLower.includes('@')) {
      user = db.prepare(`
        SELECT * FROM users
        WHERE (LOWER(COALESCE(username, '')) = ? OR LOWER(email) = ?) AND role = 'guardia'
      `).get(`${inputLower}@guardia`, `${inputLower}@guardia`);
    }

    if (!user) {
      // Check if a neighbor attempted to log in using their email or DNI
      const neighborByEmailOrDni = db.prepare(`
        SELECT username FROM users
        WHERE (LOWER(email) = ? OR numeroDocumento = ?) AND role != 'admin' AND role != 'guardia'
      `).get(inputLower, input);

      if (neighborByEmailOrDni && neighborByEmailOrDni.username) {
        return res.status(400).json({
          error: `Para ingresar a la app debes usar tu usuario asignado (${neighborByEmailOrDni.username}). No se permite ingresar con email o DNI.`
        });
      }

      return res.status(401).json({ error: 'Usuario no encontrado. Ingrese su usuario (ej: L2M9 o usuario@guardia).' });
    }

    const passwordMatch = await bcrypt.compare(password.trim(), user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    if (!user.approved) {
      return res.status(403).json({ error: 'Tu solicitud de acceso aún está pendiente de aprobación. La administración acreditará tu cuenta en breve.' });
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

    // Record login activity in audit logs
    const actionName = user.role === 'guardia' ? 'LOGIN_GUARDIA' : (user.role === 'admin' ? 'LOGIN_ADMIN' : 'LOGIN');
    const actionDetails = user.role === 'guardia' ? 'Inicio de turno en garita de control de guardia' : 'Inicio de sesión en el sistema';
    logActivity(
      user.id,
      `${user.nombre} ${user.apellido} (${user.username || user.email})`,
      user.role,
      actionName,
      actionDetails,
      req.ip || ''
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

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  try {
    const isGuard = req.user.role === 'guardia';
    const action = isGuard ? 'CAMBIO_GUARDIA' : 'LOGOUT';
    const details = isGuard ? 'Cierre de turno y cambio de guardia' : 'Cierre de sesión';
    logActivity(
      req.user.id,
      `${req.user.nombre} ${req.user.apellido} (${req.user.username || req.user.email})`,
      req.user.role,
      action,
      details,
      req.ip || ''
    );
    res.json({ message: 'Sesión finalizada correctamente.' });
  } catch (err) {
    res.json({ message: 'Sesión cerrada.' });
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

// Helper for email masking
function maskEmail(email) {
  if (!email || !email.includes('@')) return '';
  const [name, domain] = email.split('@');
  const maskedName = name.length <= 2 ? name[0] + '***' : name[0] + '***' + name[name.length - 1];
  return `${maskedName}@${domain}`;
}

// POST /api/auth/forgot-password
router.post('/forgot-password', loginLimiter, async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier || !String(identifier).trim()) {
      return res.status(400).json({ error: 'Ingresá tu usuario o correo electrónico.' });
    }

    const cleanInput = String(identifier).trim().toLowerCase();

    // Look for user by username or email
    const user = db.prepare(`
      SELECT id, nombre, apellido, email, username, approved
      FROM users
      WHERE LOWER(username) = ? OR LOWER(email) = ?
    `).get(cleanInput, cleanInput);

    // Generic friendly message to prevent email enumeration
    const genericResponse = {
      message: 'Si los datos corresponden a una cuenta registrada y activa, enviamos las instrucciones de recuperación a tu correo electrónico.'
    };

    if (!user || !user.approved) {
      return res.json(genericResponse);
    }

    // Invalidate any previous unused tokens for this user
    db.prepare('UPDATE password_resets SET used = 1 WHERE userId = ? AND used = 0').run(user.id);

    // Generate secure 32-byte hex token
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 60 minutes
    const nowISO = now.toISOString();

    db.prepare(`
      INSERT INTO password_resets (userId, token, expiresAt, used, createdAt)
      VALUES (?, ?, ?, 0, ?)
    `).run(user.id, token, expiresAt, nowISO);

    // Construct reset link
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    const resetLink = `${baseUrl}/#restablecer-clave?token=${token}`;

    // Send email (via SMTP or dev simulation)
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: `${user.nombre} ${user.apellido}`,
      resetLink,
      expiresMinutes: 60
    });

    res.json({
      message: 'Enlace de recuperación generado y enviado con éxito.',
      maskedEmail: maskEmail(user.email),
      username: user.username,
      resetLink: process.env.NODE_ENV !== 'production' ? resetLink : undefined,
      simulated: emailResult.mode === 'simulated'
    });
  } catch (error) {
    console.error('[Forgot Password Error]', error);
    res.status(500).json({ error: 'Error interno al procesar la recuperación de contraseña.' });
  }
});

// POST /api/auth/verify-reset-token
router.post('/verify-reset-token', (req, res) => {
  try {
    const { token } = req.body;
    if (!token || !String(token).trim()) {
      return res.status(400).json({ error: 'Token no proporcionado.' });
    }

    const record = db.prepare(`
      SELECT pr.*, u.username, u.nombre, u.apellido
      FROM password_resets pr
      JOIN users u ON u.id = pr.userId
      WHERE pr.token = ?
    `).get(String(token).trim());

    if (!record || record.used === 1 || new Date(record.expiresAt) <= new Date()) {
      return res.status(400).json({ error: 'El enlace de recuperación es inválido, ya fue utilizado o ha expirado.' });
    }

    res.json({
      valid: true,
      username: record.username,
      nombre: record.nombre,
      apellido: record.apellido
    });
  } catch (error) {
    console.error('[Verify Token Error]', error);
    res.status(500).json({ error: 'Error interno al verificar el enlace.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', loginLimiter, async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Completá todos los campos requeridos.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const record = db.prepare(`
      SELECT pr.*, u.id as targetUserId, u.username, u.nombre, u.apellido
      FROM password_resets pr
      JOIN users u ON u.id = pr.userId
      WHERE pr.token = ?
    `).get(String(token).trim());

    if (!record || record.used === 1 || new Date(record.expiresAt) <= new Date()) {
      return res.status(400).json({ error: 'El enlace de recuperación es inválido, ya fue utilizado o ha expirado.' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword.trim(), saltRounds);

    // Update user password and mark token as used
    db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(passwordHash, record.targetUserId);
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(record.id);

    // Register security notification
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO notifications (userId, title, text, read, createdAt)
      VALUES (?, ?, ?, 0, ?)
    `).run(
      record.targetUserId,
      'Contraseña restablecida',
      'Tu contraseña ha sido restablecida exitosamente mediante el enlace seguro.',
      now
    );

    res.json({
      message: '¡Tu contraseña ha sido restablecida con éxito! Ya podés iniciar sesión.',
      username: record.username
    });
  } catch (error) {
    console.error('[Reset Password Error]', error);
    res.status(500).json({ error: 'Error interno al restablecer la contraseña.' });
  }
});

module.exports = router;

