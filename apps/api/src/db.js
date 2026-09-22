import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.resolve(__dirname, '../data/ikhlas.db');
export const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : defaultDbPath;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function insertSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO NOTHING
  `).run(key, String(value));
}

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

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transaction_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(type, name)
    );

    CREATE TABLE IF NOT EXISTS public_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL CHECK (kind IN ('VERSE', 'ANNOUNCEMENT', 'MESSAGE')),
      title TEXT,
      content TEXT NOT NULL,
      source TEXT,
      seed_key TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
      amount INTEGER NOT NULL CHECK (amount > 0),
      transaction_date TEXT NOT NULL,
      method TEXT NOT NULL CHECK (method IN ('CASH', 'TRANSFER')),
      category TEXT NOT NULL,
      category_id INTEGER,
      source_detail TEXT,
      description TEXT,
      evidence_path TEXT,
      bank_mutation_path TEXT,
      evidence_drive_file_id TEXT,
      evidence_original_name TEXT,
      evidence_mime_type TEXT,
      mutation_drive_file_id TEXT,
      mutation_original_name TEXT,
      mutation_mime_type TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES transaction_categories(id),
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

    CREATE TABLE IF NOT EXISTS friday_schedules (
      schedule_date TEXT PRIMARY KEY,
      imam TEXT,
      khatib TEXT,
      bilal TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prayer_time_cache (
      prayer_date TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      calculation_method INTEGER NOT NULL,
      timezone TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details_json TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_prayer_unique
      ON prayer_schedules(prayer_date, prayer_name);
    CREATE INDEX IF NOT EXISTS idx_transactions_date
      ON transactions(transaction_date DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_type
      ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category
      ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_categories_type
      ON transaction_categories(type, is_active, sort_order);
    CREATE INDEX IF NOT EXISTS idx_public_messages_active
      ON public_messages(is_active, sort_order);
    CREATE INDEX IF NOT EXISTS idx_prayer_schedule_date
      ON prayer_schedules(prayer_date, adhan_time);
    CREATE INDEX IF NOT EXISTS idx_friday_schedule_date
      ON friday_schedules(schedule_date);
    CREATE INDEX IF NOT EXISTS idx_prayer_cache_fetched
      ON prayer_time_cache(fetched_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activities_date
      ON activities(activity_date, start_time);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry
      ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_audit_created
      ON audit_logs(created_at DESC);
  `);

  ensureColumn('transactions', 'category_id', 'INTEGER');
  ensureColumn('transactions', 'source_detail', 'TEXT');
  ensureColumn('transactions', 'evidence_path', 'TEXT');
  ensureColumn('transactions', 'bank_mutation_path', 'TEXT');
  ensureColumn('transactions', 'evidence_drive_file_id', 'TEXT');
  ensureColumn('transactions', 'evidence_original_name', 'TEXT');
  ensureColumn('transactions', 'evidence_mime_type', 'TEXT');
  ensureColumn('transactions', 'mutation_drive_file_id', 'TEXT');
  ensureColumn('transactions', 'mutation_original_name', 'TEXT');
  ensureColumn('transactions', 'mutation_mime_type', 'TEXT');
  ensureColumn('transactions', 'created_by', 'INTEGER');
  ensureColumn('transactions', 'updated_at', 'TEXT');
  db.prepare(`
    UPDATE transactions
    SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
    WHERE updated_at IS NULL
  `).run();
  ensureColumn('activities', 'live_url', 'TEXT');
  ensureColumn('public_messages', 'seed_key', 'TEXT');
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_public_messages_seed_key
      ON public_messages(seed_key)
      WHERE seed_key IS NOT NULL
  `);
  ensureColumn('activities', 'is_published', 'INTEGER NOT NULL DEFAULT 1');

  seedIfEmpty();
}

function seedIfEmpty() {
  const roleCount = db.prepare('SELECT COUNT(*) AS count FROM roles').get().count;
  if (roleCount === 0) {
    const insertRole = db.prepare('INSERT INTO roles (name) VALUES (?)');
    insertRole.run('ADMIN');
    insertRole.run('TREASURER');
  }

  insertSetting('opening_balance', '12500000');
  insertSetting('opening_balance_date', '');
  insertSetting('opening_balance_note', 'Saldo awal sebelum pencatatan digital IKHLAS');
  insertSetting('mosque_name', 'Masjid Al-Ikhlas');
  insertSetting('mosque_tagline', 'Pusat Informasi Jamaah');
  insertSetting('bank_name', 'Bank Syariah Indonesia');
  insertSetting('bank_account_number', '71234567890');
  insertSetting('bank_account_holder', 'Masjid Al-Ikhlas');
  insertSetting('default_youtube_url', '');
  insertSetting('active_live_url', '');
  insertSetting('active_live_title', '');
  insertSetting('public_finance_period', 'MONTH');

  const categoryCount = db.prepare('SELECT COUNT(*) AS count FROM transaction_categories').get().count;
  if (categoryCount === 0) {
    const insertCategory = db.prepare(`
      INSERT INTO transaction_categories (type, name, sort_order)
      VALUES (?, ?, ?)
    `);

    const categories = [
      ['INCOME', 'Kotak Amal', 10],
      ['INCOME', 'Donasi Jamaah', 20],
      ['INCOME', 'Infaq Jumat', 30],
      ['INCOME', 'Donatur Tetap', 40],
      ['INCOME', 'Lainnya', 90],
      ['EXPENSE', 'Operasional', 10],
      ['EXPENSE', 'Kebersihan', 20],
      ['EXPENSE', 'Listrik & Air', 30],
      ['EXPENSE', 'Kegiatan Masjid', 40],
      ['EXPENSE', 'Perawatan', 50],
      ['EXPENSE', 'Lainnya', 90]
    ];

    db.transaction((items) => {
      for (const item of items) insertCategory.run(...item);
    })(categories);
  }

  db.prepare(`
    UPDATE transactions
    SET category_id = (
      SELECT transaction_categories.id
      FROM transaction_categories
      WHERE transaction_categories.type = transactions.type
        AND transaction_categories.name = transactions.category
      LIMIT 1
    )
    WHERE category_id IS NULL
  `).run();

  const publicMessageCount = db.prepare('SELECT COUNT(*) AS count FROM public_messages').get().count;
  if (publicMessageCount === 0) {
    db.prepare(`
      INSERT INTO public_messages (kind, title, content, source, sort_order)
      VALUES ('ANNOUNCEMENT', 'Pengingat Jamaah', ?, '', 90)
    `).run('Mari jaga kebersihan, ketertiban, dan kenyamanan masjid bersama.');
  }

  const insertSeedMessage = db.prepare(`
    INSERT OR IGNORE INTO public_messages
      (kind, title, content, source, seed_key, sort_order, is_active)
    VALUES
      ('VERSE', @title, @content, @source, @seedKey, @sortOrder, 1)
  `);

  const verifiedRunningTextSeeds = [
    {
      seedKey: 'quran-at-tawbah-9-18',
      title: 'Memakmurkan Masjid',
      content: 'Yang memakmurkan masjid-masjid Allah hanyalah orang-orang yang beriman kepada Allah dan hari akhir, mendirikan salat, dan menunaikan zakat.',
      source: 'QS. At-Taubah 9:18',
      sortOrder: 10
    },
    {
      seedKey: 'bukhari-527-prayer-on-time',
      title: 'Shalat Tepat Waktu',
      content: 'Amal yang paling dicintai Allah adalah shalat pada waktunya.',
      source: 'Sahih al-Bukhari 527',
      sortOrder: 20
    },
    {
      seedKey: 'bukhari-645-congregation',
      title: 'Keutamaan Shalat Berjamaah',
      content: 'Shalat berjamaah lebih utama dua puluh tujuh derajat daripada shalat sendirian.',
      source: 'Sahih al-Bukhari 645',
      sortOrder: 30
    },
    {
      seedKey: 'muslim-2588-charity',
      title: 'Sedekah',
      content: 'Sedekah tidak mengurangi harta.',
      source: 'Sahih Muslim 2588',
      sortOrder: 40
    },
    {
      seedKey: 'quran-al-baqarah-2-261',
      title: 'Keutamaan Infaq',
      content: 'Perumpamaan orang yang menginfakkan hartanya di jalan Allah seperti sebutir biji yang menumbuhkan tujuh tangkai.',
      source: 'QS. Al-Baqarah 2:261',
      sortOrder: 50
    }
  ];

  db.transaction((items) => {
    for (const item of items) insertSeedMessage.run(item);
  })(verifiedRunningTextSeeds);

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
        type: 'INCOME',
        amount: 2500000,
        transactionDate: '2026-09-21',
        method: 'TRANSFER',
        category: 'Donasi Jamaah',
        description: 'Transfer donatur'
      },
      {
        type: 'EXPENSE',
        amount: 850000,
        transactionDate: '2026-09-20',
        method: 'TRANSFER',
        category: 'Operasional',
        description: 'Pembayaran listrik dan air'
      },
      {
        type: 'INCOME',
        amount: 1350000,
        transactionDate: '2026-09-19',
        method: 'CASH',
        category: 'Kotak Amal',
        description: 'Rekap kotak amal Jumat'
      },
      {
        type: 'EXPENSE',
        amount: 425000,
        transactionDate: '2026-09-18',
        method: 'CASH',
        category: 'Kebersihan',
        description: 'Perlengkapan kebersihan masjid'
      }
    ];

    db.transaction((items) => {
      for (const item of items) insert.run(item);
    })(demo);
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

    db.transaction((items) => {
      for (const item of items) insertPrayer.run(...item);
    })(prayers);
  }

  const activityCount = db.prepare('SELECT COUNT(*) AS count FROM activities').get().count;
  if (activityCount === 0) {
    const insertActivity = db.prepare(`
      INSERT INTO activities
        (title, activity_date, start_time, location, speaker, is_published)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    insertActivity.run(
      "Kajian Ba'da Maghrib",
      '2026-09-21',
      '18:15',
      'Ruang Utama',
      'Ust. Hakim Pratama'
    );
    insertActivity.run(
      'Pengajian Rutin Ahad',
      '2026-09-27',
      '07:00',
      'Ruang Utama',
      'Ust. Fikri Anwar'
    );
  }
}

export function getOpeningBalance() {
  return Number(getSetting('opening_balance', '0'));
}

export function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value ?? fallback;
}

export function getSettings(keys) {
  if (!keys.length) return {};

  const placeholders = keys.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT key, value
    FROM settings
    WHERE key IN (${placeholders})
  `).all(...keys);

  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return Object.fromEntries(keys.map((key) => [key, values[key] ?? '']));
}
