const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db, logActivity, getSetting, setSetting } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware');
const { sendPasswordResetEmail, sendGenericEmail, sendTestEmail, getMailerStatus } = require('../mailer');
const {
  getWhatsAppCredentials,
  getWhatsAppStatus,
  sendTestWhatsAppMessage,
  normalizeWhatsAppNumber
} = require('../whatsapp');
const {
  connectBaileys,
  disconnectBaileys,
  getBaileysStatus
} = require('../baileys');
const { notify } = require('../notifier');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

    // Initial welcome notification (personal & WhatsApp if user)
    const adminSender = `${req.user.nombre} ${req.user.apellido} (Administración)`;
    notify({
      userId: newUserId,
      targetRole: isGuard ? 'guardia' : 'user',
      title: isGuard ? '¡Bienvenido a la Guardia!' : '¡Bienvenido a Rancho Doble S!',
      text: isGuard
        ? 'Tu cuenta de guardia ha sido creada por la administración. Podés acceder con tu usuario para control de acceso en garita.'
        : 'Tu cuenta de propietario ha sido creada por la administración. Podés acceder con tu usuario o email para gestionar expensas, visitas y reservas.',
      senderId: req.user.id,
      senderName: adminSender
    }).catch(e => console.error('[Admin Create User Notify Error]', e));

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

    // Notify user (personal in-app and WhatsApp)
    const adminSender = `${req.user.nombre} ${req.user.apellido} (Administración)`;
    notify({
      userId,
      targetRole: 'user',
      title: '✅ ¡Cuenta aprobada!',
      text: `Tu cuenta ha sido aprobada por la administración. Tu usuario de acceso es "${newUsername || user.username}". Ya podés ingresar al portal de Rancho Doble S.`,
      senderId: req.user.id,
      senderName: adminSender
    }).catch(e => console.error('[Admin Approve User Notify Error]', e));

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

// GET /api/admin/settings (Get email and WhatsApp configuration)
router.get('/settings', (req, res) => {
  try {
    const mailerStatus = getMailerStatus();
    const waStatus = getWhatsAppStatus();
    const waCreds = getWhatsAppCredentials();

    const emailProvider = getSetting('email_provider') || (mailerStatus.configured ? mailerStatus.type : 'none');
    const gmailUser = getSetting('gmail_user') || process.env.GMAIL_USER || '';
    const hasGmailPass = Boolean(getSetting('gmail_app_pass') || process.env.GMAIL_APP_PASS);

    const smtpHost = getSetting('smtp_host') || process.env.SMTP_HOST || '';
    const smtpPort = getSetting('smtp_port') || process.env.SMTP_PORT || '587';
    const smtpSecure = getSetting('smtp_secure') !== null ? (getSetting('smtp_secure') === 'true') : (process.env.SMTP_SECURE === 'true');
    const smtpUser = getSetting('smtp_user') || process.env.SMTP_USER || '';
    const hasSmtpPass = Boolean(getSetting('smtp_pass') || process.env.SMTP_PASS);
    const smtpFrom = getSetting('smtp_from') || process.env.SMTP_FROM || '';

    res.json({
      email: {
        provider: emailProvider,
        configured: mailerStatus.configured,
        activeType: mailerStatus.type,
        activeFrom: mailerStatus.from,
        gmailUser,
        hasGmailPass,
        smtpHost,
        smtpPort: Number(smtpPort) || 587,
        smtpSecure,
        smtpUser,
        hasSmtpPass,
        smtpFrom
      },
      whatsapp: {
        phone: waCreds.officialPhone,
        normalizedPhone: normalizeWhatsAppNumber(waCreds.officialPhone),
        provider: waCreds.provider,
        configured: waCreds.configured,
        baileys: waStatus.baileys,
        hasToken: Boolean(waCreds.meta.token),
        phoneId: waCreds.meta.phoneId || '',
        apiUrl: waCreds.evolution.url || '',
        hasApiKey: Boolean(waCreds.evolution.key),
        instance: waCreds.evolution.instance || 'ranchodobles',
        twilioSid: waCreds.twilio.sid || '',
        hasTwilioToken: Boolean(waCreds.twilio.token),
        twilioPhone: waCreds.twilio.phone || '',
        qrCaption: waCreds.qrCaption
      }
    });
  } catch (error) {
    console.error('[Admin Get Settings Error]', error);
    res.status(500).json({ error: 'Error al consultar configuraciones.' });
  }
});

// PUT /api/admin/settings (Update email and/or WhatsApp settings)
router.put('/settings', (req, res) => {
  try {
    const { email, whatsapp } = req.body;
    const adminIdentifier = `${req.user.nombre} ${req.user.apellido} (${req.user.username || req.user.email})`;

    if (email) {
      if (email.provider !== undefined) setSetting('email_provider', email.provider);
      if (email.gmailUser !== undefined) setSetting('gmail_user', email.gmailUser.trim());
      if (email.gmailPass && email.gmailPass !== '••••••••') {
        setSetting('gmail_app_pass', email.gmailPass.trim().replace(/\s+/g, ''));
      }
      if (email.smtpHost !== undefined) setSetting('smtp_host', email.smtpHost.trim());
      if (email.smtpPort !== undefined) setSetting('smtp_port', String(email.smtpPort));
      if (email.smtpSecure !== undefined) setSetting('smtp_secure', String(email.smtpSecure));
      if (email.smtpUser !== undefined) setSetting('smtp_user', email.smtpUser.trim());
      if (email.smtpPass && email.smtpPass !== '••••••••') {
        setSetting('smtp_pass', email.smtpPass.trim());
      }
      if (email.smtpFrom !== undefined) setSetting('smtp_from', email.smtpFrom.trim());
    }

    if (whatsapp) {
      if (whatsapp.phone !== undefined) {
        setSetting('whatsapp_phone', whatsapp.phone.trim());
      }
      if (whatsapp.provider !== undefined) {
        setSetting('whatsapp_provider', whatsapp.provider);
      }
      if (whatsapp.token && whatsapp.token !== '••••••••') {
        setSetting('whatsapp_token', whatsapp.token.trim());
      }
      if (whatsapp.phoneId !== undefined) {
        setSetting('whatsapp_phone_id', whatsapp.phoneId.trim());
      }
      if (whatsapp.apiUrl !== undefined) {
        setSetting('whatsapp_api_url', whatsapp.apiUrl.trim());
      }
      if (whatsapp.apiKey && whatsapp.apiKey !== '••••••••') {
        setSetting('whatsapp_api_key', whatsapp.apiKey.trim());
      }
      if (whatsapp.instance !== undefined) {
        setSetting('whatsapp_instance', whatsapp.instance.trim());
      }
      if (whatsapp.twilioSid !== undefined) {
        setSetting('twilio_sid', whatsapp.twilioSid.trim());
      }
      if (whatsapp.twilioToken && whatsapp.twilioToken !== '••••••••') {
        setSetting('twilio_token', whatsapp.twilioToken.trim());
      }
      if (whatsapp.twilioPhone !== undefined) {
        setSetting('twilio_phone', whatsapp.twilioPhone.trim());
      }
      if (whatsapp.qrCaption !== undefined) {
        setSetting('whatsapp_qr_caption', whatsapp.qrCaption.trim());
      }
    }

    logActivity(
      req.user.id,
      adminIdentifier,
      'admin',
      'SETTINGS_UPDATE',
      'Actualizó la configuración avanzada de Email y WhatsApp',
      req.ip || ''
    );

    const mailerStatus = getMailerStatus();
    const waStatus = getWhatsAppStatus();

    res.json({
      message: 'Configuración guardada exitosamente.',
      mailerStatus,
      whatsappStatus: waStatus
    });
  } catch (error) {
    console.error('[Admin Update Settings Error]', error);
    res.status(500).json({ error: 'Error al guardar la configuración.' });
  }
});

// POST /api/admin/settings/test-email (Send a test email)
router.post('/settings/test-email', async (req, res) => {
  try {
    const targetEmail = (req.body.to || req.user.email || '').trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({ error: 'Ingresá una dirección de correo válida para la prueba.' });
    }

    const result = await sendTestEmail({ to: targetEmail });
    if (result.sent) {
      res.json({
        success: true,
        message: `Correo de prueba enviado con éxito a ${targetEmail} vía ${result.mode.toUpperCase()}.`,
        result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'No se pudo enviar el correo de prueba. Verificá los datos ingresados.'
      });
    }
  } catch (error) {
    console.error('[Admin Test Email Error]', error);
    res.status(500).json({ error: error.message || 'Error al ejecutar prueba de correo.' });
  }
});

// POST /api/admin/settings/test-whatsapp (Send a test WhatsApp message)
router.post('/settings/test-whatsapp', async (req, res) => {
  try {
    const { phone, message } = req.body;
    const result = await sendTestWhatsAppMessage({ phone, message });
    if (result.success) {
      res.json({
        success: true,
        message: result.simulated
          ? `Mensaje de prueba registrado en modo simulado para +${result.phone}.`
          : `Mensaje de prueba de WhatsApp enviado con éxito a +${result.phone} vía ${result.provider || 'WhatsApp'}.`,
        result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Error al enviar mensaje de prueba por WhatsApp.'
      });
    }
  } catch (error) {
    console.error('[Admin Test WhatsApp Error]', error);
    res.status(500).json({ error: error.message || 'Error al ejecutar prueba de WhatsApp.' });
  }
});

// GET /api/admin/whatsapp/baileys/status
router.get('/whatsapp/baileys/status', (req, res) => {
  try {
    const status = getBaileysStatus();
    res.json(status);
  } catch (error) {
    console.error('[Admin Baileys Status Error]', error);
    res.status(500).json({ error: 'Error al consultar estado de WhatsApp Baileys.' });
  }
});

// POST /api/admin/whatsapp/baileys/connect
router.post('/whatsapp/baileys/connect', async (req, res) => {
  try {
    const result = await connectBaileys();
    res.json(result);
  } catch (error) {
    console.error('[Admin Baileys Connect Error]', error);
    res.status(500).json({ error: error.message || 'Error al iniciar conexión de Baileys.' });
  }
});

// POST /api/admin/whatsapp/baileys/disconnect
router.post('/whatsapp/baileys/disconnect', async (req, res) => {
  try {
    const result = await disconnectBaileys();
    res.json(result);
  } catch (error) {
    console.error('[Admin Baileys Disconnect Error]', error);
    res.status(500).json({ error: error.message || 'Error al desconectar WhatsApp Baileys.' });
  }
});

// POST /api/admin/send-email (Direct email dispatch to owners)
router.post('/send-email', async (req, res) => {
  try {
    const { recipientType = 'all', residentIds, subject, message } = req.body;

    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ error: 'El asunto del correo es obligatorio.' });
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'El contenido o mensaje del correo es obligatorio.' });
    }

    const mailerStatus = getMailerStatus();
    if (!mailerStatus.configured) {
      return res.status(400).json({
        error: 'El servicio de correo no está configurado. Antes de enviar emails a propietarios, configurá y guardá tu cuenta en Configuración Avanzada.'
      });
    }

    let recipients = [];
    if (recipientType === 'selected') {
      if (!residentIds || !Array.isArray(residentIds) || residentIds.length === 0) {
        return res.status(400).json({ error: 'Debes seleccionar al menos un propietario destinatario.' });
      }
      const placeholders = residentIds.map(() => '?').join(',');
      recipients = db.prepare(`
        SELECT id, nombre, apellido, email, lote, manzana
        FROM users
        WHERE approved = 1 AND id IN (${placeholders}) AND email IS NOT NULL AND email LIKE '%@%'
      `).all(...residentIds);
    } else {
      // All active owners
      recipients = db.prepare(`
        SELECT id, nombre, apellido, email, lote, manzana
        FROM users
        WHERE approved = 1 AND role = 'user' AND email IS NOT NULL AND email LIKE '%@%'
      `).all();
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No se encontraron propietarios habilitados con correo electrónico válido.' });
    }

    const cleanSubject = String(subject).trim();
    const cleanMessage = String(message).trim();
    const adminSenderName = `${req.user.nombre} ${req.user.apellido} (Administración)`;

    let sentCount = 0;
    let failedCount = 0;
    const sentDetails = [];

    for (const rec of recipients) {
      const greeting = `Hola ${rec.nombre} ${rec.apellido}${rec.lote ? ` (Lote ${rec.lote})` : ''},`;
      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1512; color: #e2e8f0; margin: 0; padding: 24px; border-radius: 12px; max-width: 540px; margin: 0 auto; border: 1px solid rgba(247, 199, 109, 0.3);">
          <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 18px; margin-bottom: 22px;">
            <div style="font-size: 22px; font-weight: 700; color: #f7c76d;">🏡 Rancho Doble S</div>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Comunicado Oficial de Administración</div>
          </div>
          <div style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
            <p style="margin-top: 0;">${greeting}</p>
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 16px; margin: 16px 0; color: #e2e8f0; white-space: pre-wrap;">${escapeHtml(cleanMessage)}</div>
            <p style="font-size: 13px; color: #94a3b8; margin-bottom: 0;">
              Ante cualquier consulta, podés contactarte con la Administración o a través del Portal Vecinal.
            </p>
          </div>
          <div style="margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; text-align: center; font-size: 12px; color: #64748b;">
            Consorcio Rancho Doble S • Portal de Propietarios
          </div>
        </div>
      `;
      const textBody = `${greeting}\n\n${cleanMessage}\n\nAtentamente,\nAdministración Rancho Doble S`;

      const sendRes = await sendGenericEmail({
        to: rec.email,
        subject: `Rancho Doble S — ${cleanSubject}`,
        html: htmlBody,
        text: textBody,
        fromName: 'Administración Rancho Doble S'
      });

      if (sendRes.sent) {
        sentCount++;
        sentDetails.push(`${rec.nombre} ${rec.apellido} (${rec.email})`);
      } else {
        failedCount++;
      }
    }

    logActivity(
      req.user.id,
      `${req.user.nombre} ${req.user.apellido} (${req.user.username || req.user.email})`,
      'admin',
      'SEND_ADMIN_EMAIL',
      `Envió comunicado por email a ${sentCount} propietario(s) (fallidos: ${failedCount}) - Asunto: "${cleanSubject}"`,
      req.ip || ''
    );

    res.json({
      success: true,
      message: `Correo enviado exitosamente a ${sentCount} propietario${sentCount === 1 ? '' : 's'}${failedCount > 0 ? ` (${failedCount} con error)` : ''}.`,
      sentCount,
      failedCount,
      recipients: sentDetails
    });
  } catch (error) {
    console.error('[Admin Send Email Error]', error);
    res.status(500).json({ error: 'Error al enviar correos a propietarios.' });
  }
});

module.exports = router;

