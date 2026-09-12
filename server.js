require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

// Initialize database schema and seeds
require('./server/db');

const authRoutes = require('./server/routes/auth');
const adminRoutes = require('./server/routes/admin');
const bookingsRoutes = require('./server/routes/bookings');
const visitsRoutes = require('./server/routes/visits');
const newsRoutes = require('./server/routes/news');
const notificationsRoutes = require('./server/routes/notifications');
const expensesRoutes = require('./server/routes/expenses');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & utility middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname)));
app.use('/ranchos', express.static(path.join(__dirname)));

// API routes
const registerApi = (prefix = '') => {
  app.use(`${prefix}/api/auth`, authRoutes);
  app.use(`${prefix}/api/admin`, adminRoutes);
  app.use(`${prefix}/api/bookings`, bookingsRoutes);
  app.use(`${prefix}/api/visits`, visitsRoutes);
  app.use(`${prefix}/api/news`, newsRoutes);
  app.use(`${prefix}/api/notifications`, notificationsRoutes);
  app.use(`${prefix}/api/expenses`, expensesRoutes);
  app.get(`${prefix}/api/health`, (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });
};

registerApi('');
registerApi('/ranchos');

// Fallback for missing API endpoints
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/ranchos/api/')) {
    return res.status(404).json({ error: 'Endpoint de API no encontrado.' });
  }
  next();
});

// SPA fallback: send index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor.' });
});

let server = null;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` Rancho Doble S - Servidor en ejecución`);
    console.log(` URL Local: http://localhost:${PORT}`);
    console.log(` Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=========================================`);
  });
}

module.exports = app;
module.exports.app = app;
module.exports.server = server;
