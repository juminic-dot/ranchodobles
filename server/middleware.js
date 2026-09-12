const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_ranchodobles_portal_2026_auth_key';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

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

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireAdmin
};
