const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'ranchodobles.sqlite');
const db = new DatabaseSync(dbPath);

// Configuration for performance & integrity
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    apellido TEXT NOT NULL,
    nombre TEXT NOT NULL,
    tipoDocumento TEXT NOT NULL,
    numeroDocumento TEXT NOT NULL,
    telefono TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    passwordHash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    approved INTEGER DEFAULT 0,
    username TEXT,
    lote TEXT,
    manzana TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    slot TEXT NOT NULL,
    userId INTEGER NOT NULL,
    userName TEXT NOT NULL,
    userEmail TEXT NOT NULL,
    isBlocked INTEGER DEFAULT 0,
    blockReason TEXT,
    createdAt TEXT NOT NULL,
    UNIQUE(date, slot)
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    residentName TEXT NOT NULL,
    visitorName TEXT NOT NULL,
    visitorDni TEXT NOT NULL,
    vehiclePlate TEXT,
    guestEmail TEXT,
    qrCode TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'Pendiente',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'Publicado',
    description TEXT NOT NULL,
    image TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    targetRole TEXT DEFAULT 'user',
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notification_reads (
    notificationId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    readAt TEXT NOT NULL,
    PRIMARY KEY (notificationId, userId)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    period TEXT NOT NULL,
    dueDate TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'Pendiente',
    concept TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    hostId INTEGER NOT NULL,
    hostName TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expiresAt TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    userName TEXT NOT NULL,
    userRole TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guard_notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    residentName TEXT NOT NULL,
    lote TEXT,
    manzana TEXT,
    category TEXT NOT NULL,
    company TEXT,
    timeEstimated TEXT,
    details TEXT NOT NULL,
    status TEXT DEFAULT 'Pendiente',
    response TEXT,
    resolvedAt TEXT,
    resolvedBy TEXT,
    createdAt TEXT NOT NULL
  );
`);

// Migrations for existing databases
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      userName TEXT NOT NULL,
      userRole TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip TEXT,
      createdAt TEXT NOT NULL
    );
  `);
} catch (e) {}
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guard_notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      residentName TEXT NOT NULL,
      lote TEXT,
      manzana TEXT,
      category TEXT NOT NULL,
      company TEXT,
      timeEstimated TEXT,
      details TEXT NOT NULL,
      status TEXT DEFAULT 'Pendiente',
      response TEXT,
      resolvedAt TEXT,
      resolvedBy TEXT,
      createdAt TEXT NOT NULL
    );
  `);
} catch (e) {}
try { db.exec("ALTER TABLE visits ADD COLUMN vehiclePlate TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE visits ADD COLUMN guestEmail TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE visits ADD COLUMN qrCode TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE visits ADD COLUMN entryAt TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE visits ADD COLUMN exitAt TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE expenses ADD COLUMN paymentReference TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE expenses ADD COLUMN paidAt TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE expenses ADD COLUMN receiptPath TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE expenses ADD COLUMN receiptName TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE expenses ADD COLUMN receiptMime TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN username TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN lote TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN manzana TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN isBlocked INTEGER DEFAULT 0;"); } catch (e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN blockReason TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE notifications ADD COLUMN targetRole TEXT DEFAULT 'user';"); } catch (e) {}
try { db.exec("ALTER TABLE notifications ADD COLUMN senderId INTEGER;"); } catch (e) {}
try { db.exec("ALTER TABLE notifications ADD COLUMN senderName TEXT;"); } catch (e) {}

// Retroactively classify legacy notifications (only if targetRole is NULL)
try {
  db.exec(`
    UPDATE notifications
    SET targetRole = 'admin'
    WHERE targetRole IS NULL
      AND (title LIKE '%aviso de pago%'
       OR title LIKE '%solicitud%'
       OR title LIKE '%nuevo registro%');

    UPDATE notifications
    SET targetRole = 'user'
    WHERE targetRole IS NULL AND userId IS NOT NULL;

    UPDATE notifications
    SET targetRole = 'all'
    WHERE targetRole IS NULL AND userId IS NULL;

    -- Fix any notices incorrectly broadcasted to 'all' that were meant for guardia
    UPDATE notifications
    SET targetRole = 'guardia'
    WHERE title LIKE 'Aviso de vecino%' AND (targetRole = 'all' OR targetRole IS NULL);

    -- Fix any personal expense notifications for residents that were marked as admin
    UPDATE notifications
    SET targetRole = 'user'
    WHERE title = 'Nueva liquidación de expensas' AND userId IS NOT NULL AND targetRole != 'user';

    -- Fix any old expense emission summary notifications incorrectly set to 'all'
    UPDATE notifications
    SET targetRole = 'admin'
    WHERE title = 'Emisión de expensas realizada' AND targetRole = 'all';
  `);
} catch (e) {}

const receiptsDir = path.join(dataDir, 'receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

function seedDatabase() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM news');
  const newsCount = countStmt.get().count;

  if (newsCount === 0) {
    console.log('[DB] Seeding initial news records...');
    const now = new Date().toISOString();

    // Initial news
    const insertNews = db.prepare(`
      INSERT INTO news (title, category, date, status, description, image, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertNews.run(
      'Inauguración de la nueva cancha de voley del predio!! Los esperamos con las reservas.',
      'Infraestructura',
      '2026-09-12',
      'Nueva',
      'La inauguración de la nueva cancha de voley del predio!! Los esperamos con las reservas.',
      'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80',
      now
    );

    insertNews.run(
      'Se terminó la obra de iluminación del ingreso por Solís.',
      'Seguridad',
      '2026-09-11',
      'Actualizado',
      'Quedó finalizada la obra de iluminación del ingreso por Solís, mejorando la visibilidad y la seguridad del acceso al predio.',
      './descarga.jfif',
      now
    );
  }
}

function ensureOfficialUsers() {
  try {
    const saltRounds = 10;
    const defaultHash = bcrypt.hashSync('vecinos2026', saltRounds);
    const now = new Date().toISOString();

    // 1. Delete all users that are NOT the official 3
    const usersToDelete = db.prepare(`
      SELECT id FROM users
      WHERE LOWER(email) NOT IN ('admin@admin', 'jorgecabral@guardia', 'jorgesuarez@ranchodobles.com')
        AND LOWER(COALESCE(username, '')) NOT IN ('admin@admin', 'admin', 'l2m2', 'jorgecabral@guardia')
    `).all();

    if (usersToDelete.length > 0) {
      for (const u of usersToDelete) {
        db.prepare('DELETE FROM users WHERE id = ?').run(u.id);
        db.prepare('DELETE FROM visits WHERE userId = ?').run(u.id);
        db.prepare('DELETE FROM expenses WHERE userId = ?').run(u.id);
        db.prepare('DELETE FROM bookings WHERE userId = ?').run(u.id);
        db.prepare('DELETE FROM invites WHERE hostId = ?').run(u.id);
        db.prepare('DELETE FROM password_resets WHERE userId = ?').run(u.id);
      }
      console.log(`[DB] Se eliminaron ${usersToDelete.length} usuarios anteriores.`);
    }

    // 2. Ensure Admin: admin@admin (Password: vecinos2026)
    const admin = db.prepare("SELECT id FROM users WHERE LOWER(email) = 'admin@admin' OR LOWER(username) = 'admin@admin' OR LOWER(username) = 'admin'").get();
    if (!admin) {
      db.prepare(`
        INSERT INTO users (apellido, nombre, tipoDocumento, numeroDocumento, telefono, email, username, lote, manzana, passwordHash, role, approved, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).run('Admin', 'Administrador', 'DNI', '00000000', '1100000000', 'admin@admin', 'admin@admin', null, null, defaultHash, 'admin', now);
      console.log('[DB] Usuario Administrador oficial creado: admin@admin');
    } else {
      db.prepare("UPDATE users SET email = 'admin@admin', username = 'admin@admin', passwordHash = ?, role = 'admin', approved = 1 WHERE id = ?").run(defaultHash, admin.id);
    }

    // 3. Ensure Vecino: Jorge Suarez (Usuario: l2m2, Password: vecinos2026)
    const vecino = db.prepare("SELECT id FROM users WHERE LOWER(username) = 'l2m2' OR LOWER(email) = 'jorgesuarez@ranchodobles.com'").get();
    let vecinoId;
    if (!vecino) {
      const res = db.prepare(`
        INSERT INTO users (apellido, nombre, tipoDocumento, numeroDocumento, telefono, email, username, lote, manzana, passwordHash, role, approved, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).run('Suarez', 'Jorge', 'DNI', '30123456', '1122334455', 'jorgesuarez@ranchodobles.com', 'l2m2', '2', '2', defaultHash, 'user', now);
      vecinoId = Number(res.lastInsertRowid);
      console.log('[DB] Usuario Vecino oficial creado: Jorge Suarez (l2m2)');

      // Seed initial sample expenses for Jorge Suarez
      const insertExp = db.prepare(`
        INSERT INTO expenses (userId, period, dueDate, amount, status, concept, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertExp.run(vecinoId, 'Julio 2026', '2026-07-15', 138000, 'Pagado', 'Expensas ordinarias', now);
      insertExp.run(vecinoId, 'Agosto 2026', '2026-08-15', 138000, 'Pagado', 'Expensas ordinarias + seguridad', now);
      insertExp.run(vecinoId, 'Septiembre 2026', '2026-09-15', 145000, 'Pendiente', 'Expensas ordinarias + mantenimiento predio', now);

      // Seed initial sample visits for Jorge Suarez
      const insertVisit = db.prepare(`
        INSERT INTO visits (userId, residentName, visitorName, visitorDni, vehiclePlate, date, time, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertVisit.run(vecinoId, 'Jorge Suarez (L2M2)', 'Carlos Gómez', '28555444', 'AD 111 BC', '2026-09-22', '15:00', 'Confirmada', now);
      insertVisit.run(vecinoId, 'Jorge Suarez (L2M2)', 'Mariana Pérez', '34222111', 'AF 234 CD', '2026-09-22', '18:30', 'Ingresado', now);
    } else {
      vecinoId = vecino.id;
      db.prepare("UPDATE users SET nombre = 'Jorge', apellido = 'Suarez', email = 'jorgesuarez@ranchodobles.com', username = 'l2m2', lote = '2', manzana = '2', passwordHash = ?, role = 'user', approved = 1 WHERE id = ?").run(defaultHash, vecinoId);
    }

    // 4. Ensure Guardia: Jorge Cabral (Usuario: jorgecabral@guardia, Password: vecinos2026)
    const guard = db.prepare("SELECT id FROM users WHERE LOWER(email) = 'jorgecabral@guardia' OR LOWER(username) = 'jorgecabral@guardia'").get();
    if (!guard) {
      db.prepare(`
        INSERT INTO users (apellido, nombre, tipoDocumento, numeroDocumento, telefono, email, username, lote, manzana, passwordHash, role, approved, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).run('Cabral', 'Jorge', 'DNI', '32999888', '1133445566', 'jorgecabral@guardia', 'jorgecabral@guardia', null, null, defaultHash, 'guardia', now);
      console.log('[DB] Usuario Guardia oficial creado: Jorge Cabral (jorgecabral@guardia)');
    } else {
      db.prepare("UPDATE users SET nombre = 'Jorge', apellido = 'Cabral', email = 'jorgecabral@guardia', username = 'jorgecabral@guardia', passwordHash = ?, role = 'guardia', approved = 1 WHERE id = ?").run(defaultHash, guard.id);
    }
  } catch (err) {
    console.error('[DB ensureOfficialUsers Error]', err);
  }
}

seedDatabase();
ensureOfficialUsers();

function logActivity(userId, userName, userRole, action, details = '', ip = '') {
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO activity_logs (userId, userName, userRole, action, details, ip, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, userName || 'Usuario', userRole || 'user', action, details, ip, now);
  } catch (err) {
    console.error('[DB logActivity Error]', err);
  }
}

module.exports = db;
module.exports.db = db;
module.exports.logActivity = logActivity;
