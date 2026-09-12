const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const db = require('../db');
const { authenticateToken } = require('../middleware');

// Public endpoint for guest self-registration from Gmail / WhatsApp invite
router.post('/guest-register', async (req, res) => {
  try {
    const { hostId, residentName, apellido, nombre, dni, vehiclePlate, guestEmail, date, time } = req.body;

    if (!apellido || !nombre || !dni) {
      return res.status(400).json({ error: 'Apellido, nombre y DNI son obligatorios.' });
    }

    let host = null;
    if (hostId) {
      host = db.prepare('SELECT id, nombre, apellido, email FROM users WHERE id = ?').get(Number(hostId));
    }
    if (!host) {
      host = db.prepare('SELECT id, nombre, apellido, email FROM users WHERE approved = 1 ORDER BY id ASC LIMIT 1').get();
    }
    if (!host) {
      return res.status(404).json({ error: 'El anfitrión o propietario no fue encontrado.' });
    }

    const now = new Date().toISOString();
    const hostFullName = residentName || `${host.nombre} ${host.apellido}`;
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
      INSERT INTO notifications (userId, title, text, read, createdAt)
      VALUES (?, ?, ?, 0, ?)
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
      SELECT id, userId, residentName, visitorName, visitorDni, vehiclePlate, guestEmail, qrCode, date, time, status, createdAt
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
      INSERT INTO notifications (userId, title, text, read, createdAt)
      VALUES (?, ?, ?, 0, ?)
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

// PATCH /api/visits/:id/status
router.patch('/:id/status', authenticateToken, (req, res) => {
  try {
    const visitId = Number(req.params.id);
    const { status } = req.body;

    const allowedStatuses = ['Pendiente', 'Confirmada', 'Ingresado', 'Cancelado'];
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

    db.prepare('UPDATE visits SET status = ? WHERE id = ?').run(status, visitId);

    // If marked as Ingresado by security/admin, notify resident
    if (status === 'Ingresado' && !isOwner) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO notifications (userId, title, text, read, createdAt)
        VALUES (?, ?, ?, 0, ?)
      `).run(
        visit.userId,
        'Visita ingresada',
        `${visit.visitorName} (DNI ${visit.visitorDni}, Patente ${visit.vehiclePlate || 'S/P'}) acaba de ingresar por la guardia.`,
        now
      );
    }

    res.json({ message: `Estado actualizado a ${status}.` });
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
