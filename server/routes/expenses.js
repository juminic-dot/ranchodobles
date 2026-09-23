const fs = require('fs');
const path = require('path');
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
      SELECT id, userId, period, dueDate, amount, status, concept, paymentReference, paidAt, receiptPath, receiptName, receiptMime, createdAt
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
             e.receiptPath, e.receiptName, e.receiptMime,
             u.nombre, u.apellido, u.email, u.numeroDocumento, u.lote, u.manzana
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

// POST /api/expenses/:id/pay (Resident reports payment with digital receipt; sets status to 'En revisión', Admin can directly accredit)
router.post('/:id/pay', authenticateToken, (req, res) => {
  try {
    const expenseId = Number(req.params.id);
    const { reference, receiptData, receiptName, receiptMime } = req.body || {};
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

    let savedReceiptPath = expense.receiptPath || null;
    let savedReceiptName = expense.receiptName || null;
    let savedReceiptMime = expense.receiptMime || null;

    if (receiptData && typeof receiptData === 'string' && receiptData.includes(';base64,')) {
      const parts = receiptData.split(';base64,');
      const mimeMatch = parts[0].match(/^data:(.+)$/);
      const mimeType = receiptMime || (mimeMatch ? mimeMatch[1] : 'application/octet-stream');
      const base64Content = parts[1];
      const buffer = Buffer.from(base64Content, 'base64');

      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: 'El archivo del comprobante no puede superar los 10 MB.' });
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
      if (!allowedMimes.includes(mimeType.toLowerCase())) {
        return res.status(400).json({ error: 'Formato no permitido. Solo se aceptan imágenes (JPG, PNG, WEBP) o documentos PDF.' });
      }

      const ext = path.extname(receiptName || '').toLowerCase() || (mimeType.includes('pdf') ? '.pdf' : '.jpg');
      const safeFilename = `recibo_${expenseId}_${Date.now()}${ext}`;
      const receiptsDir = path.join(__dirname, '..', '..', 'data', 'receipts');
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }

      const filePath = path.join(receiptsDir, safeFilename);
      fs.writeFileSync(filePath, buffer);

      // Clean up previous receipt file if replaced
      if (expense.receiptPath && expense.receiptPath !== safeFilename) {
        try {
          const oldPath = path.join(receiptsDir, expense.receiptPath);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (e) {}
      }

      savedReceiptPath = safeFilename;
      savedReceiptName = (receiptName && String(receiptName).slice(0, 100)) || safeFilename;
      savedReceiptMime = mimeType;
    }

    if (isAdmin) {
      // Admin directly accredits payment
      db.prepare(`
        UPDATE expenses
        SET status = 'Pagado',
            paymentReference = COALESCE(?, paymentReference),
            receiptPath = COALESCE(?, receiptPath),
            receiptName = COALESCE(?, receiptName),
            receiptMime = COALESCE(?, receiptMime),
            paidAt = ?
        WHERE id = ?
      `).run(cleanRef, savedReceiptPath, savedReceiptName, savedReceiptMime, now, expenseId);

      // Notify resident
      db.prepare(`
        INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
        VALUES (?, 'user', ?, ?, 0, ?)
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
      SET status = 'En revisión',
          paymentReference = ?,
          receiptPath = ?,
          receiptName = ?,
          receiptMime = ?,
          paidAt = ?
      WHERE id = ?
    `).run(
      cleanRef || (savedReceiptPath ? 'Comprobante digital adjunto' : 'Informado por portal'),
      savedReceiptPath,
      savedReceiptName,
      savedReceiptMime,
      now,
      expenseId
    );

    // Notify resident (personal)
    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (?, 'user', ?, ?, 0, ?)
    `).run(
      req.user.id,
      'Aviso de pago de expensas',
      `Tu aviso de pago para el periodo ${expense.period} fue registrado${savedReceiptPath ? ' con comprobante digital' : ''} y está en revisión por la administración.`,
      now
    );

    // Notify admin (exclusively for administrators)
    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (NULL, 'admin', ?, ?, 0, ?)
    `).run(
      'Nuevo aviso de pago de expensas',
      `${req.user.nombre} ${req.user.apellido} informó el pago de expensas del periodo ${expense.period}${cleanRef ? ` (${cleanRef})` : ''}${savedReceiptPath ? ' con comprobante digital adjunto' : ''}.`,
      now
    );

    res.json({
      message: 'Aviso de pago y comprobante enviados. Se encuentra en revisión por la administración.',
      status: 'En revisión',
      receiptPath: savedReceiptPath,
      receiptName: savedReceiptName
    });
  } catch (error) {
    console.error('[Pay Expense Error]', error);
    res.status(500).json({ error: 'Error al registrar aviso de pago.' });
  }
});

// GET /api/expenses/:id/receipt (Serves receipt image or PDF with authentication)
router.get('/:id/receipt', authenticateToken, (req, res) => {
  try {
    const expenseId = Number(req.params.id);
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);

    if (!expense) {
      return res.status(404).json({ error: 'Liquidación de expensas no encontrada.' });
    }

    const isAdmin = req.user.role === 'admin';
    if (expense.userId !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: 'No tenés permisos para visualizar este comprobante.' });
    }

    if (!expense.receiptPath) {
      return res.status(404).json({ error: 'No hay comprobante digital adjunto para esta liquidación.' });
    }

    const receiptsDir = path.join(__dirname, '..', '..', 'data', 'receipts');
    const filePath = path.join(receiptsDir, expense.receiptPath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'El archivo físico del comprobante no fue encontrado en el servidor.' });
    }

    const mime = expense.receiptMime || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const download = req.query.download === '1' || req.query.download === 'true';
    const disposition = download ? 'attachment' : 'inline';
    const filename = expense.receiptName || expense.receiptPath;

    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(filename)}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('[Get Receipt Error]', error);
    res.status(500).json({ error: 'Error al obtener el comprobante de pago.' });
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
        INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
        VALUES (?, 'user', ?, ?, 0, ?)
      `).run(
        expense.userId,
        '¡Pago de expensas confirmado!',
        `La administración confirmó la recepción del pago de tus expensas del periodo ${expense.period}.`,
        now
      );
    } else if (status === 'Pendiente') {
      db.prepare(`
        INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
        VALUES (?, 'user', ?, ?, 0, ?)
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
      const user = db.prepare('SELECT id, nombre, apellido, email, approved, role FROM users WHERE id = ?').get(userId);
      if (!user) {
        return res.status(404).json({ error: 'Propietario no encontrado.' });
      }
      if (user.role !== 'user') {
        return res.status(400).json({ error: 'Solo se pueden emitir expensas a vecinos/propietarios.' });
      }
      if (!user.approved) {
        return res.status(400).json({ error: 'El propietario aún no ha sido aprobado.' });
      }
      targetUsers = [user];
    } else {
      // All active approved residents only (never guards or admins)
      targetUsers = db.prepare(`
        SELECT id, nombre, apellido, email
        FROM users
        WHERE approved = 1 AND role = 'user'
      `).all();
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({ error: 'No se encontraron vecinos activos para emitir expensas.' });
    }

    const checkExistingStmt = db.prepare('SELECT id FROM expenses WHERE userId = ? AND period = ?');
    const insertStmt = db.prepare(`
      INSERT INTO expenses (userId, period, dueDate, amount, status, concept, createdAt)
      VALUES (?, ?, ?, ?, 'Pendiente', ?, ?)
    `);
    const residentNotifStmt = db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (?, 'user', ?, ?, 0, ?)
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
      // Strictly personal notification for this neighbor only
      residentNotifStmt.run(
        u.id,
        'Nueva liquidación de expensas',
        `Se emitió la liquidación de expensas para ${cleanPeriod} por un total de $ ${numAmount.toLocaleString('es-AR')}. Vencimiento: ${cleanDueDate}.`,
        now
      );
      createdCount++;
    }

    // Admin-only notification summary (strictly targetRole = 'admin', userId = req.user.id)
    if (createdCount > 0) {
      db.prepare(`
        INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
        VALUES (?, 'admin', ?, ?, 0, ?)
      `).run(
        req.user.id,
        'Emisión de expensas realizada',
        `Se emitieron ${createdCount} liquidaciones de expensas correspondientes a ${cleanPeriod}.`,
        now
      );

      // Audit log
      if (typeof db.logActivity === 'function') {
        db.logActivity(
          req.user.id,
          `${req.user.nombre} ${req.user.apellido} (${req.user.username || req.user.email})`,
          req.user.role,
          'EMISION_EXPENSAS',
          `Emisión de ${createdCount} liquidaciones para periodo ${cleanPeriod} por $ ${numAmount.toLocaleString('es-AR')}`,
          req.ip || ''
        );
      }
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

    if (expense.receiptPath) {
      try {
        const receiptsDir = path.join(__dirname, '..', '..', 'data', 'receipts');
        const filePath = path.join(receiptsDir, expense.receiptPath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('[Delete Expense Receipt Warning]', e);
      }
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId);

    res.json({ message: `Liquidación del periodo ${expense.period} eliminada.` });
  } catch (error) {
    console.error('[Admin Delete Expense Error]', error);
    res.status(500).json({ error: 'Error al eliminar liquidación.' });
  }
});

module.exports = router;
