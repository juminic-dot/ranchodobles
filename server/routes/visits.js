const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const os = require('os');
const { db, logActivity } = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware');
const { sendWhatsAppQrPass, sendWhatsAppTextMessage } = require('../whatsapp');

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// GET /api/visits/invite-token
// Authenticated endpoint: allows a resident to generate a short, clean, secure invitation code (valid for 48 hours)
router.get('/invite-token', authenticateToken, (req, res) => {
  try {
    if (req.user.role === 'admin' || (req.user.username && req.user.username.toLowerCase() === 'superadmin')) {
      return res.status(403).json({ error: 'El Administrador General no tiene permisos para generar invitaciones o visitas particulares.' });
    }
    const hostFullName = `${req.user.nombre} ${req.user.apellido}`.trim();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    // 8-character unique hexadecimal code, e.g. "8F2B1A04"
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();

    db.prepare(`
      INSERT INTO invites (code, hostId, hostName, expiresAt, used, createdAt)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(code, req.user.id, hostFullName, expiresAt, now.toISOString());

    const hostHeader = req.get('host') || 'localhost:3000';
    const isLocal = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1');
    const localIp = getLocalIp();
    const port = process.env.PORT || 3000;
    const resolvedHost = isLocal ? `${localIp}:${port}` : hostHeader;
    const protocol = req.protocol || 'http';

    res.json({
      code,
      expiresInHours: 48,
      baseUrl: `${protocol}://${resolvedHost}`
    });
  } catch (error) {
    console.error('[Create Invite Code Error]', error);
    res.status(500).json({ error: 'Error al generar código de invitación.' });
  }
});

// GET /api/visits/verify-invite?code=... OR ?c=... OR ?token=...
// Public endpoint: validates that an invitation link is authentic, unexpired, and belongs to an active resident
router.get('/verify-invite', (req, res) => {
  try {
    const code = req.query.code || req.query.c;
    const token = req.query.token;

    let hostId = null;

    if (code) {
      const cleanCode = String(code).trim().toUpperCase();
      const invite = db.prepare('SELECT * FROM invites WHERE code = ?').get(cleanCode);
      if (!invite) {
        return res.status(400).json({ valid: false, error: 'El código o enlace de invitación no es válido o no existe.' });
      }

      if (invite.used) {
        return res.status(400).json({
          valid: false,
          used: true,
          error: 'Este enlace de invitación ya ha sido utilizado para acreditar una visita y ha quedado deshabilitado.'
        });
      }

      if (new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ valid: false, error: 'La invitación ha expirado (validez máxima de 48 horas).' });
      }

      hostId = invite.hostId;
    } else if (token) {
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(400).json({ valid: false, error: 'La invitación ha expirado o no es válida.' });
      }

      if (decoded.type !== 'guest-invite' || !decoded.hostId) {
        return res.status(400).json({ valid: false, error: 'Tipo de invitación no válido.' });
      }
      hostId = decoded.hostId;
    } else {
      return res.status(400).json({ valid: false, error: 'Código o enlace de invitación no proporcionado.' });
    }

    const host = db.prepare('SELECT id, nombre, apellido, approved FROM users WHERE id = ?').get(hostId);
    if (!host || !host.approved) {
      return res.status(404).json({ valid: false, error: 'El anfitrión no fue encontrado o su cuenta está inactiva.' });
    }

    res.json({
      valid: true,
      hostId: host.id,
      hostName: `${host.nombre} ${host.apellido}`.trim()
    });
  } catch (error) {
    console.error('[Verify Invite Error]', error);
    res.status(500).json({ valid: false, error: 'Error al verificar la invitación.' });
  }
});

// GET /api/visits/:id/qr OR /api/visits/:id/qr.png
// Public endpoint to view / serve the QR code image for a registered visit
router.get(['/:id/qr', '/:id/qr.png'], (req, res) => {
  try {
    const visitId = Number(req.params.id);
    if (!visitId) {
      return res.status(400).send('ID de visita no válido.');
    }

    const visit = db.prepare('SELECT id, qrCode, visitorName FROM visits WHERE id = ?').get(visitId);
    if (!visit || !visit.qrCode) {
      return res.status(404).send('Código QR no encontrado.');
    }

    const matches = visit.qrCode.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(500).send('Formato de imagen QR no válido.');
    }

    const mimeType = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Disposition', `inline; filename="qr-visita-${visitId}.png"`);
    res.send(imageBuffer);
  } catch (error) {
    console.error('[Get QR Image Error]', error);
    res.status(500).send('Error al obtener imagen del código QR.');
  }
});

// POST /api/visits/guest-register
// Public endpoint for guest self-registration: REQUIRES a valid invitation code or token
router.post('/guest-register', async (req, res) => {
  try {
    const { code, c, token, apellido, nombre, dni, vehiclePlate, guestEmail, visitorPhone, guestPhone, phone, date, time } = req.body;
    const inviteCode = code || c;
    const cleanPhone = visitorPhone || guestPhone || phone ? String(visitorPhone || guestPhone || phone).trim() : null;

    let hostId = null;

    if (inviteCode) {
      const cleanCode = String(inviteCode).trim().toUpperCase();
      const invite = db.prepare('SELECT * FROM invites WHERE code = ?').get(cleanCode);
      if (!invite) {
        return res.status(401).json({ error: 'El código de invitación no es válido.' });
      }

      if (invite.used) {
        return res.status(401).json({ error: 'Este enlace de invitación ya ha sido utilizado para acreditar una visita y ha quedado deshabilitado.' });
      }

      if (new Date(invite.expiresAt) < new Date()) {
        return res.status(401).json({ error: 'El enlace de invitación ha superado el tiempo de validez de 48 horas.' });
      }

      hostId = invite.hostId;
    } else if (token) {
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ error: 'El enlace de invitación ha expirado o es inválido.' });
      }

      if (decoded.type !== 'guest-invite' || !decoded.hostId) {
        return res.status(400).json({ error: 'Credencial de invitación no válida.' });
      }

      hostId = decoded.hostId;
    } else {
      return res.status(401).json({ error: 'Invitación no válida. Solicitá al residente que te reenvíe el enlace oficial.' });
    }

    // Always fetch the host from database to ensure up-to-date active resident status
    const host = db.prepare('SELECT id, nombre, apellido, approved FROM users WHERE id = ?').get(hostId);
    if (!host || !host.approved) {
      return res.status(403).json({ error: 'El residente que emitió la invitación ya no se encuentra habilitado.' });
    }

    if (!apellido || !nombre || !dni) {
      return res.status(400).json({ error: 'Apellido, nombre y DNI son obligatorios.' });
    }

    const now = new Date().toISOString();
    const hostFullName = `${host.nombre} ${host.apellido}`.trim();
    const visitorFullName = `${nombre.trim()} ${apellido.trim()}`;
    const cleanDni = String(dni).trim();
    const cleanPlate = vehiclePlate && String(vehiclePlate).trim() ? String(vehiclePlate).trim().toUpperCase() : 'Sin vehículo';
    const visitDate = date && String(date).trim() ? String(date).trim() : now.split('T')[0];
    const visitTime = time && String(time).trim() ? String(time).trim() : '18:00';

    // Generate real QR Code data URI
    const qrTextPayload = `RDS-PASS|VISITANTE:${visitorFullName}|DNI:${cleanDni}|PATENTE:${cleanPlate}|DESTINO:${hostFullName}|FECHA:${visitDate}`;
    const qrCode = await QRCode.toDataURL(qrTextPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#081018',
        light: '#ffffff'
      }
    });

    const insertStmt = db.prepare(`
      INSERT INTO visits (userId, residentName, visitorName, visitorDni, vehiclePlate, guestEmail, visitorPhone, qrCode, date, time, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmada', ?)
    `);

    const result = insertStmt.run(
      host.id,
      hostFullName,
      visitorFullName,
      cleanDni,
      cleanPlate,
      guestEmail ? String(guestEmail).trim() : null,
      cleanPhone,
      qrCode,
      visitDate,
      visitTime,
      now
    );

    // Invalidate the invitation code immediately so it cannot be shared or reused
    if (inviteCode) {
      const cleanCode = String(inviteCode).trim().toUpperCase();
      db.prepare(`
        UPDATE invites
        SET used = 1, usedAt = ?, usedByVisitor = ?
        WHERE code = ?
      `).run(now, visitorFullName, cleanCode);
    }

    // Notify resident (host)
    const hostNotifTitle = 'Nueva visita acreditada';
    const hostNotifText = `${visitorFullName} (DNI ${cleanDni}, Patente: ${cleanPlate}) completó su acreditación mediante tu invitación para el ${visitDate}.`;

    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (?, 'user', ?, ?, 0, ?)
    `).run(
      host.id,
      hostNotifTitle,
      hostNotifText,
      now
    );

    // Notify Guardia of new visit registration
    const guardNotifTitle = 'Nueva visita registrada';
    const guardNotifText = `Visita: ${visitorFullName} (DNI ${cleanDni}, Patente: ${cleanPlate}) para el lote de ${hostFullName} el ${visitDate} a las ${visitTime}.`;

    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (NULL, 'guardia', ?, ?, 0, ?)
    `).run(
      guardNotifTitle,
      guardNotifText,
      now
    );

    // Alert host resident directly on WhatsApp
    try {
      if (host.telefono) {
        sendWhatsAppTextMessage({
          phone: host.telefono,
          title: hostNotifTitle,
          message: hostNotifText,
          senderName: 'Acreditación Rancho Doble S',
          recipientName: `${host.nombre} ${host.apellido}`
        }).catch(err => console.error('[WhatsApp Host Accreditation Alert Error]', err));
      }
    } catch (e) {}

    if (guestEmail) {
      console.log(`[Email Dispatcher] Notificación enviada a ${guestEmail}: "Te enviamos el código QR para el ingreso al predio, presentalo en la guardia de ingreso."`);
    }

    let waResult = null;
    const isManualMode = Boolean(req.body.isManual || req.body.manual);
    // En registro manual no se envía QR al invitado; en garita le pedirán DNI e ingresa
    if (cleanPhone && !isManualMode) {
      try {
        waResult = await sendWhatsAppQrPass({
          phone: cleanPhone,
          qrCode,
          visitId: Number(result.lastInsertRowid),
          visitorName: visitorFullName,
          caption: 'Te enviamos el código QR para el ingreso al predio, presentalo en la guardia de ingreso.',
          protocol: req.protocol,
          reqHost: req.get('host')
        });
      } catch (waErr) {
        console.error('[WhatsApp Dispatcher Error]', waErr);
      }
    }

    res.status(201).json({
      message: 'Acreditación completada con éxito.',
      qrText: 'Este es tu código QR para el ingreso al predio, presentalo en la guardia de ingreso',
      qrCode,
      visitorPhone: cleanPhone,
      whatsappSent: Boolean(waResult && waResult.success),
      whatsappSimulated: Boolean(waResult && waResult.simulated),
      guestEmail: guestEmail || null,
      emailSent: Boolean(guestEmail),
      visit: {
        id: Number(result.lastInsertRowid),
        visitorName: visitorFullName,
        visitorDni: cleanDni,
        vehiclePlate: cleanPlate,
        visitorPhone: cleanPhone,
        residentName: hostFullName,
        date: visitDate,
        time: visitTime,
        status: 'Confirmada',
        guestEmail: guestEmail || null
      }
    });
  } catch (error) {
    console.error('[Guest Register Error]', error);
    res.status(500).json({ error: 'Error al procesar el registro de la visita.' });
  }
});

// GET /api/visits
router.get('/', authenticateToken, (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const isGuard = req.user.role === 'guardia';
    const canSeeAll = isAdmin || isGuard;
    const { date, all, search } = req.query;

    let query = `
      SELECT v.id, v.userId, v.residentName, v.visitorName, v.visitorDni, v.vehiclePlate, v.visitorPhone, v.guestEmail, v.qrCode, v.date, v.time, v.status, v.entryAt, v.exitAt, v.createdAt,
             COALESCE(u.lote, '') AS hostLote,
             COALESCE(u.manzana, '') AS hostManzana,
             COALESCE(u.nombre, '') AS hostNombre,
             COALESCE(u.apellido, '') AS hostApellido
      FROM visits v
      LEFT JOIN users u ON v.userId = u.id
    `;
    const params = [];
    const conditions = [];

    if (!canSeeAll || (all !== 'true' && !isGuard)) {
      if (!canSeeAll) {
        conditions.push('v.userId = ?');
        params.push(req.user.id);
      }
    }

    if (date) {
      conditions.push('v.date = ?');
      params.push(date);
    }

    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(v.visitorName) LIKE ? OR
        LOWER(v.visitorDni) LIKE ? OR
        LOWER(COALESCE(v.vehiclePlate, '')) LIKE ? OR
        LOWER(COALESCE(v.visitorPhone, '')) LIKE ? OR
        LOWER(v.residentName) LIKE ? OR
        LOWER(COALESCE(u.lote, '')) LIKE ? OR
        LOWER(COALESCE(u.manzana, '')) LIKE ?
      )`);
      params.push(s, s, s, s, s, s, s);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY v.date DESC, v.time DESC, v.id DESC';

    const visits = db.prepare(query).all(...params);
    res.json(visits);
  } catch (error) {
    console.error('[Get Visits Error]', error);
    res.status(500).json({ error: 'Error al obtener visitas.' });
  }
});

// POST /api/visits (manual resident registration)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin' || (req.user.username && req.user.username.toLowerCase() === 'superadmin')) {
      return res.status(403).json({ error: 'El Administrador General no tiene permisos para generar invitaciones o visitas particulares.' });
    }
    const { visitorName, apellido, nombre, visitorDni, vehiclePlate, visitorPhone, visitPhone, phone, guestEmail, visitEmail, date, time } = req.body;

    const resolvedVisitorName = (visitorName && String(visitorName).trim())
      ? String(visitorName).trim()
      : `${(nombre || '').trim()} ${(apellido || '').trim()}`.trim();

    if (!resolvedVisitorName || !visitorDni || !date || !time) {
      return res.status(400).json({ error: 'Nombre, DNI, fecha y horario son requeridos.' });
    }

    const now = new Date().toISOString();
    const residentFullName = `${req.user.nombre} ${req.user.apellido}`;
    const cleanPlate = vehiclePlate && String(vehiclePlate).trim() ? String(vehiclePlate).trim().toUpperCase() : 'Sin vehículo';
    const cleanPhone = visitorPhone || visitPhone || phone ? String(visitorPhone || visitPhone || phone).trim() : null;
    const cleanEmail = guestEmail || visitEmail ? String(guestEmail || visitEmail).trim() : null;

    // Generate QR Code
    const qrTextPayload = `RDS-PASS|VISITANTE:${resolvedVisitorName}|DNI:${visitorDni.trim()}|PATENTE:${cleanPlate}|DESTINO:${residentFullName}|FECHA:${date.trim()}`;
    const qrCode = await QRCode.toDataURL(qrTextPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#081018',
        light: '#ffffff'
      }
    });

    const insertStmt = db.prepare(`
      INSERT INTO visits (userId, residentName, visitorName, visitorDni, vehiclePlate, guestEmail, visitorPhone, qrCode, date, time, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmada', ?)
    `);

    const result = insertStmt.run(
      req.user.id,
      residentFullName,
      resolvedVisitorName,
      visitorDni.trim(),
      cleanPlate,
      cleanEmail,
      cleanPhone,
      qrCode,
      date.trim(),
      time.trim(),
      now
    );

    // Create notification for resident
    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (?, 'user', ?, ?, 0, ?)
    `).run(
      req.user.id,
      'Aviso de ingreso registrado',
      `${resolvedVisitorName} (DNI ${visitorDni.trim()}, Patente ${cleanPlate}) tiene ingreso previsto para ${date} a las ${time}.`,
      now
    );

    // Notify Guardia of new visit registration
    const guardNotifTitle = 'Nueva visita registrada';
    const guardNotifText = `Visita: ${resolvedVisitorName} (DNI ${visitorDni.trim()}, Patente: ${cleanPlate}) para el lote de ${residentFullName} el ${date.trim()} a las ${time.trim()}.`;

    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (NULL, 'guardia', ?, ?, 0, ?)
    `).run(
      guardNotifTitle,
      guardNotifText,
      now
    );

    // En el registro manual no se envía el QR al invitado; en la garita le pedirán el DNI e ingresa
    let waResult = null;

    res.status(201).json({
      message: 'Visita registrada con éxito.',
      qrCode,
      qrText: 'Este es tu código QR para el ingreso al predio, presentalo en la guardia de ingreso',
      whatsappSent: Boolean(waResult && waResult.success),
      whatsappSimulated: Boolean(waResult && waResult.simulated),
      visit: {
        id: Number(result.lastInsertRowid),
        userId: req.user.id,
        residentName: residentFullName,
        visitorName: visitorName.trim(),
        visitorDni: visitorDni.trim(),
        vehiclePlate: cleanPlate,
        visitorPhone: cleanPhone,
        date: date.trim(),
        time: time.trim(),
        status: 'Confirmada',
        qrCode,
        createdAt: now
      }
    });
  } catch (error) {
    console.error('[Create Visit Error]', error);
    res.status(500).json({ error: 'Error al registrar visita.' });
  }
});

// POST /api/visits/scan-lookup
// Allows guard to look up a visit by QR string, pass code, DNI, or plate
router.post('/scan-lookup', authenticateToken, (req, res) => {
  try {
    const { code, query: rawQuery } = req.body;
    const input = String(code || rawQuery || '').trim();

    if (!input) {
      return res.status(400).json({ found: false, error: 'Código o texto de búsqueda vacío.' });
    }

    let visit = null;

    // Check if input is standard RDS-PASS payload:
    // e.g. "RDS-PASS|VISITANTE:...|DNI:12345678|PATENTE:...|DESTINO:...|FECHA:2026-09-16"
    if (input.includes('RDS-PASS')) {
      const dniMatch = input.match(/DNI:([^|]+)/i);
      const dateMatch = input.match(/FECHA:([^|]+)/i);

      if (dniMatch && dniMatch[1]) {
        const dni = dniMatch[1].trim();
        const date = dateMatch ? dateMatch[1].trim() : null;

        if (date) {
          visit = db.prepare(`
            SELECT id, userId, residentName, visitorName, visitorDni, vehiclePlate, guestEmail, qrCode, date, time, status, entryAt, exitAt, createdAt
            FROM visits
            WHERE visitorDni = ? AND date = ?
            ORDER BY id DESC LIMIT 1
          `).get(dni, date);
        }

        if (!visit) {
          visit = db.prepare(`
            SELECT id, userId, residentName, visitorName, visitorDni, vehiclePlate, guestEmail, qrCode, date, time, status, entryAt, exitAt, createdAt
            FROM visits
            WHERE visitorDni = ?
            ORDER BY date DESC, id DESC LIMIT 1
          `).get(dni);
        }
      }
    }

    // If not found yet, check by invite code if passed:
    if (!visit && input.length <= 10) {
      const invite = db.prepare('SELECT * FROM invites WHERE UPPER(code) = ?').get(input.toUpperCase());
      if (invite) {
        visit = db.prepare(`
          SELECT id, userId, residentName, visitorName, visitorDni, vehiclePlate, guestEmail, qrCode, date, time, status, entryAt, exitAt, createdAt
          FROM visits
          WHERE userId = ?
          ORDER BY id DESC LIMIT 1
        `).get(invite.hostId);
      }
    }

    // If not found yet, check by exact DNI or exact vehicle plate or visitor name:
    if (!visit) {
      visit = db.prepare(`
        SELECT id, userId, residentName, visitorName, visitorDni, vehiclePlate, guestEmail, qrCode, date, time, status, entryAt, exitAt, createdAt
        FROM visits
        WHERE visitorDni = ? OR UPPER(vehiclePlate) = ? OR LOWER(visitorName) LIKE ?
        ORDER BY date DESC, id DESC LIMIT 1
      `).get(input, input.toUpperCase(), `%${input.toLowerCase()}%`);
    }

    if (!visit) {
      if (req.user.role === 'guardia') {
        logActivity(
          req.user.id,
          `${req.user.nombre} ${req.user.apellido} (${req.user.username || req.user.email})`,
          req.user.role,
          'BUSCAR_PASE_QR',
          `Búsqueda/Escaneo de pase sin resultados para: "${input}"`,
          req.ip || ''
        );
      }
      return res.status(404).json({
        found: false,
        error: 'No se encontró ninguna visita registrada con los datos proporcionados.'
      });
    }

    if (req.user.role === 'guardia') {
      logActivity(
        req.user.id,
        `${req.user.nombre} ${req.user.apellido} (${req.user.username || req.user.email})`,
        req.user.role,
        'BUSCAR_PASE_QR',
        `Pase localizado: ${visit.visitorName} (Patente: ${visit.vehiclePlate || 'Sin vehículo'}, DNI: ${visit.visitorDni})`,
        req.ip || ''
      );
    }

    res.json({
      found: true,
      visit
    });
  } catch (error) {
    console.error('[Scan Lookup Error]', error);
    res.status(500).json({ found: false, error: 'Error al buscar pase de visita.' });
  }
});

// PATCH /api/visits/:id/status
router.patch('/:id/status', authenticateToken, (req, res) => {
  try {
    const visitId = Number(req.params.id);
    const { status } = req.body;

    const allowedStatuses = ['Pendiente', 'Confirmada', 'Ingresado', 'Egresado', 'Cancelado'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado no válido.' });
    }

    const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(visitId);
    if (!visit) {
      return res.status(404).json({ error: 'Visita no encontrada.' });
    }

    const isOwner = visit.userId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isGuard = req.user.role === 'guardia';

    if (!isOwner && !isAdmin && !isGuard) {
      return res.status(403).json({ error: 'No tenés permisos para actualizar esta visita.' });
    }

    // Resident/owner can only cancel visits that have not entered yet
    if (!isAdmin && status === 'Cancelado') {
      if (visit.status === 'Ingresado' || visit.entryAt) {
        return res.status(400).json({ error: 'No es posible cancelar una visita que ya ingresó y se encuentra dentro del predio.' });
      }
      if (visit.status === 'Egresado' || visit.exitAt) {
        return res.status(400).json({ error: 'No es posible cancelar una visita que ya egresó del predio.' });
      }
    }

    const now = new Date().toISOString();

    if (status === 'Ingresado') {
      db.prepare('UPDATE visits SET status = ?, entryAt = ? WHERE id = ?').run(status, now, visitId);

      // If marked as Ingresado by security/admin, notify resident (personal host only)
      if (!isOwner) {
        const notifTitle = '🚗 Visita ingresada al predio';
        const notifText = `${visit.visitorName} (DNI ${visit.visitorDni || 'S/D'}, Patente ${visit.vehiclePlate || 'Sin vehículo'}) acaba de ingresar por la guardia.`;

        db.prepare(`
          INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
          VALUES (?, 'user', ?, ?, 0, ?)
        `).run(visit.userId, notifTitle, notifText, now);

        // Alert resident owner directly on WhatsApp
        try {
          const hostUser = db.prepare('SELECT telefono, nombre, apellido FROM users WHERE id = ?').get(visit.userId);
          if (hostUser && hostUser.telefono) {
            const guardSender = req.user ? `${req.user.nombre} ${req.user.apellido} (Guardia)` : 'Guardia de Acceso';
            sendWhatsAppTextMessage({
              phone: hostUser.telefono,
              title: notifTitle,
              message: notifText,
              senderName: guardSender,
              recipientName: `${hostUser.nombre} ${hostUser.apellido}`
            }).catch(waErr => console.error('[WhatsApp Visit Entry Alert Error]', waErr));
          }
        } catch (e) {}
      }
    } else if (status === 'Egresado') {
      db.prepare('UPDATE visits SET status = ?, exitAt = ? WHERE id = ?').run(status, now, visitId);

      // If marked as Egresado by security/admin, notify resident (personal host only)
      if (!isOwner) {
        const exitTitle = 'Visita egresada del predio';
        const exitText = `${visit.visitorName} (Patente ${visit.vehiclePlate || 'Sin vehículo'}) ha salido del predio por la guardia.`;

        db.prepare(`
          INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
          VALUES (?, 'user', ?, ?, 0, ?)
        `).run(visit.userId, exitTitle, exitText, now);

        // Alert resident owner directly on WhatsApp
        try {
          const hostUser = db.prepare('SELECT telefono, nombre, apellido FROM users WHERE id = ?').get(visit.userId);
          if (hostUser && hostUser.telefono) {
            const guardSender = req.user ? `${req.user.nombre} ${req.user.apellido} (Guardia)` : 'Guardia de Acceso';
            sendWhatsAppTextMessage({
              phone: hostUser.telefono,
              title: exitTitle,
              message: exitText,
              senderName: guardSender,
              recipientName: `${hostUser.nombre} ${hostUser.apellido}`
            }).catch(waErr => console.error('[WhatsApp Visit Exit Alert Error]', waErr));
          }
        } catch (e) {}
      }
    } else {
      db.prepare('UPDATE visits SET status = ? WHERE id = ?').run(status, visitId);
    }

    // Log action in activity logs
    logActivity(
      req.user.id,
      `${req.user.nombre} ${req.user.apellido} (${req.user.username || req.user.email})`,
      req.user.role,
      status === 'Ingresado' ? 'CONFIRMAR_INGRESO' : (status === 'Egresado' ? 'CONFIRMAR_EGRESO' : 'ACTUALIZAR_ESTADO_VISITA'),
      `Visitante: ${visit.visitorName} (Patente: ${visit.vehiclePlate || 'Sin vehículo'}, DNI: ${visit.visitorDni}) - Destino: ${visit.residentName} - Nuevo estado: ${status}`,
      req.ip || ''
    );

    res.json({ message: `Estado actualizado a "${status}".`, status, visitId });
  } catch (error) {
    console.error('[Update Visit Status Error]', error);
    res.status(500).json({ error: 'Error al actualizar estado de visita.' });
  }
});

// DELETE /api/visits/:id
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const visitId = Number(req.params.id);
    const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(visitId);

    if (!visit) {
      return res.status(404).json({ error: 'Visita no encontrada.' });
    }

    const isOwner = visit.userId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Solo podés eliminar tus propias visitas.' });
    }

    if (!isAdmin) {
      if (visit.status === 'Ingresado' || visit.entryAt) {
        return res.status(400).json({ error: 'No es posible cancelar una visita que ya ingresó y se encuentra dentro del predio.' });
      }
      if (visit.status === 'Egresado' || visit.exitAt) {
        return res.status(400).json({ error: 'No es posible cancelar una visita que ya egresó del predio.' });
      }
    }

    db.prepare('DELETE FROM visits WHERE id = ?').run(visitId);
    res.json({ message: 'Visita eliminada con éxito.' });
  } catch (error) {
    console.error('[Delete Visit Error]', error);
    res.status(500).json({ error: 'Error al eliminar visita.' });
  }
});

module.exports = router;
