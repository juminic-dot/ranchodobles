const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const os = require('os');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware');

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
    const hostFullName = `${req.user.nombre} ${req.user.apellido}`.trim();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    // 6-character alphanumeric short code, e.g. "8F2B1A"
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();

    db.prepare(`
      INSERT INTO invites (code, hostId, hostName, expiresAt, createdAt)
      VALUES (?, ?, ?, ?, ?)
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
        return res.status(400).json({ valid: false, error: 'El código de invitación no es válido o ha expirado.' });
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

// POST /api/visits/guest-register
// Public endpoint for guest self-registration: REQUIRES a valid invitation code or token
router.post('/guest-register', async (req, res) => {
  try {
    const { code, c, token, apellido, nombre, dni, vehiclePlate, guestEmail, date, time } = req.body;
    const inviteCode = code || c;

    let hostId = null;

    if (inviteCode) {
      const cleanCode = String(inviteCode).trim().toUpperCase();
      const invite = db.prepare('SELECT * FROM invites WHERE code = ?').get(cleanCode);
      if (!invite) {
        return res.status(401).json({ error: 'El código de invitación no es válido.' });
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
      INSERT INTO visits (userId, residentName, visitorName, visitorDni, vehiclePlate, guestEmail, qrCode, date, time, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmada', ?)
    `);

    const result = insertStmt.run(
      host.id,
      hostFullName,
      visitorFullName,
      cleanDni,
      cleanPlate,
      guestEmail ? String(guestEmail).trim() : null,
      qrCode,
      visitDate,
      visitTime,
      now
    );

    // Notify resident (host)
    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (?, 'user', ?, ?, 0, ?)
    `).run(
      host.id,
      'Nueva visita acreditada',
      `${visitorFullName} (DNI ${cleanDni}, Patente: ${cleanPlate}) completó su acreditación mediante tu invitación para el ${visitDate}.`,
      now
    );

    if (guestEmail) {
      console.log(`[Email Dispatcher] Notificación enviada a ${guestEmail}: "Este es tu código QR para el ingreso al predio, presentalo en la guardia de ingreso"`);
    }

    res.status(201).json({
      message: 'Acreditación completada con éxito.',
      qrText: 'Este es tu código QR para el ingreso al predio, presentalo en la guardia de ingreso',
      qrCode,
      guestEmail: guestEmail || null,
      emailSent: Boolean(guestEmail),
      visit: {
        id: Number(result.lastInsertRowid),
        visitorName: visitorFullName,
        visitorDni: cleanDni,
        vehiclePlate: cleanPlate,
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
    const { date, all } = req.query;

    let query = `
      SELECT id, userId, residentName, visitorName, visitorDni, vehiclePlate, guestEmail, qrCode, date, time, status, entryAt, exitAt, createdAt
      FROM visits
    `;
    const params = [];

    if (!isAdmin || all !== 'true') {
      if (!isAdmin) {
        query += ' WHERE userId = ?';
        params.push(req.user.id);
      }
    }

    if (date) {
      query += (params.length ? ' AND' : ' WHERE') + ' date = ?';
      params.push(date);
    }

    query += ' ORDER BY date DESC, time DESC, id DESC';

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
    const { visitorName, visitorDni, vehiclePlate, date, time } = req.body;

    if (!visitorName || !visitorDni || !date || !time) {
      return res.status(400).json({ error: 'Nombre, DNI, fecha y horario son requeridos.' });
    }

    const now = new Date().toISOString();
    const residentFullName = `${req.user.nombre} ${req.user.apellido}`;
    const cleanPlate = vehiclePlate && String(vehiclePlate).trim() ? String(vehiclePlate).trim().toUpperCase() : 'Sin vehículo';

    // Generate QR Code
    const qrTextPayload = `RDS-PASS|VISITANTE:${visitorName.trim()}|DNI:${visitorDni.trim()}|PATENTE:${cleanPlate}|DESTINO:${residentFullName}|FECHA:${date.trim()}`;
    const qrCode = await QRCode.toDataURL(qrTextPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#081018',
        light: '#ffffff'
      }
    });

    const insertStmt = db.prepare(`
      INSERT INTO visits (userId, residentName, visitorName, visitorDni, vehiclePlate, qrCode, date, time, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Confirmada', ?)
    `);

    const result = insertStmt.run(
      req.user.id,
      residentFullName,
      visitorName.trim(),
      visitorDni.trim(),
      cleanPlate,
      qrCode,
      date.trim(),
      time.trim(),
      now
    );

    // Create notification
    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (?, 'user', ?, ?, 0, ?)
    `).run(
      req.user.id,
      'Aviso de ingreso registrado',
      `${visitorName.trim()} (DNI ${visitorDni.trim()}, Patente ${cleanPlate}) tiene ingreso previsto para ${date} a las ${time}.`,
      now
    );

    res.status(201).json({
      message: 'Visita registrada con éxito.',
      qrCode,
      qrText: 'Este es tu código QR para el ingreso al predio, presentalo en la guardia de ingreso',
      visit: {
        id: Number(result.lastInsertRowid),
        userId: req.user.id,
        residentName: residentFullName,
        visitorName: visitorName.trim(),
        visitorDni: visitorDni.trim(),
        vehiclePlate: cleanPlate,
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
      return res.status(404).json({
        found: false,
        error: 'No se encontró ninguna visita registrada con los datos proporcionados.'
      });
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

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'No tenés permisos para actualizar esta visita.' });
    }

    const now = new Date().toISOString();

    if (status === 'Ingresado') {
      db.prepare('UPDATE visits SET status = ?, entryAt = ? WHERE id = ?').run(status, now, visitId);

      // If marked as Ingresado by security/admin, notify resident (personal host only)
      if (!isOwner) {
        db.prepare(`
          INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
          VALUES (?, 'user', ?, ?, 0, ?)
        `).run(
          visit.userId,
          'Visita ingresada al predio',
          `${visit.visitorName} (DNI ${visit.visitorDni}, Patente ${visit.vehiclePlate || 'Sin vehículo'}) acaba de ingresar por la guardia.`,
          now
        );
      }
    } else if (status === 'Egresado') {
      db.prepare('UPDATE visits SET status = ?, exitAt = ? WHERE id = ?').run(status, now, visitId);

      // If marked as Egresado by security/admin, notify resident (personal host only)
      if (!isOwner) {
        db.prepare(`
          INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
          VALUES (?, 'user', ?, ?, 0, ?)
        `).run(
          visit.userId,
          'Visita egresada del predio',
          `${visit.visitorName} (Patente ${visit.vehiclePlate || 'Sin vehículo'}) ha salido del predio por la guardia.`,
          now
        );
      }
    } else {
      db.prepare('UPDATE visits SET status = ? WHERE id = ?').run(status, visitId);
    }

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

    db.prepare('DELETE FROM visits WHERE id = ?').run(visitId);
    res.json({ message: 'Visita eliminada con éxito.' });
  } catch (error) {
    console.error('[Delete Visit Error]', error);
    res.status(500).json({ error: 'Error al eliminar visita.' });
  }
});

module.exports = router;
