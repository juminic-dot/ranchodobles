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
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Defense-in-depth: block any access to sensitive files or internal directories
app.use((req, res, next) => {
  const reqPath = decodeURI(req.path).toLowerCase();
  if (
    reqPath.includes('/.') ||
    reqPath.startsWith('/data') ||
    reqPath.startsWith('/ranchos/data') ||
    reqPath.startsWith('/server') ||
    reqPath.startsWith('/ranchos/server') ||
    reqPath.includes('package.json') ||
    reqPath.includes('package-lock.json') ||
    reqPath.includes('node_modules')
  ) {
    return res.status(403).json({ error: 'Acceso denegado.' });
  }
  next();
});

// Serve static frontend assets safely (only assets folder, no root exposure)
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/ranchos/assets', express.static(path.join(__dirname, 'assets')));

// Serve specific public assets
app.get(['/descarga.jfif', '/ranchos/descarga.jfif'], (req, res) => {
  res.sendFile(path.join(__dirname, 'descarga.jfif'));
});

// Guest invite page
app.get(['/invitacion.html', '/ranchos/invitacion.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'invitacion.html'));
});

// Short invite link redirect: /i/:code -> /invitacion.html?c=:code
app.get(['/i/:code', '/ranchos/i/:code'], (req, res) => {
  const code = encodeURIComponent(req.params.code);
  const prefix = req.path.startsWith('/ranchos') ? '/ranchos' : '';
  res.redirect(`${prefix}/invitacion.html?c=${code}`);
});

// Home / Main portal entrypoint
app.get(['/', '/ranchos', '/index.html', '/ranchos/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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

// SPA fallback: send index.html only for HTML GET navigation requests
app.use((req, res) => {
  if (req.method === 'GET' && req.accepts('html')) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  res.status(404).json({ error: 'Recurso no encontrado.' });
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
