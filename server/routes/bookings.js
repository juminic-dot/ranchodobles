const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware');

const validSlots = [
  '07:00 - 08:00', '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00',
  '11:00 - 12:00', '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00',
  '15:00 - 16:00', '16:00 - 17:00', '17:00 - 18:00', '18:00 - 19:00',
  '19:00 - 20:00', '20:00 - 21:00', '21:00 - 22:00'
];

// GET /api/bookings?date=YYYY-MM-DD
router.get('/', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const date = req.query.date || today;

    const bookings = db.prepare(`
      SELECT b.id, b.date, b.slot, b.userId, b.userName, b.userEmail, b.createdAt,
             COALESCE(b.isBlocked, 0) AS isBlocked, b.blockReason,
             u.lote, u.manzana, u.telefono, u.username
      FROM bookings b
      LEFT JOIN users u ON b.userId = u.id
      WHERE b.date = ?
      ORDER BY b.slot ASC
    `).all(date);

    res.json({
      date,
      validSlots,
      bookings
    });
  } catch (error) {
    console.error('[Get Bookings Error]', error);
    res.status(500).json({ error: 'Error al consultar reservas.' });
  }
});

// POST /api/bookings
router.post('/', authenticateToken, (req, res) => {
  try {
    const { date, slot } = req.body;
    if (!date || !slot) {
      return res.status(400).json({ error: 'Fecha y horario son requeridos.' });
    }

    if (!validSlots.includes(slot)) {
      return res.status(400).json({ error: 'Horario no válido.' });
    }

    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      return res.status(400).json({ error: 'No se pueden realizar reservas en fechas pasadas.' });
    }

    // Horizon limit: reservations allowed up to 7 days in advance for residents
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    const maxDateStr = maxDate.toISOString().split('T')[0];
    if (date > maxDateStr && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Las reservas solo están habilitadas con hasta 7 días de anticipación.' });
    }

    // If date is today, verify slot has not expired
    if (date === today) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [startHour, , endHour] = slot.split(/[:\s-]+/).filter(Boolean);
      const endMinutes = Number(endHour) * 60;
      if (endMinutes <= currentMinutes) {
        return res.status(400).json({ error: 'Este horario ya ha finalizado.' });
      }
    }

    // Check if slot is taken or blocked
    const existing = db.prepare('SELECT id, isBlocked, blockReason FROM bookings WHERE date = ? AND slot = ?').get(date, slot);
    if (existing) {
      if (existing.isBlocked) {
        return res.status(400).json({ error: `Este horario está bloqueado por administración (${existing.blockReason || 'Mantenimiento'}).` });
      }
      return res.status(400).json({ error: 'Este horario ya está reservado.' });
    }

    // Quota limits for non-admin residents
    if (req.user.role !== 'admin') {
      // 1. Max 1 reservation per day
      const dailyCount = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE userId = ? AND date = ?').get(req.user.id, date).count;
      if (dailyCount >= 1) {
        return res.status(400).json({ error: 'Ya tenés un turno reservado para este día. El límite es de 1 reserva diaria por vecino.' });
      }

      // 2. Max 3 active/upcoming reservations in total
      const upcomingCount = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE userId = ? AND date >= ?').get(req.user.id, today).count;
      if (upcomingCount >= 3) {
        return res.status(400).json({ error: 'Has alcanzado el límite máximo de 3 reservas activas. Debés esperar a que se cumpla o cancelar una para reservar otro turno.' });
      }
    }

    const now = new Date().toISOString();
    const fullName = `${req.user.nombre} ${req.user.apellido}`;

    const insertStmt = db.prepare(`
      INSERT INTO bookings (date, slot, userId, userName, userEmail, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      date,
      slot,
      req.user.id,
      fullName,
      req.user.email,
      now
    );

    // Notify resident (personal)
    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (?, 'user', ?, ?, 0, ?)
    `).run(
      req.user.id,
      'Reserva confirmada',
      `Tu turno de tenis para el ${date} a las ${slot} fue confirmado.`,
      now
    );

    // Notify administration (admin-only operational notice)
    if (req.user.role !== 'admin') {
      db.prepare(`
        INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
        VALUES (NULL, 'admin', ?, ?, 0, ?)
      `).run(
        'Nueva reserva de cancha de tenis',
        `${fullName} reservó la cancha para el ${date} a las ${slot} hs.`,
        now
      );
    }

    res.status(201).json({
      message: 'Turno reservado con éxito.',
      booking: {
        id: Number(result.lastInsertRowid),
        date,
        slot,
        userId: req.user.id,
        userName: fullName,
        userEmail: req.user.email,
        createdAt: now
      }
    });
  } catch (error) {
    console.error('[Create Booking Error]', error);
    res.status(500).json({ error: 'Error al reservar turno.' });
  }
});

// POST /api/bookings/admin/block
router.post('/admin/block', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden bloquear horarios.' });
    }

    const { date, slot, allDay, reason, details } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'La fecha es requerida.' });
    }

    const fullReason = [reason, details].filter(Boolean).join(' - ') || 'Mantenimiento de cancha';
    const slotsToBlock = allDay ? validSlots : [slot];

    if (!allDay && (!slot || !validSlots.includes(slot))) {
      return res.status(400).json({ error: 'Horario no válido.' });
    }

    const now = new Date().toISOString();
    let affectedCount = 0;

    for (const s of slotsToBlock) {
      const existing = db.prepare('SELECT id, userId, userName, isBlocked FROM bookings WHERE date = ? AND slot = ?').get(date, s);
      if (existing) {
        if (existing.userId !== req.user.id && !existing.isBlocked) {
          db.prepare(`
            INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
            VALUES (?, 'user', ?, ?, 0, ?)
          `).run(
            existing.userId,
            'Turno de tenis suspendido',
            `Tu reserva para el ${date} (${s}) fue suspendida por la administración. Motivo: ${fullReason}.`,
            now
          );
          affectedCount++;
        }
        db.prepare(`
          UPDATE bookings
          SET isBlocked = 1, blockReason = ?, userId = ?, userName = 'Administración (Bloqueado)', userEmail = ?, createdAt = ?
          WHERE id = ?
        `).run(fullReason, req.user.id, req.user.email, now, existing.id);
      } else {
        db.prepare(`
          INSERT INTO bookings (date, slot, userId, userName, userEmail, isBlocked, blockReason, createdAt)
          VALUES (?, ?, ?, 'Administración (Bloqueado)', ?, 1, ?, ?)
        `).run(date, s, req.user.id, req.user.email, fullReason, now);
      }
    }

    res.json({
      message: allDay
        ? `Se bloquearon todos los turnos del día ${date} (${fullReason}).`
        : `Turno ${slot} del día ${date} bloqueado con éxito (${fullReason}).`,
      affectedCount
    });
  } catch (error) {
    console.error('[Admin Block Court Error]', error);
    res.status(500).json({ error: 'Error al bloquear horarios de cancha.' });
  }
});

// POST /api/bookings/admin/unblock-day
router.post('/admin/unblock-day', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden desbloquear horarios.' });
    }

    const { date } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'La fecha es requerida.' });
    }

    const result = db.prepare('DELETE FROM bookings WHERE date = ? AND isBlocked = 1').run(date);

    res.json({
      message: `Se desbloquearon ${result.changes} turnos del día ${date}.`
    });
  } catch (error) {
    console.error('[Admin Unblock Day Error]', error);
    res.status(500).json({ error: 'Error al desbloquear horarios.' });
  }
});

// DELETE /api/bookings/:id
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    const isOwner = booking.userId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Solo podés cancelar reservas realizadas por vos.' });
    }

    db.prepare('DELETE FROM bookings WHERE id = ?').run(bookingId);

    // Notify user if cancelled by admin and was not already blocked
    if (isAdmin && !isOwner && !booking.isBlocked) {
      const customReason = req.body?.reason || req.query?.reason || '';
      const reasonText = customReason ? ` Motivo: ${customReason}.` : '';
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
        VALUES (?, 'user', ?, ?, 0, ?)
      `).run(
        booking.userId,
        'Reserva cancelada por administración',
        `Tu reserva para el ${booking.date} (${booking.slot}) fue cancelada por la administración.${reasonText}`,
        now
      );
    }

    res.json({ message: `Reserva del ${booking.date} (${booking.slot}) cancelada.` });
  } catch (error) {
    console.error('[Delete Booking Error]', error);
    res.status(500).json({ error: 'Error al cancelar reserva.' });
  }
});

module.exports = router;
