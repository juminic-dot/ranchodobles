const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware');

const bankInfo = {
  banco: 'Banco Galicia',
  titular: 'Consorcio Rancho Doble S',
  cuit: '30-71234567-8',
  alias: 'RANCHO.DOBLE.S',
  cbu: '0070123420000012345678'
};

// GET /api/expenses (Resident's personal expenses)
router.get('/', authenticateToken, (req, res) => {
  try {
    const expenses = db.prepare(`
      SELECT id, userId, period, dueDate, amount, status, concept, paymentReference, paidAt, createdAt
      FROM expenses
      WHERE userId = ?
      ORDER BY dueDate DESC, id DESC
    `).all(req.user.id);

    res.json({
      bankInfo,
      expenses
    });
  } catch (error) {
    console.error('[Get Expenses Error]', error);
    res.status(500).json({ error: 'Error al consultar expensas.' });
  }
});

// GET /api/expenses/admin/all (Admin view of all expenses)
router.get('/admin/all', authenticateToken, requireAdmin, (req, res) => {
  try {
    const allExpenses = db.prepare(`
      SELECT e.id, e.userId, e.period, e.dueDate, e.amount, e.status, e.concept,
             e.paymentReference, e.paidAt, e.createdAt,
             u.nombre, u.apellido, u.email, u.numeroDocumento
      FROM expenses e
      JOIN users u ON e.userId = u.id
      ORDER BY e.dueDate DESC, e.id DESC
    `).all();

    res.json(allExpenses);
  } catch (error) {
    console.error('[Get Admin Expenses Error]', error);
    res.status(500).json({ error: 'Error al consultar expensas de administración.' });
  }
});

// POST /api/expenses/:id/pay (Resident reports payment; sets status to 'En revisión', Admin can directly accredit)
router.post('/:id/pay', authenticateToken, (req, res) => {
  try {
    const expenseId = Number(req.params.id);
    const { reference } = req.body || {};
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);

    if (!expense) {
      return res.status(404).json({ error: 'Comprobante de expensas no encontrado.' });
    }

    const isAdmin = req.user.role === 'admin';
    if (expense.userId !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: 'No tenés permisos para esta liquidación.' });
    }

    if (expense.status === 'Pagado') {
      return res.status(400).json({ error: 'Este periodo ya se encuentra acreditado como pagado.' });
    }

    const now = new Date().toISOString();
    const cleanRef = reference && String(reference).trim() ? String(reference).trim() : null;

    if (isAdmin) {
      // Admin directly accredits payment
      db.prepare(`
        UPDATE expenses
        SET status = 'Pagado', paymentReference = COALESCE(?, paymentReference), paidAt = ?
        WHERE id = ?
      `).run(cleanRef, now, expenseId);

      // Notify resident
      db.prepare(`
        INSERT INTO notifications (userId, title, text, read, createdAt)
        VALUES (?, ?, ?, 0, ?)
      `).run(
        expense.userId,
        'Pago de expensas acreditado',
        `La administración acreditó como pagado el periodo ${expense.period}.`,
        now
      );

      return res.json({ message: 'Pago acreditado con éxito por administración.', status: 'Pagado' });
    }

    // Resident reports payment: changes status to 'En revisión'
    db.prepare(`
      UPDATE expenses
      SET status = 'En revisión', paymentReference = ?, paidAt = ?
      WHERE id = ?
    `).run(cleanRef || 'Informado por portal', now, expenseId);

    // Notify resident
    db.prepare(`
      INSERT INTO notifications (userId, title, text, read, createdAt)
      VALUES (?, ?, ?, 0, ?)
    `).run(
      req.user.id,
      'Aviso de pago de expensas',
      `Tu aviso de pago para el periodo ${expense.period} fue registrado y está en revisión por la administración.`,
      now
    );

    // Notify admin
    db.prepare(`
      INSERT INTO notifications (userId, title, text, read, createdAt)
      VALUES (?, ?, ?, 0, ?)
    `).run(
      null,
      'Nuevo aviso de pago de expensas',
      `${req.user.nombre} ${req.user.apellido} informó el pago de expensas del periodo ${expense.period} (${cleanRef || 'Transferencia'}).`,
      now
    );

    res.json({
      message: 'Aviso de pago enviado. Se encuentra en revisión por la administración.',
      status: 'En revisión'
    });
  } catch (error) {
    console.error('[Pay Expense Error]', error);
    res.status(500).json({ error: 'Error al registrar aviso de pago.' });
  }
});

// PATCH /api/expenses/:id/status (Admin approval / rejection)
router.patch('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const expenseId = Number(req.params.id);
    const { status } = req.body;
    const allowed = ['Pendiente', 'En revisión', 'Pagado'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Estado no válido.' });
    }

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
    if (!expense) {
      return res.status(404).json({ error: 'Comprobante no encontrado.' });
    }

    const now = new Date().toISOString();
    const paidAt = status === 'Pagado' ? now : (status === 'Pendiente' ? null : expense.paidAt);

    db.prepare('UPDATE expenses SET status = ?, paidAt = ? WHERE id = ?').run(status, paidAt, expenseId);

    // Notify resident of the decision
    if (status === 'Pagado') {
      db.prepare(`
        INSERT INTO notifications (userId, title, text, read, createdAt)
        VALUES (?, ?, ?, 0, ?)
      `).run(
        expense.userId,
        '¡Pago de expensas confirmado!',
        `La administración confirmó la recepción del pago de tus expensas del periodo ${expense.period}.`,
        now
      );
    } else if (status === 'Pendiente') {
      db.prepare(`
        INSERT INTO notifications (userId, title, text, read, createdAt)
        VALUES (?, ?, ?, 0, ?)
      `).run(
        expense.userId,
        'Aviso de expensas observado',
        `El aviso de pago para el periodo ${expense.period} fue desestimado o requiere verificación. Por favor comunicate con administración.`,
        now
      );
    }

    res.json({ message: `Estado de liquidación actualizado a "${status}".`, status });
  } catch (error) {
    console.error('[Update Expense Status Error]', error);
    res.status(500).json({ error: 'Error al actualizar estado de expensas.' });
  }
});

// POST /api/expenses/admin/emit
// Admin creates / emits new expense bills (massively to all active users or single resident)
router.post('/admin/emit', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { period, dueDate, amount, concept, target, userId } = req.body;

    if (!period || !dueDate || !amount) {
      return res.status(400).json({ error: 'Periodo, fecha de vencimiento y monto son obligatorios.' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'El monto ingresado debe ser mayor a 0.' });
    }

    const cleanPeriod = String(period).trim();
    const cleanDueDate = String(dueDate).trim();
    const cleanConcept = concept && String(concept).trim() ? String(concept).trim() : `Expensas ordinarias ${cleanPeriod}`;
    const now = new Date().toISOString();

    let targetUsers = [];

    if (target === 'single') {
      if (!userId) {
        return res.status(400).json({ error: 'Debes seleccionar un propietario.' });
      }
      const user = db.prepare('SELECT id, nombre, apellido, email, approved FROM users WHERE id = ?').get(userId);
      if (!user) {
        return res.status(404).json({ error: 'Propietario no encontrado.' });
      }
      if (!user.approved) {
        return res.status(400).json({ error: 'El propietario aún no ha sido aprobado.' });
      }
      targetUsers = [user];
    } else {
      // All active approved users
      targetUsers = db.prepare(`
        SELECT id, nombre, apellido, email
        FROM users
        WHERE approved = 1 AND role != 'admin'
      `).all();

      // If no normal users, also check for any approved users
      if (targetUsers.length === 0) {
        targetUsers = db.prepare(`SELECT id, nombre, apellido, email FROM users WHERE approved = 1`).all();
      }
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({ error: 'No se encontraron vecinos activos para emitir expensas.' });
    }

    const checkExistingStmt = db.prepare('SELECT id FROM expenses WHERE userId = ? AND period = ?');
    const insertStmt = db.prepare(`
      INSERT INTO expenses (userId, period, dueDate, amount, status, concept, createdAt)
      VALUES (?, ?, ?, ?, 'Pendiente', ?, ?)
    `);
    const notifStmt = db.prepare(`
      INSERT INTO notifications (userId, title, text, read, createdAt)
      VALUES (?, ?, ?, 0, ?)
    `);

    let createdCount = 0;
    let skippedCount = 0;

    for (const u of targetUsers) {
      const existing = checkExistingStmt.get(u.id, cleanPeriod);
      if (existing) {
        skippedCount++;
        continue;
      }

      insertStmt.run(u.id, cleanPeriod, cleanDueDate, numAmount, cleanConcept, now);
      notifStmt.run(
        u.id,
        'Nueva liquidación de expensas',
        `Se emitió la liquidación de expensas para ${cleanPeriod} por un total de $ ${numAmount.toLocaleString('es-AR')}. Vencimiento: ${cleanDueDate}.`,
        now
      );
      createdCount++;
    }

    // Broadcast admin notification
    if (createdCount > 0) {
      notifStmt.run(
        null,
        'Emisión de expensas realizada',
        `Se emitieron ${createdCount} liquidaciones de expensas correspondientes a ${cleanPeriod}.`,
        now
      );
    }

    res.status(201).json({
      message: `Emisión completada: ${createdCount} liquidación${createdCount === 1 ? '' : 'es'} emitida${createdCount === 1 ? '' : 's'}.${skippedCount > 0 ? ` (${skippedCount} ya existían para este periodo).` : ''}`,
      createdCount,
      skippedCount
    });
  } catch (error) {
    console.error('[Admin Emit Expenses Error]', error);
    res.status(500).json({ error: 'Error al emitir liquidación de expensas.' });
  }
});

// DELETE /api/expenses/admin/:id (Admin deletes an unpaid expense emitted by mistake)
router.delete('/admin/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const expenseId = Number(req.params.id);
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);

    if (!expense) {
      return res.status(404).json({ error: 'Liquidación no encontrada.' });
    }

    if (expense.status === 'Pagado') {
      return res.status(400).json({ error: 'No se puede eliminar una liquidación que ya fue acreditada como pagada.' });
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId);

    res.json({ message: `Liquidación del periodo ${expense.period} eliminada.` });
  } catch (error) {
    console.error('[Admin Delete Expense Error]', error);
    res.status(500).json({ error: 'Error al eliminar liquidación.' });
  }
});

module.exports = router;
