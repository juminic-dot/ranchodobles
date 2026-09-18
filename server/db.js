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
`);

// Migrations for existing databases
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

const receiptsDir = path.join(dataDir, 'receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

// Populate default username / lotes for existing seed users if empty
try {
  const admin = db.prepare('SELECT id, username FROM users WHERE id = 1').get();
  if (admin && (!admin.username || admin.username !== 'SuperAdmin')) {
    const adminPass = bcrypt.hashSync('AdminGTC123', 10);
    db.prepare("UPDATE users SET username = 'SuperAdmin', passwordHash = ? WHERE id = 1").run(adminPass);
  }
  db.prepare("UPDATE users SET lote = '9', manzana = '2', username = 'L9M2' WHERE id = 2 AND (username IS NULL OR username = '')").run();
  db.prepare("UPDATE users SET lote = '14', manzana = '1', username = 'L14M1' WHERE id = 3 AND (username IS NULL OR username = '')").run();
} catch (e) {}

function seedDatabase() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = countStmt.get().count;

  if (userCount === 0) {
    console.log('[DB] Seeding initial database records...');
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (apellido, nombre, tipoDocumento, numeroDocumento, telefono, email, username, lote, manzana, passwordHash, role, approved, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Hashing passwords securely
    const saltRounds = 10;
    const adminHash = bcrypt.hashSync('AdminGTC123', saltRounds);
    const userHash = bcrypt.hashSync('123456', saltRounds);

    insertUser.run('Administrador', 'Admin', 'DNI', '00000000', '1100000000', 'admin@ranchodobles.com', 'SuperAdmin', null, null, adminHash, 'admin', 1, now);
    insertUser.run('Sánchez', 'Lucía', 'DNI', '30123456', '1123456789', 'lucia@ranchodobles.com', 'L9M2', '9', '2', userHash, 'user', 1, now);
    insertUser.run('García', 'Nicolás', 'DNI', '40222333', '1166677788', 'nicolas@gmail.com', 'L14M1', '14', '1', userHash, 'user', 1, now);
    insertUser.run('Gómez', 'Roberto', 'DNI', '35999888', '1144445555', 'roberto@gmail.com', 'L20M4', '20', '4', userHash, 'user', 0, now);

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

    // Initial visits
    const insertVisit = db.prepare(`
      INSERT INTO visits (userId, residentName, visitorName, visitorDni, date, time, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertVisit.run(2, 'Lucía Sánchez', 'María López', '24.222.333', '2026-09-12', '18:30', 'Confirmada', now);
    insertVisit.run(2, 'Lucía Sánchez', 'José Martínez', '28.556.441', '2026-09-15', '12:00', 'Pendiente', now);

    // Initial notifications
    const insertNotif = db.prepare(`
      INSERT INTO notifications (userId, title, text, read, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertNotif.run(null, 'Mantenimiento programado', 'Se realizará mantenimiento del portón principal el viernes a las 10:00 hs.', 0, now);
    insertNotif.run(2, 'Reserva confirmada', 'Tu reserva de cancha para tenis fue confirmada.', 0, now);
    insertNotif.run(null, 'Novedad de administración', 'La reunión vecinal se realizará este miércoles a las 20:00 hs.', 1, now);
    insertNotif.run(1, 'Nueva solicitud de registro pendiente', 'Roberto Gómez solicitó acceso al portal.', 0, now);

    console.log('[DB] Seeding completed.');
  }

  // Check if expenses need seeding
  const expensesCount = db.prepare('SELECT COUNT(*) as count FROM expenses').get().count;
  if (expensesCount === 0) {
    const now = new Date().toISOString();
    const insertExp = db.prepare(`
      INSERT INTO expenses (userId, period, dueDate, amount, status, concept, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Expenses for Lucia (id 2)
    insertExp.run(2, 'Julio 2026', '2026-07-15', 138000, 'Pagado', 'Expensas ordinarias', now);
    insertExp.run(2, 'Agosto 2026', '2026-08-15', 138000, 'Pagado', 'Expensas ordinarias + seguridad', now);
    insertExp.run(2, 'Septiembre 2026', '2026-09-15', 145000, 'Pendiente', 'Expensas ordinarias + mantenimiento predio', now);

    // Expenses for Nicolas (id 3)
    insertExp.run(3, 'Agosto 2026', '2026-08-15', 138000, 'Pagado', 'Expensas ordinarias + seguridad', now);
    insertExp.run(3, 'Septiembre 2026', '2026-09-15', 145000, 'Pagado', 'Expensas ordinarias + mantenimiento predio', now);
  }
}

seedDatabase();

module.exports = db;
