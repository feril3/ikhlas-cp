import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.resolve(__dirname, '../data/ikhlas.db');
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : defaultDbPath;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
      amount INTEGER NOT NULL CHECK (amount > 0),
      transaction_date TEXT NOT NULL,
      method TEXT NOT NULL CHECK (method IN ('CASH', 'TRANSFER')),
      category TEXT NOT NULL,
      description TEXT,
      evidence_path TEXT,
      bank_mutation_path TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS prayer_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prayer_date TEXT NOT NULL,
      prayer_name TEXT NOT NULL,
      adhan_time TEXT NOT NULL,
      iqamah_time TEXT,
      imam TEXT,
      bilal TEXT
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      start_time TEXT,
      location TEXT,
      speaker TEXT,
      live_url TEXT,
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date
      ON transactions(transaction_date DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_type
      ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_prayer_schedule_date
      ON prayer_schedules(prayer_date, adhan_time);
    CREATE INDEX IF NOT EXISTS idx_activities_date
      ON activities(activity_date, start_time);
  `);

  seedIfEmpty();
}

function seedIfEmpty() {
  const roleCount = db.prepare('SELECT COUNT(*) AS count FROM roles').get().count;
  if (roleCount === 0) {
    const insertRole = db.prepare('INSERT INTO roles (name) VALUES (?)');
    insertRole.run('ADMIN');
    insertRole.run('TREASURER');
  }

  db.prepare(`
    INSERT INTO settings (key, value)
    VALUES ('opening_balance', '12500000')
    ON CONFLICT(key) DO NOTHING
  `).run();

  const transactionCount = db.prepare('SELECT COUNT(*) AS count FROM transactions').get().count;
  if (transactionCount === 0) {
    const insert = db.prepare(`
      INSERT INTO transactions
        (type, amount, transaction_date, method, category, description)
      VALUES
        (@type, @amount, @transactionDate, @method, @category, @description)
    `);

    const demo = [
      {
        type: 'INCOME', amount: 2500000, transactionDate: '2026-09-21',
        method: 'TRANSFER', category: 'Donasi Jamaah', description: 'Transfer donatur'
      },
      {
        type: 'EXPENSE', amount: 850000, transactionDate: '2026-09-20',
        method: 'TRANSFER', category: 'Operasional', description: 'Pembayaran listrik dan air'
      },
      {
        type: 'INCOME', amount: 1350000, transactionDate: '2026-09-19',
        method: 'CASH', category: 'Kotak Amal', description: 'Rekap kotak amal Jumat'
      },
      {
        type: 'EXPENSE', amount: 425000, transactionDate: '2026-09-18',
        method: 'CASH', category: 'Kebersihan', description: 'Perlengkapan kebersihan masjid'
      }
    ];

    const transaction = db.transaction((items) => {
      for (const item of items) insert.run(item);
    });
    transaction(demo);
  }

  const prayerCount = db.prepare('SELECT COUNT(*) AS count FROM prayer_schedules').get().count;
  if (prayerCount === 0) {
    const insertPrayer = db.prepare(`
      INSERT INTO prayer_schedules
        (prayer_date, prayer_name, adhan_time, iqamah_time, imam, bilal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const prayers = [
      ['2026-09-21', 'Subuh', '04:28', '04:38', 'Ust. Ahmad Fauzi', 'H. Rahmat'],
      ['2026-09-21', 'Dzuhur', '11:51', '12:01', 'Ust. Yusuf Karim', 'H. Fajar'],
      ['2026-09-21', 'Ashar', '15:05', '15:15', 'Ust. Ahmad Fauzi', 'H. Ridwan'],
      ['2026-09-21', 'Maghrib', '17:53', '18:03', 'Ust. Yusuf Karim', 'H. Rahmat'],
      ['2026-09-21', 'Isya', '19:01', '19:11', 'Ust. Ahmad Fauzi', 'H. Fajar']
    ];
    const transaction = db.transaction((items) => {
      for (const item of items) insertPrayer.run(...item);
    });
    transaction(prayers);
  }

  const activityCount = db.prepare('SELECT COUNT(*) AS count FROM activities').get().count;
  if (activityCount === 0) {
    const insertActivity = db.prepare(`
      INSERT INTO activities
        (title, activity_date, start_time, location, speaker, is_published)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    insertActivity.run('Kajian Ba\'da Maghrib', '2026-09-21', '18:15', 'Ruang Utama', 'Ust. Hakim Pratama');
    insertActivity.run('Pengajian Rutin Ahad', '2026-09-27', '07:00', 'Ruang Utama', 'Ust. Fikri Anwar');
  }
}

export function getOpeningBalance() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'opening_balance'").get();
  return Number(row?.value ?? 0);
}
