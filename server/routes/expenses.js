const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware');

const bankInfo = {
  banco: 'Banco Galicia',
  titular: 'Consorcio Rancho Doble S',
  cuit: '30-71234567-8',
  alias: 'RANCHO.DOBLE.S',
  cbu: '0070123420000012345678'
};

// GET /api/expenses
router.get('/', authenticateToken, (req, res) => {
  try {
    const expenses = db.prepare(`
      SELECT id, userId, period, dueDate, amount, status, concept, createdAt
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

// POST /api/expenses/:id/pay
router.post('/:id/pay', authenticateToken, (req, res) => {
  try {
    const expenseId = Number(req.params.id);
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);

    if (!expense) {
      return res.status(404).json({ error: 'Comprobante no encontrado.' });
    }

    if (expense.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No tenés permisos para esta liquidación.' });
    }

    db.prepare("UPDATE expenses SET status = 'Pagado' WHERE id = ?").run(expenseId);

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO notifications (userId, title, text, read, createdAt)
      VALUES (?, ?, ?, 0, ?)
    `).run(
      req.user.id,
      'Pago de expensas registrado',
      `El pago de las expensas del periodo ${expense.period} fue registrado correctamente.`,
      now
    );

    res.json({ message: 'Pago registrado con éxito.' });
  } catch (error) {
    console.error('[Pay Expense Error]', error);
    res.status(500).json({ error: 'Error al registrar pago.' });
  }
});

module.exports = router;
