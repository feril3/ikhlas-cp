import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { db, getOpeningBalance, getSettings } from './db.js';
import {
  clearSessionCookie,
  createSession,
  destroySession,
  getAuthenticatedUser,
  hashPassword,
  requireAuth,
  requireRole,
  setSessionCookie,
  verifyPassword
} from './auth.js';
import { logAudit } from './audit.js';
import { sendTransactionNotification } from './telegram.js';
import {
  safeAttachmentPath,
  transactionUpload,
  uploadDirectory
} from './uploads.js';

export const apiRouter = Router();

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.coerce.number().int().positive().max(9_999_999_999),
  transactionDate: z.string().regex(datePattern),
  method: z.enum(['CASH', 'TRANSFER']),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().default('')
});

const setupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(160),
  password: z.string().min(10).max(128)
});

const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(128)
});

const userSchema = setupSchema.extend({
  role: z.enum(['ADMIN', 'TREASURER'])
});

const prayerItemSchema = z.object({
  prayerName: z.string().trim().min(2).max(30),
  adhanTime: z.string().regex(timePattern),
  iqamahTime: z.string().regex(timePattern).or(z.literal('')).optional().default(''),
  imam: z.string().trim().max(100).optional().default(''),
  bilal: z.string().trim().max(100).optional().default('')
});

const prayerScheduleSchema = z.object({
  items: z.array(prayerItemSchema).min(1).max(10)
});

const activitySchema = z.object({
  title: z.string().trim().min(3).max(140),
  activityDate: z.string().regex(datePattern),
  startTime: z.string().regex(timePattern).or(z.literal('')).optional().default(''),
  location: z.string().trim().max(120).optional().default(''),
  speaker: z.string().trim().max(120).optional().default(''),
  liveUrl: z.string().trim().url().or(z.literal('')).optional().default(''),
  isPublished: z.boolean().optional().default(true)
});

const settingsSchema = z.object({
  mosqueName: z.string().trim().min(2).max(120),
  mosqueTagline: z.string().trim().max(160).optional().default(''),
  bankName: z.string().trim().max(100).optional().default(''),
  bankAccountNumber: z.string().trim().max(60).optional().default(''),
  bankAccountHolder: z.string().trim().max(120).optional().default(''),
  defaultYoutubeUrl: z.string().trim().url().or(z.literal('')).optional().default(''),
  activeLiveUrl: z.string().trim().url().or(z.literal('')).optional().default(''),
  activeLiveTitle: z.string().trim().max(140).optional().default('')
});

function getSummary() {
  const openingBalance = getOpeningBalance();
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount END), 0) AS total_expense
    FROM transactions
  `).get();

  return {
    openingBalance,
    totalIncome: totals.total_income,
    totalExpense: totals.total_expense,
    currentBalance: openingBalance + totals.total_income - totals.total_expense
  };
}

function getPeriodSummary(from, to) {
  const openingBalance = getOpeningBalance();
  const before = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END), 0) AS net
    FROM transactions
    WHERE transaction_date < ?
  `).get(from);

  const period = db.prepare(`
    SELECT
      COUNT(*) AS transaction_count,
      COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount END), 0) AS total_expense
    FROM transactions
    WHERE transaction_date BETWEEN ? AND ?
  `).get(from, to);

  const periodOpeningBalance = openingBalance + before.net;
  return {
    from,
    to,
    openingBalance: periodOpeningBalance,
    totalIncome: period.total_income,
    totalExpense: period.total_expense,
    netChange: period.total_income - period.total_expense,
    closingBalance: periodOpeningBalance + period.total_income - period.total_expense,
    transactionCount: period.transaction_count
  };
}

function getPrayerSchedule(date) {
  let scheduleDate = date;

  if (!scheduleDate || !datePattern.test(scheduleDate)) {
    scheduleDate = db.prepare('SELECT MAX(prayer_date) AS date FROM prayer_schedules').get()?.date;
  }

  let rows = scheduleDate
    ? db.prepare(`
        SELECT
          prayer_name AS prayerName,
          adhan_time AS adhanTime,
          iqamah_time AS iqamahTime,
          imam,
          bilal
        FROM prayer_schedules
        WHERE prayer_date = ?
        ORDER BY adhan_time ASC
      `).all(scheduleDate)
    : [];

  if (rows.length === 0) {
    scheduleDate = db.prepare(`
      SELECT MAX(prayer_date) AS date
      FROM prayer_schedules
      WHERE prayer_date <= ?
    `).get(date)?.date;

    rows = scheduleDate
      ? db.prepare(`
          SELECT
            prayer_name AS prayerName,
            adhan_time AS adhanTime,
            iqamah_time AS iqamahTime,
            imam,
            bilal
          FROM prayer_schedules
          WHERE prayer_date = ?
          ORDER BY adhan_time ASC
        `).all(scheduleDate)
      : [];
  }

  return { scheduleDate: scheduleDate ?? null, items: rows };
}

function getUpcomingActivities(date, limit = 6) {
  return db.prepare(`
    SELECT
      id,
      title,
      activity_date AS activityDate,
      start_time AS startTime,
      location,
      speaker,
      live_url AS liveUrl,
      is_published AS isPublished
    FROM activities
    WHERE activity_date >= ?
    ORDER BY activity_date ASC, start_time ASC
    LIMIT ?
  `).all(date, limit).map((row) => ({ ...row, isPublished: Boolean(row.isPublished) }));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth(date) {
  return `${date.slice(0, 7)}-01`;
}

function validateDateRange(req) {
  const to = datePattern.test(String(req.query.to ?? '')) ? String(req.query.to) : todayIso();
  const from = datePattern.test(String(req.query.from ?? '')) ? String(req.query.from) : firstDayOfMonth(to);
  if (from > to) return null;
  return { from, to };
}

function escapeCsv(value) {
  const string = String(value ?? '');
  if (/[",\n]/.test(string)) return `"${string.replaceAll('"', '""')}"`;
  return string;
}

function publicSettings() {
  const raw = getSettings([
    'mosque_name',
    'mosque_tagline',
    'bank_name',
    'bank_account_number',
    'bank_account_holder',
    'default_youtube_url',
    'active_live_url',
    'active_live_title'
  ]);

  return {
    mosqueName: raw.mosque_name,
    mosqueTagline: raw.mosque_tagline,
    bankName: raw.bank_name,
    bankAccountNumber: raw.bank_account_number,
    bankAccountHolder: raw.bank_account_holder,
    defaultYoutubeUrl: raw.default_youtube_url,
    activeLiveUrl: raw.active_live_url,
    activeLiveTitle: raw.active_live_title
  };
}

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ikhlas-api' });
});

apiRouter.get('/auth/status', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  const user = getAuthenticatedUser(req);
  res.json({
    setupRequired: userCount === 0,
    authenticated: Boolean(user),
    user
  });
});

apiRouter.post('/auth/setup', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount > 0) {
    return res.status(409).json({ message: 'Setup awal sudah diselesaikan.' });
  }

  const parsed = setupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Data akun belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const role = db.prepare("SELECT id FROM roles WHERE name = 'ADMIN'").get();
  const input = parsed.data;

  const result = db.prepare(`
    INSERT INTO users (role_id, name, email, password_hash)
    VALUES (?, ?, ?, ?)
  `).run(role.id, input.name, input.email.toLowerCase(), hashPassword(input.password));

  const user = {
    id: Number(result.lastInsertRowid),
    name: input.name,
    email: input.email.toLowerCase(),
    role: 'ADMIN',
    isActive: 1
  };

  const session = createSession(user.id);
  setSessionCookie(res, session.token);
  logAudit(req, {
    userId: user.id,
    action: 'AUTH_SETUP',
    entityType: 'USER',
    entityId: user.id,
    details: { email: user.email, role: user.role }
  });

  return res.status(201).json({ user });
});

apiRouter.post('/auth/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Email atau password tidak valid.' });
  }

  const account = db.prepare(`
    SELECT
      users.id,
      users.name,
      users.email,
      users.password_hash AS passwordHash,
      users.is_active AS isActive,
      roles.name AS role
    FROM users
    JOIN roles ON roles.id = users.role_id
    WHERE LOWER(users.email) = LOWER(?)
    LIMIT 1
  `).get(parsed.data.email);

  if (!account || !account.isActive || !verifyPassword(parsed.data.password, account.passwordHash)) {
    logAudit(req, {
      action: 'AUTH_LOGIN_FAILED',
      entityType: 'USER',
      details: { email: parsed.data.email.toLowerCase() }
    });
    return res.status(401).json({ message: 'Email atau password salah.' });
  }

  const session = createSession(account.id);
  setSessionCookie(res, session.token);

  const user = {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    isActive: account.isActive
  };

  logAudit(req, {
    userId: account.id,
    action: 'AUTH_LOGIN',
    entityType: 'USER',
    entityId: account.id
  });

  return res.json({ user });
});

apiRouter.post('/auth/logout', requireAuth, (req, res) => {
  logAudit(req, {
    action: 'AUTH_LOGOUT',
    entityType: 'USER',
    entityId: req.user.id
  });
  destroySession(req);
  clearSessionCookie(res);
  res.json({ message: 'Logout berhasil.' });
});

apiRouter.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

apiRouter.get('/public/display', (req, res) => {
  const date = datePattern.test(String(req.query.date ?? '')) ? String(req.query.date) : todayIso();
  const period = getPeriodSummary(firstDayOfMonth(date), date);

  res.json({
    settings: publicSettings(),
    finance: {
      currentBalance: getSummary().currentBalance,
      totalIncome: period.totalIncome,
      totalExpense: period.totalExpense,
      from: period.from,
      to: period.to
    },
    prayerSchedule: getPrayerSchedule(date),
    activities: getUpcomingActivities(date, 4).filter((item) => item.isPublished)
  });
});

apiRouter.get('/dashboard', requireAuth, (req, res) => {
  const recentTransactions = db.prepare(`
    SELECT
      id,
      type,
      amount,
      transaction_date AS transactionDate,
      method,
      category,
      description,
      evidence_path AS evidencePath,
      bank_mutation_path AS bankMutationPath,
      created_at AS createdAt
    FROM transactions
    ORDER BY transaction_date DESC, created_at DESC
    LIMIT 6
  `).all();

  const schedule = getPrayerSchedule(String(req.query.date ?? todayIso()));
  const activities = getUpcomingActivities(String(req.query.date ?? todayIso()), 4);

  res.json({
    summary: getSummary(),
    recentTransactions,
    prayerSchedule: schedule.items,
    prayerScheduleDate: schedule.scheduleDate,
    activities
  });
});

apiRouter.get('/transactions', requireAuth, (req, res) => {
  const clauses = [];
  const params = [];

  if (req.query.type === 'INCOME' || req.query.type === 'EXPENSE') {
    clauses.push('type = ?');
    params.push(req.query.type);
  }
  if (datePattern.test(String(req.query.from ?? ''))) {
    clauses.push('transaction_date >= ?');
    params.push(req.query.from);
  }
  if (datePattern.test(String(req.query.to ?? ''))) {
    clauses.push('transaction_date <= ?');
    params.push(req.query.to);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT
      id,
      type,
      amount,
      transaction_date AS transactionDate,
      method,
      category,
      description,
      evidence_path AS evidencePath,
      bank_mutation_path AS bankMutationPath,
      created_at AS createdAt
    FROM transactions
    ${where}
    ORDER BY transaction_date DESC, created_at DESC
    LIMIT 500
  `).all(...params);

  res.json({ data: rows, summary: getSummary() });
});

apiRouter.post('/transactions', requireAuth, requireRole('ADMIN', 'TREASURER'), async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: 'Data transaksi belum valid.',
      errors: parsed.error.flatten().fieldErrors
    });
  }

  const input = parsed.data;
  const insert = db.prepare(`
    INSERT INTO transactions
      (type, amount, transaction_date, method, category, description, created_by)
    VALUES
      (@type, @amount, @transactionDate, @method, @category, @description, @createdBy)
  `);

  const created = insert.run({ ...input, createdBy: req.user.id });
  const transaction = db.prepare(`
    SELECT
      id,
      type,
      amount,
      transaction_date AS transactionDate,
      method,
      category,
      description,
      created_at AS createdAt
    FROM transactions
    WHERE id = ?
  `).get(created.lastInsertRowid);

  const summary = getSummary();
  logAudit(req, {
    action: 'TRANSACTION_CREATE',
    entityType: 'TRANSACTION',
    entityId: transaction.id,
    details: { type: transaction.type, amount: transaction.amount, category: transaction.category }
  });

  const notification = await sendTransactionNotification(transaction, summary);

  return res.status(201).json({
    message: 'Transaksi berhasil disimpan.',
    transaction,
    summary,
    notification
  });
});

apiRouter.post(
  '/transactions/:id/attachments',
  requireAuth,
  requireRole('ADMIN', 'TREASURER'),
  transactionUpload,
  (req, res) => {
    const transaction = db.prepare(`
      SELECT id, evidence_path AS evidencePath, bank_mutation_path AS bankMutationPath
      FROM transactions
      WHERE id = ?
    `).get(req.params.id);

    if (!transaction) {
      for (const files of Object.values(req.files ?? {})) {
        for (const file of files) fs.rmSync(file.path, { force: true });
      }
      return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
    }

    const evidence = req.files?.evidence?.[0];
    const mutation = req.files?.mutation?.[0];

    const evidencePath = evidence ? evidence.filename : transaction.evidencePath;
    const mutationPath = mutation ? mutation.filename : transaction.bankMutationPath;

    db.prepare(`
      UPDATE transactions
      SET evidence_path = ?, bank_mutation_path = ?
      WHERE id = ?
    `).run(evidencePath, mutationPath, transaction.id);

    logAudit(req, {
      action: 'TRANSACTION_ATTACHMENTS_UPDATE',
      entityType: 'TRANSACTION',
      entityId: transaction.id,
      details: {
        evidence: Boolean(evidence),
        bankMutation: Boolean(mutation)
      }
    });

    res.json({
      message: 'Dokumen transaksi berhasil diperbarui.',
      evidencePath,
      bankMutationPath: mutationPath
    });
  }
);

apiRouter.get('/transactions/:id/attachments/:kind', requireAuth, (req, res) => {
  const transaction = db.prepare(`
    SELECT evidence_path AS evidencePath, bank_mutation_path AS bankMutationPath
    FROM transactions
    WHERE id = ?
  `).get(req.params.id);

  if (!transaction) return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });

  const filename = req.params.kind === 'evidence'
    ? transaction.evidencePath
    : req.params.kind === 'mutation'
      ? transaction.bankMutationPath
      : null;

  if (!filename) return res.status(404).json({ message: 'Dokumen tidak tersedia.' });

  const resolved = safeAttachmentPath(filename);
  if (!resolved || !fs.existsSync(resolved)) {
    return res.status(404).json({ message: 'File dokumen tidak ditemukan.' });
  }

  res.sendFile(resolved, { root: path.parse(resolved).root });
});

apiRouter.get('/reports/summary', requireAuth, (req, res) => {
  const range = validateDateRange(req);
  if (!range) return res.status(422).json({ message: 'Rentang tanggal tidak valid.' });

  const categories = db.prepare(`
    SELECT
      type,
      category,
      COUNT(*) AS transactionCount,
      SUM(amount) AS total
    FROM transactions
    WHERE transaction_date BETWEEN ? AND ?
    GROUP BY type, category
    ORDER BY total DESC
  `).all(range.from, range.to);

  res.json({
    summary: getPeriodSummary(range.from, range.to),
    categories
  });
});

apiRouter.get('/reports/transactions.csv', requireAuth, (req, res) => {
  const range = validateDateRange(req);
  if (!range) return res.status(422).json({ message: 'Rentang tanggal tidak valid.' });

  const rows = db.prepare(`
    SELECT
      transaction_date AS transactionDate,
      type,
      method,
      category,
      amount,
      description
    FROM transactions
    WHERE transaction_date BETWEEN ? AND ?
    ORDER BY transaction_date ASC, id ASC
  `).all(range.from, range.to);

  const header = ['Tanggal', 'Jenis', 'Metode', 'Kategori', 'Nominal', 'Keterangan'];
  const lines = [
    header.map(escapeCsv).join(','),
    ...rows.map((row) => [
      row.transactionDate,
      row.type === 'INCOME' ? 'Kas Masuk' : 'Kas Keluar',
      row.method === 'TRANSFER' ? 'Transfer' : 'Cash/Tunai',
      row.category,
      row.amount,
      row.description
    ].map(escapeCsv).join(','))
  ];

  logAudit(req, {
    action: 'REPORT_EXPORT_CSV',
    entityType: 'REPORT',
    details: range
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="ikhlas-transaksi-${range.from}-${range.to}.csv"`);
  res.send('\uFEFF' + lines.join('\n'));
});

apiRouter.get('/prayer-schedules', requireAuth, (req, res) => {
  const date = datePattern.test(String(req.query.date ?? '')) ? String(req.query.date) : todayIso();
  res.json(getPrayerSchedule(date));
});

apiRouter.put('/prayer-schedules/:date', requireAuth, requireRole('ADMIN'), (req, res) => {
  if (!datePattern.test(req.params.date)) {
    return res.status(422).json({ message: 'Tanggal jadwal tidak valid.' });
  }

  const parsed = prayerScheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Data jadwal belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const replace = db.transaction((items) => {
    db.prepare('DELETE FROM prayer_schedules WHERE prayer_date = ?').run(req.params.date);
    const insert = db.prepare(`
      INSERT INTO prayer_schedules
        (prayer_date, prayer_name, adhan_time, iqamah_time, imam, bilal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      insert.run(
        req.params.date,
        item.prayerName,
        item.adhanTime,
        item.iqamahTime || null,
        item.imam || null,
        item.bilal || null
      );
    }
  });

  replace(parsed.data.items);
  logAudit(req, {
    action: 'PRAYER_SCHEDULE_UPDATE',
    entityType: 'PRAYER_SCHEDULE',
    entityId: req.params.date,
    details: { itemCount: parsed.data.items.length }
  });

  res.json(getPrayerSchedule(req.params.date));
});

apiRouter.get('/activities', requireAuth, (req, res) => {
  const date = datePattern.test(String(req.query.from ?? '')) ? String(req.query.from) : todayIso();
  res.json({ data: getUpcomingActivities(date, 100) });
});

apiRouter.post('/activities', requireAuth, requireRole('ADMIN'), (req, res) => {
  const parsed = activitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Data kegiatan belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const input = parsed.data;
  const result = db.prepare(`
    INSERT INTO activities
      (title, activity_date, start_time, location, speaker, live_url, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.title,
    input.activityDate,
    input.startTime || null,
    input.location || null,
    input.speaker || null,
    input.liveUrl || null,
    input.isPublished ? 1 : 0
  );

  logAudit(req, {
    action: 'ACTIVITY_CREATE',
    entityType: 'ACTIVITY',
    entityId: result.lastInsertRowid,
    details: { title: input.title, activityDate: input.activityDate }
  });

  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

apiRouter.delete('/activities/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const activity = db.prepare('SELECT id, title FROM activities WHERE id = ?').get(req.params.id);
  if (!activity) return res.status(404).json({ message: 'Kegiatan tidak ditemukan.' });

  db.prepare('DELETE FROM activities WHERE id = ?').run(activity.id);
  logAudit(req, {
    action: 'ACTIVITY_DELETE',
    entityType: 'ACTIVITY',
    entityId: activity.id,
    details: { title: activity.title }
  });

  res.status(204).end();
});

apiRouter.get('/users', requireAuth, requireRole('ADMIN'), (_req, res) => {
  const users = db.prepare(`
    SELECT
      users.id,
      users.name,
      users.email,
      users.is_active AS isActive,
      roles.name AS role,
      users.created_at AS createdAt
    FROM users
    JOIN roles ON roles.id = users.role_id
    ORDER BY users.created_at ASC
  `).all().map((user) => ({ ...user, isActive: Boolean(user.isActive) }));

  res.json({ data: users });
});

apiRouter.post('/users', requireAuth, requireRole('ADMIN'), (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Data pengguna belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const input = parsed.data;
  const role = db.prepare('SELECT id FROM roles WHERE name = ?').get(input.role);

  try {
    const result = db.prepare(`
      INSERT INTO users (role_id, name, email, password_hash)
      VALUES (?, ?, ?, ?)
    `).run(role.id, input.name, input.email.toLowerCase(), hashPassword(input.password));

    logAudit(req, {
      action: 'USER_CREATE',
      entityType: 'USER',
      entityId: result.lastInsertRowid,
      details: { email: input.email.toLowerCase(), role: input.role }
    });

    return res.status(201).json({ id: Number(result.lastInsertRowid) });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return res.status(409).json({ message: 'Email tersebut sudah digunakan.' });
    }
    throw error;
  }
});

apiRouter.get('/settings', requireAuth, requireRole('ADMIN'), (_req, res) => {
  res.json(publicSettings());
});

apiRouter.put('/settings', requireAuth, requireRole('ADMIN'), (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Pengaturan belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const map = {
    mosqueName: 'mosque_name',
    mosqueTagline: 'mosque_tagline',
    bankName: 'bank_name',
    bankAccountNumber: 'bank_account_number',
    bankAccountHolder: 'bank_account_holder',
    defaultYoutubeUrl: 'default_youtube_url',
    activeLiveUrl: 'active_live_url',
    activeLiveTitle: 'active_live_title'
  };

  const update = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `);

  db.transaction((input) => {
    for (const [field, key] of Object.entries(map)) {
      update.run(key, input[field] ?? '');
    }
  })(parsed.data);

  logAudit(req, {
    action: 'SETTINGS_UPDATE',
    entityType: 'SETTINGS'
  });

  res.json(publicSettings());
});

apiRouter.get('/audit-logs', requireAuth, requireRole('ADMIN'), (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 250);
  const rows = db.prepare(`
    SELECT
      audit_logs.id,
      audit_logs.action,
      audit_logs.entity_type AS entityType,
      audit_logs.entity_id AS entityId,
      audit_logs.details_json AS detailsJson,
      audit_logs.ip_address AS ipAddress,
      audit_logs.created_at AS createdAt,
      users.name AS userName,
      users.email AS userEmail
    FROM audit_logs
    LEFT JOIN users ON users.id = audit_logs.user_id
    ORDER BY audit_logs.created_at DESC
    LIMIT ?
  `).all(limit).map((row) => ({
    ...row,
    details: row.detailsJson ? JSON.parse(row.detailsJson) : null,
    detailsJson: undefined
  }));

  res.json({ data: rows });
});
