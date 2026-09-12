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
      SELECT id, date, slot, userId, userName, userEmail, createdAt
      FROM bookings
      WHERE date = ?
      ORDER BY slot ASC
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

    // Check if slot is taken
    const existing = db.prepare('SELECT id FROM bookings WHERE date = ? AND slot = ?').get(date, slot);
    if (existing) {
      return res.status(400).json({ error: 'Este horario ya está reservado.' });
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

    // Create notification
    db.prepare(`
      INSERT INTO notifications (userId, title, text, read, createdAt)
      VALUES (?, ?, ?, 0, ?)
    `).run(
      req.user.id,
      'Reserva confirmada',
      `Tu turno de tenis para el ${date} a las ${slot} fue confirmado.`,
      now
    );

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

    // Notify user if cancelled by admin
    if (isAdmin && !isOwner) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO notifications (userId, title, text, read, createdAt)
        VALUES (?, ?, ?, 0, ?)
      `).run(
        booking.userId,
        'Reserva cancelada por administración',
        `Tu reserva para el ${booking.date} (${booking.slot}) fue cancelada por la administración.`,
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
