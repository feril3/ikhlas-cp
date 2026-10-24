import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Basis data memakai libSQL: Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN) di produksi,
// atau berkas SQLite lokal (DATABASE_PATH) untuk pengembangan dan pengujian.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.resolve(__dirname, '../data/ikhlas.db');
export const usingTurso = Boolean(process.env.TURSO_DATABASE_URL?.trim());
export const dbPath = usingTurso
  ? null
  : process.env.DATABASE_PATH
    ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : defaultDbPath;

if (dbPath) fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const { createClient } = usingTurso
  ? await import('@libsql/client/web')
  : await import('@libsql/client');

const client = createClient(usingTurso
  ? { url: process.env.TURSO_DATABASE_URL.trim(), authToken: process.env.TURSO_AUTH_TOKEN?.trim() }
  : { url: pathToFileURL(dbPath).href });

// Data contoh hanya untuk pengembangan lokal; tidak pernah diisi ke basis data produksi.
const seedDemoData = process.env.SEED_DEMO_DATA
  ? process.env.SEED_DEMO_DATA === 'true'
  : !usingTurso && !process.env.VERCEL;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Uint8Array);
}

function toValue(value) {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

// Parameter bernama (@nama) diubah menjadi posisional agar perilakunya sama di berkas lokal dan Turso.
function toStatement(sql, params) {
  if (params.length === 1 && isPlainObject(params[0])) {
    const named = params[0];
    const args = [];
    const positional = sql.replace(/[@:$]([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => {
      args.push(toValue(named[name]));
      return '?';
    });
    return { sql: positional, args };
  }
  return { sql, args: params.map(toValue) };
}

function toRows(result) {
  return result.rows.map((row) => Object.fromEntries(result.columns.map((column, index) => [column, row[index]])));
}

// Antarmuka mirip better-sqlite3 (prepare().get/all/run), tetapi asinkron.
function createExecutor(target) {
  return {
    prepare(sql) {
      return {
        async get(...params) {
          return toRows(await target.execute(toStatement(sql, params)))[0];
        },
        async all(...params) {
          return toRows(await target.execute(toStatement(sql, params)));
        },
        async run(...params) {
          const result = await target.execute(toStatement(sql, params));
          return {
            changes: result.rowsAffected,
            lastInsertRowid: result.lastInsertRowid === undefined ? undefined : Number(result.lastInsertRowid)
          };
        }
      };
    },
    async exec(sql) {
      await target.executeMultiple(sql);
    }
  };
}

export const db = {
  ...createExecutor(client),
  // Transaksi tulis atomik; callback menerima executor transaksi (tx.prepare(...)).
  async transaction(callback) {
    const tx = await client.transaction('write');
    try {
      const result = await callback(createExecutor(tx));
      await tx.commit();
      return result;
    } catch (error) {
      try { await tx.rollback(); } catch { /* transaksi sudah tertutup */ }
      throw error;
    } finally {
      tx.close();
    }
  },
  close() {
    client.close();
  }
};

// Salinan seluruh tabel (kecuali sesi login) dalam format JSON untuk backup.
export async function exportDatabaseSnapshot() {
  const tables = await db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('sessions', 'libsql_wasm_func_table')
    ORDER BY name
  `).all();
  const snapshot = { format: 'ikhlas-json-backup', exportedAt: new Date().toISOString(), tables: {} };
  for (const { name } of tables) {
    snapshot.tables[name] = await db.prepare(`SELECT * FROM "${name}"`).all();
  }
  return snapshot;
}

const SCHEMA_VERSION = '2026-10-24';
let readyPromise = null;

// Inisialisasi skema cukup sekali per instance (penting untuk serverless).
export function ensureDatabase() {
  if (!readyPromise) {
    readyPromise = initializeDatabase().catch((error) => {
      readyPromise = null;
      throw error;
    });
  }
  return readyPromise;
}

async function ensureColumn(table, column, definition) {
  const columns = await db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function insertSetting(key, value) {
  await db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO NOTHING
  `).run(key, String(value));
}

export async function initializeDatabase() {
  try {
    const current = await db.prepare("SELECT value FROM settings WHERE key = 'schema_version'").get();
    if (current?.value === SCHEMA_VERSION) return;
  } catch {
    // tabel settings belum ada: lanjutkan pembuatan skema
  }

  await db.exec(`
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

    CREATE TABLE IF NOT EXISTS transaction_approval_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
      transaction_id INTEGER,
      status TEXT NOT NULL DEFAULT 'PENDING_REVIEW'
        CHECK (status IN ('PENDING_REVIEW', 'REVISION_REQUIRED', 'APPROVED')),
      payload_json TEXT NOT NULL,
      submitted_by INTEGER NOT NULL,
      reviewed_by INTEGER,
      review_note TEXT,
      submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
      FOREIGN KEY (submitted_by) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
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
    CREATE INDEX IF NOT EXISTS idx_transaction_approval_status
      ON transaction_approval_requests(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transaction_approval_submitter
      ON transaction_approval_requests(submitted_by, updated_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_approval_active_target
      ON transaction_approval_requests(transaction_id)
      WHERE transaction_id IS NOT NULL
        AND status IN ('PENDING_REVIEW', 'REVISION_REQUIRED');
  `);

  await ensureColumn('transactions', 'category_id', 'INTEGER');
  await ensureColumn('transactions', 'source_detail', 'TEXT');
  await ensureColumn('transactions', 'evidence_path', 'TEXT');
  await ensureColumn('transactions', 'bank_mutation_path', 'TEXT');
  await ensureColumn('transactions', 'evidence_drive_file_id', 'TEXT');
  await ensureColumn('transactions', 'evidence_original_name', 'TEXT');
  await ensureColumn('transactions', 'evidence_mime_type', 'TEXT');
  await ensureColumn('transactions', 'mutation_drive_file_id', 'TEXT');
  await ensureColumn('transactions', 'mutation_original_name', 'TEXT');
  await ensureColumn('transactions', 'mutation_mime_type', 'TEXT');
  await ensureColumn('transactions', 'created_by', 'INTEGER');
  await ensureColumn('transactions', 'updated_at', 'TEXT');
  await db.prepare(`
    UPDATE transactions
    SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
    WHERE updated_at IS NULL
  `).run();
  await ensureColumn('activities', 'live_url', 'TEXT');
  await ensureColumn('public_messages', 'seed_key', 'TEXT');
  await db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_public_messages_seed_key
      ON public_messages(seed_key)
      WHERE seed_key IS NOT NULL
  `);
  await ensureColumn('activities', 'is_published', 'INTEGER NOT NULL DEFAULT 1');

  await seedIfEmpty();
  await db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES ('schema_version', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(SCHEMA_VERSION);
}

async function seedIfEmpty() {
  const roleCount = (await db.prepare('SELECT COUNT(*) AS count FROM roles').get()).count;
  if (roleCount === 0) {
    const insertRole = db.prepare('INSERT INTO roles (name) VALUES (?)');
    await insertRole.run('ADMIN');
    await insertRole.run('TREASURER');
  }

  await insertSetting('opening_balance', seedDemoData ? '12500000' : '0');
  await insertSetting('opening_balance_date', '');
  await insertSetting('opening_balance_note', 'Saldo awal sebelum pencatatan digital IKHLAS');
  await insertSetting('mosque_name', 'Masjid Al-Fath');
  await insertSetting('mosque_tagline', 'Pusat Informasi Jamaah');
  await insertSetting('bank_name', seedDemoData ? 'Bank Syariah Indonesia' : '');
  await insertSetting('bank_account_number', seedDemoData ? '71234567890' : '');
  await insertSetting('bank_account_holder', 'Masjid Al-Fath');
  await insertSetting('default_youtube_url', '');
  await insertSetting('active_live_url', '');
  await insertSetting('active_live_title', '');
  await insertSetting('public_finance_period', 'MONTH');

  const categoryCount = (await db.prepare('SELECT COUNT(*) AS count FROM transaction_categories').get()).count;
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

    for (const item of categories) await insertCategory.run(...item);
  }

  await db.prepare(`
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

  const publicMessageCount = (await db.prepare('SELECT COUNT(*) AS count FROM public_messages').get()).count;
  if (publicMessageCount === 0) {
    await db.prepare(`
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

  for (const item of verifiedRunningTextSeeds) await insertSeedMessage.run(item);

  // Transaksi demo hanya diisi sekali pada database baru. Tanpa penanda ini, menghapus seluruh
  // transaksi lalu me-restart server akan memunculkan kembali data demo dan mengubah saldo.
  const demoSeeded = await db.prepare("SELECT 1 FROM settings WHERE key = 'demo_transactions_seeded'").get();
  const transactionCount = (await db.prepare('SELECT COUNT(*) AS count FROM transactions').get()).count;
  if (seedDemoData && !demoSeeded && transactionCount === 0) {
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

    for (const item of demo) await insert.run(item);
  }
  await insertSetting('demo_transactions_seeded', '1');

  const prayerCount = (await db.prepare('SELECT COUNT(*) AS count FROM prayer_schedules').get()).count;
  if (seedDemoData && prayerCount === 0) {
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

    for (const item of prayers) await insertPrayer.run(...item);
  }

  const activityCount = (await db.prepare('SELECT COUNT(*) AS count FROM activities').get()).count;
  if (seedDemoData && activityCount === 0) {
    const insertActivity = db.prepare(`
      INSERT INTO activities
        (title, activity_date, start_time, location, speaker, is_published)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    await insertActivity.run(
      "Kajian Ba'da Maghrib",
      '2026-09-21',
      '18:15',
      'Ruang Utama',
      'Ust. Hakim Pratama'
    );
    await insertActivity.run(
      'Pengajian Rutin Ahad',
      '2026-09-27',
      '07:00',
      'Ruang Utama',
      'Ust. Fikri Anwar'
    );
  }
}

export async function getOpeningBalance() {
  return Number(await getSetting('opening_balance', '0'));
}

export async function getSetting(key, fallback = '') {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value ?? fallback;
}

export async function getSettings(keys) {
  if (!keys.length) return {};

  const placeholders = keys.map(() => '?').join(',');
  const rows = await db.prepare(`
    SELECT key, value
    FROM settings
    WHERE key IN (${placeholders})
  `).all(...keys);

  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return Object.fromEntries(keys.map((key) => [key, values[key] ?? '']));
}
