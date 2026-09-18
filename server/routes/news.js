const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware');

// GET /api/news
router.get('/', (req, res) => {
  try {
    const news = db.prepare(`
      SELECT id, title, category, date, status, description, image, createdAt
      FROM news
      ORDER BY date DESC, id DESC
    `).all();

    res.json(news);
  } catch (error) {
    console.error('[Get News Error]', error);
    res.status(500).json({ error: 'Error al consultar noticias.' });
  }
});

// POST /api/news (Admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, category, description, image, status } = req.body;

    if (!title || !category || !description) {
      return res.status(400).json({ error: 'Título, categoría y descripción son obligatorios.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO news (title, category, date, status, description, image, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      title.trim(),
      category.trim(),
      today,
      status ? status.trim() : 'Nueva',
      description.trim(),
      image ? image.trim() : './descarga.jfif',
      now
    );

    // Broadcast notification to all residents (community)
    db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, createdAt)
      VALUES (NULL, 'all', ?, ?, 0, ?)
    `).run(
      'Nueva noticia del predio',
      title.trim(),
      now
    );

    res.status(201).json({
      message: 'Noticia publicada con éxito.',
      id: Number(result.lastInsertRowid)
    });
  } catch (error) {
    console.error('[Create News Error]', error);
    res.status(500).json({ error: 'Error al crear noticia.' });
  }
});

// DELETE /api/news/:id (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const newsId = Number(req.params.id);
    db.prepare('DELETE FROM news WHERE id = ?').run(newsId);
    res.json({ message: 'Noticia eliminada.' });
  } catch (error) {
    console.error('[Delete News Error]', error);
    res.status(500).json({ error: 'Error al eliminar noticia.' });
  }
});

module.exports = router;
