const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_ranchodobles_portal_2026_auth_key';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación requerido.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Sesión inválida o expirada.' });
    }

    const stmt = db.prepare(`
      SELECT id, apellido, nombre, tipoDocumento, numeroDocumento, telefono, email, role, approved
      FROM users
      WHERE id = ?
    `);
    const user = stmt.get(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (!user.approved) {
      return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación.' });
    }

    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador.' });
  }
  next();
}

const rateLimit = require('express-rate-limit');

// Rate limiting for authentication routes: prevents brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Max 10 failed login attempts per IP
  skipSuccessfulRequests: true, // Don't count successful logins against limit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos fallidos de inicio de sesión. Por favor, intentá nuevamente en 15 minutos.'
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // Max 10 account registration attempts per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Se ha alcanzado el límite de solicitudes de registro desde esta conexión. Intentá más tarde.'
  }
});

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireAdmin,
  loginLimiter,
  registerLimiter
};
