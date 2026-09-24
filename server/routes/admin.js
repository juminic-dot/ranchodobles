const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db, logActivity } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware');
const { sendPasswordResetEmail } = require('../mailer');

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

    let emailNormalized = email.trim().toLowerCase();
    const isGuard = role === 'guardia';

    if (isGuard) {
      // Ensure email ends with @guardia
      if (!emailNormalized.includes('@')) {
        emailNormalized = `${emailNormalized}@guardia`;
      } else if (!emailNormalized.endsWith('@guardia')) {
        return res.status(400).json({ error: 'El usuario de guardia debe tener el formato @guardia (ej: jorgecabral@guardia).' });
      }
    }

    const existingEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(emailNormalized);
    if (existingEmail) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese correo o identificador.' });
    }

    // Determine username if provided or derive from lote + manzana (e.g. L9M2)
    let userIdentifier = username ? username.trim() : '';
    if (isGuard) {
      if (!userIdentifier) {
        userIdentifier = emailNormalized;
      } else if (!userIdentifier.toLowerCase().endsWith('@guardia')) {
        userIdentifier = `${userIdentifier}@guardia`;
      }
    } else if (!userIdentifier && lote && manzana) {
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
      role === 'admin' ? 'admin' : (role === 'guardia' ? 'guardia' : 'user'),
      now
    );

    const newUserId = Number(result.lastInsertRowid);

    // Initial welcome notification (personal)
    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(
      newUserId,
      isGuard ? 'guardia' : 'user',
      isGuard ? '¡Bienvenido a la Guardia!' : '¡Bienvenido a Rancho Doble S!',
      isGuard
        ? 'Tu cuenta de guardia ha sido creada por la administración. Podés acceder con tu usuario para control de acceso en garita.'
        : 'Tu cuenta de propietario ha sido creada por la administración. Podés acceder con tu usuario o email para gestionar expensas, visitas y reservas.',
      now
    );

    // Log admin activity
    logActivity(
      req.user.id,
      `${req.user.nombre} ${req.user.apellido} (${req.user.username || req.user.email})`,
      req.user.role,
      'CREATE_USER',
      `Creó usuario [${role}]: ${nombre.trim()} ${apellido.trim()} (${userIdentifier || emailNormalized})`,
      req.ip || ''
    );

    res.status(201).json({
      message: `Usuario ${nombre.trim()} ${apellido.trim()} (${userIdentifier || emailNormalized}) creado y habilitado con éxito.`,
      user: {
        id: newUserId,
        apellido: apellido.trim(),
        nombre: nombre.trim(),
        email: emailNormalized,
        username: userIdentifier || null,
        lote: lote ? lote.toString().trim() : null,
        manzana: manzana ? manzana.toString().trim() : null,
        role: role === 'admin' ? 'admin' : (role === 'guardia' ? 'guardia' : 'user'),
        approved: 1
      }
    });
  } catch (error) {
    console.error('[Admin Create User Error]', error);
    res.status(500).json({ error: 'Error interno al crear el usuario.' });
  }
});

// PUT /api/admin/users/:id (Admin edits neighbor details, NEVER password)
router.put('/users/:id', (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const {
      nombre,
      apellido,
      tipoDocumento,
      numeroDocumento,
      telefono,
      email,
      lote,
      manzana,
      role
    } = req.body;

    const existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
    if (!existingUser) {
      return res.status(404).json({ error: 'Vecino no encontrado.' });
    }

    if (!nombre || !apellido || !numeroDocumento || !telefono || !email) {
      return res.status(400).json({ error: 'Nombre, apellido, documento, teléfono y email son obligatorios.' });
    }

    const emailNormalized = email.trim().toLowerCase();
    const emailDuplicate = db.prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?').get(emailNormalized, targetUserId);
    if (emailDuplicate) {
      return res.status(400).json({ error: 'Ya existe otro vecino registrado con este correo electrónico.' });
    }

    const dniDuplicate = db.prepare('SELECT id FROM users WHERE numeroDocumento = ? AND id != ?').get(numeroDocumento.trim(), targetUserId);
    if (dniDuplicate) {
      return res.status(400).json({ error: 'Ya existe otro vecino registrado con este número de documento.' });
    }

    // Format username if lote and manzana provided
    const cleanLote = lote ? lote.toString().trim().replace(/\D/g, '') : '';
    const cleanManzana = manzana ? manzana.toString().trim().replace(/\D/g, '') : '';
    let newUsername = existingUser.username;

    if (cleanLote && cleanManzana) {
      newUsername = `L${cleanLote}M${cleanManzana}`;
      const usernameDuplicate = db.prepare('SELECT id FROM users WHERE LOWER(username) = ? AND id != ?').get(newUsername.toLowerCase(), targetUserId);
      if (usernameDuplicate) {
        return res.status(400).json({ error: `El identificador de usuario '${newUsername}' ya está en uso por otro lote.` });
      }
    }

    const newRole = (role === 'admin' || role === 'user' || role === 'guardia') ? role : existingUser.role;

    // Security guarantee: NEVER update or query password / passwordHash
    db.prepare(`
      UPDATE users
      SET nombre = ?,
          apellido = ?,
          tipoDocumento = ?,
          numeroDocumento = ?,
          telefono = ?,
          email = ?,
          lote = ?,
          manzana = ?,
          username = ?,
          role = ?
      WHERE id = ?
    `).run(
      nombre.trim(),
      apellido.trim(),
      tipoDocumento ? tipoDocumento.trim() : (existingUser.tipoDocumento || 'DNI'),
      numeroDocumento.trim(),
      telefono.trim(),
      emailNormalized,
      cleanLote || existingUser.lote,
      cleanManzana || existingUser.manzana,
      newUsername,
      newRole,
      targetUserId
    );

    const updatedUser = db.prepare(`
      SELECT id, apellido, nombre, tipoDocumento, numeroDocumento, telefono, email, username, lote, manzana, role, approved, createdAt
      FROM users WHERE id = ?
    `).get(targetUserId);

    res.json({
      message: `Datos del vecino ${updatedUser.nombre} ${updatedUser.apellido} (${updatedUser.username || ''}) actualizados correctamente.`,
      user: updatedUser
    });
  } catch (error) {
    console.error('[Admin Update Neighbor Error]', error);
    res.status(500).json({ error: 'Error al actualizar los datos del vecino.' });
  }
});

// PATCH /api/admin/users/:id/approve
router.patch('/users/:id/approve', (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { lote, manzana } = req.body || {};
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    let newLote = user.lote;
    let newManzana = user.manzana;
    let newUsername = user.username;

    if (lote && manzana) {
      const cleanL = lote.toString().trim().replace(/\D/g, '');
      const cleanM = manzana.toString().trim().replace(/\D/g, '');
      if (cleanL && cleanM) {
        newLote = cleanL;
        newManzana = cleanM;
        newUsername = `L${cleanL}M${cleanM}`;
        const dup = db.prepare('SELECT id FROM users WHERE LOWER(username) = ? AND id != ?').get(newUsername.toLowerCase(), userId);
        if (dup) {
          return res.status(400).json({ error: `El usuario '${newUsername}' ya está ocupado por otro lote.` });
        }
      }
    }

    db.prepare(`
      UPDATE users
      SET approved = 1,
          lote = ?,
          manzana = ?,
          username = ?
      WHERE id = ?
    `).run(newLote, newManzana, newUsername, userId);

    // Notify user (personal)
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (?, 'user', ?, ?, 0, ?)
    `).run(
      userId,
      '¡Cuenta aprobada!',
      `Tu cuenta ha sido aprobada por la administración. Tu usuario de acceso es ${newUsername || user.username}. Ya podés ingresar al portal.`,
      now
    );

    res.json({ message: `Usuario ${user.nombre} ${user.apellido} (${newUsername || user.username || ''}) aprobado con éxito.` });
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

    if (!['admin', 'user', 'guardia'].includes(role)) {
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

// POST /api/admin/users/:id/reset-token (Admin-assisted password reset link)
router.post('/users/:id/reset-token', async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const user = db.prepare(`
      SELECT id, nombre, apellido, email, username, approved
      FROM users WHERE id = ?
    `).get(targetUserId);

    if (!user) {
      return res.status(404).json({ error: 'Vecino no encontrado.' });
    }

    if (!user.email || !user.email.includes('@')) {
      return res.status(400).json({ error: 'El vecino no tiene un correo electrónico válido registrado para recibir el enlace.' });
    }

    // Invalidate any previous unused tokens
    db.prepare('UPDATE password_resets SET used = 1 WHERE userId = ? AND used = 0').run(targetUserId);

    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 60 minutes
    const nowISO = now.toISOString();

    db.prepare(`
      INSERT INTO password_resets (userId, token, expiresAt, used, createdAt)
      VALUES (?, ?, ?, 0, ?)
    `).run(targetUserId, token, expiresAt, nowISO);

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const forwardedPrefix = req.get('x-forwarded-prefix');
    let prefix = '';
    if (forwardedPrefix) {
      prefix = forwardedPrefix.replace(/\/$/, '');
    } else if (host.includes('gestechnoclient.com')) {
      prefix = '/ranchos';
    }
    const baseUrl = `${protocol}://${host}${prefix}`;
    const resetLink = `${baseUrl}/#restablecer-clave?token=${token}`;

    // Always send the reset email directly to the neighbor
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: `${user.nombre} ${user.apellido}`,
      resetLink,
      expiresMinutes: 60
    });
    const emailSent = Boolean(emailResult.sent);
    const emailError = emailResult.error || null;

    // Security & privacy requirement: NEVER return resetLink to the administrator.
    // The link is strictly personal to the resident and delivered only to their email inbox.
    res.json({
      success: true,
      emailSent,
      emailError,
      message: emailSent
        ? `Enlace de restablecimiento generado y enviado por correo a ${user.email}.`
        : `No se pudo entregar el correo a ${user.email}${emailError ? `: ${emailError}` : ''}. Verificá el servicio SMTP en el servidor.`,
      expiresAt,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    console.error('[Admin Generate Reset Token Error]', error);
    res.status(500).json({ error: 'Error al generar enlace de restablecimiento.' });
  }
});

module.exports = router;
