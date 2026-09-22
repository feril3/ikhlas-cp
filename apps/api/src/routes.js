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
import { transactionUpload } from './uploads.js';
import {
  deleteTransactionAttachment,
  getTransactionAttachment,
  isGoogleDriveConfigured,
  uploadTransactionAttachment
} from './driveStorage.js';

export const apiRouter = Router();

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.coerce.number().int().positive().max(9_999_999_999),
  transactionDate: z.string().regex(datePattern),
  method: z.enum(['CASH', 'TRANSFER']),
  categoryId: z.coerce.number().int().positive(),
  sourceDetail: z.string().trim().max(120).optional().default(''),
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
  activeLiveTitle: z.string().trim().max(140).optional().default(''),
  openingBalance: z.coerce.number().int().min(0).max(9_999_999_999),
  openingBalanceDate: z.string().regex(datePattern).or(z.literal('')).optional().default(''),
  openingBalanceNote: z.string().trim().max(240).optional().default('')
});

const categorySchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  name: z.string().trim().min(2).max(80),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
  isActive: z.boolean().optional().default(true)
});

const publicMessageSchema = z.object({
  kind: z.enum(['VERSE', 'ANNOUNCEMENT', 'MESSAGE']),
  title: z.string().trim().max(100).optional().default(''),
  content: z.string().trim().min(2).max(400),
  source: z.string().trim().max(120).optional().default(''),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
  isActive: z.boolean().optional().default(true)
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

function adminSettings() {
  const publicValues = publicSettings();
  const raw = getSettings([
    'opening_balance',
    'opening_balance_date',
    'opening_balance_note'
  ]);

  return {
    ...publicValues,
    openingBalance: Number(raw.opening_balance || 0),
    openingBalanceDate: raw.opening_balance_date || '',
    openingBalanceNote: raw.opening_balance_note || ''
  };
}

function getActivePublicMessages() {
  return db.prepare(`
    SELECT
      id,
      kind,
      title,
      content,
      source,
      sort_order AS sortOrder
    FROM public_messages
    WHERE is_active = 1
    ORDER BY sort_order ASC, id ASC
  `).all();
}

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ikhlas-api',
    storage: {
      provider: 'google-drive',
      configured: isGoogleDriveConfigured()
    }
  });
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

  const recentTransactions = db.prepare(`
    SELECT
      id,
      type,
      amount,
      transaction_date AS transactionDate,
      category
    FROM transactions
    ORDER BY transaction_date DESC, created_at DESC
    LIMIT 12
  `).all();

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
    activities: getUpcomingActivities(date, 4).filter((item) => item.isPublished),
    recentTransactions,
    messages: getActivePublicMessages()
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
      category_id AS categoryId,
      source_detail AS sourceDetail,
      description,
      evidence_drive_file_id AS evidenceFileId,
      evidence_original_name AS evidenceOriginalName,
      evidence_mime_type AS evidenceMimeType,
      mutation_drive_file_id AS bankMutationFileId,
      mutation_original_name AS bankMutationOriginalName,
      mutation_mime_type AS bankMutationMimeType,
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
      category_id AS categoryId,
      source_detail AS sourceDetail,
      description,
      evidence_drive_file_id AS evidenceFileId,
      evidence_original_name AS evidenceOriginalName,
      evidence_mime_type AS evidenceMimeType,
      mutation_drive_file_id AS bankMutationFileId,
      mutation_original_name AS bankMutationOriginalName,
      mutation_mime_type AS bankMutationMimeType,
      created_at AS createdAt
    FROM transactions
    ${where}
    ORDER BY transaction_date DESC, created_at DESC
    LIMIT 500
  `).all(...params);

  res.json({ data: rows, summary: getSummary() });
});

apiRouter.post(
  '/transactions',
  requireAuth,
  requireRole('TREASURER'),
  transactionUpload,
  async (req, res) => {
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        message: 'Data transaksi belum valid.',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const input = parsed.data;
    const category = db.prepare(`
      SELECT id, type, name, is_active AS isActive
      FROM transaction_categories
      WHERE id = ?
      LIMIT 1
    `).get(input.categoryId);

    if (!category || category.type !== input.type || !category.isActive) {
      return res.status(422).json({
        message: 'Kategori transaksi tidak valid atau sudah dinonaktifkan.'
      });
    }

    const evidence = req.files?.evidence?.[0] ?? null;
    const mutation = req.files?.mutation?.[0] ?? null;

    if (input.type === 'EXPENSE' && !evidence) {
      return res.status(422).json({
        message: 'Bukti transaksi wajib dilampirkan untuk kas keluar.'
      });
    }

    const insert = db.prepare(`
      INSERT INTO transactions
        (type, amount, transaction_date, method, category, category_id, source_detail, description, created_by)
      VALUES
        (@type, @amount, @transactionDate, @method, @category, @categoryId, @sourceDetail, @description, @createdBy)
    `);

    const created = insert.run({
      ...input,
      category: category.name,
      sourceDetail: input.type === 'INCOME' ? input.sourceDetail : '',
      createdBy: req.user.id
    });
    const transactionId = Number(created.lastInsertRowid);
    const uploaded = {};

    try {
      if (evidence) {
        uploaded.evidence = await uploadTransactionAttachment(evidence, {
          transactionId,
          transactionDate: input.transactionDate,
          type: input.type,
          kind: 'evidence'
        });
      }

      if (mutation) {
        uploaded.mutation = await uploadTransactionAttachment(mutation, {
          transactionId,
          transactionDate: input.transactionDate,
          type: input.type,
          kind: 'mutation'
        });
      }

      db.prepare(`
        UPDATE transactions
        SET
          evidence_drive_file_id = ?,
          evidence_original_name = ?,
          evidence_mime_type = ?,
          mutation_drive_file_id = ?,
          mutation_original_name = ?,
          mutation_mime_type = ?
        WHERE id = ?
      `).run(
        uploaded.evidence?.id ?? null,
        uploaded.evidence?.originalName ?? null,
        uploaded.evidence?.mimeType ?? null,
        uploaded.mutation?.id ?? null,
        uploaded.mutation?.originalName ?? null,
        uploaded.mutation?.mimeType ?? null,
        transactionId
      );
    } catch (error) {
      await Promise.allSettled([
        deleteTransactionAttachment(uploaded.evidence?.id),
        deleteTransactionAttachment(uploaded.mutation?.id)
      ]);
      db.prepare('DELETE FROM transactions WHERE id = ?').run(transactionId);

      console.error('Google Drive upload failed:', error);
      return res.status(502).json({
        message: 'Transaksi tidak disimpan karena upload bukti ke Google Drive gagal. Periksa konfigurasi Drive dan coba lagi.'
      });
    }

    const transaction = db.prepare(`
      SELECT
        id,
        type,
        amount,
        transaction_date AS transactionDate,
        method,
        category,
        description,
        evidence_drive_file_id AS evidenceFileId,
        evidence_original_name AS evidenceOriginalName,
        evidence_mime_type AS evidenceMimeType,
        mutation_drive_file_id AS bankMutationFileId,
        mutation_original_name AS bankMutationOriginalName,
        mutation_mime_type AS bankMutationMimeType,
        created_at AS createdAt
      FROM transactions
      WHERE id = ?
    `).get(transactionId);

    const summary = getSummary();
    logAudit(req, {
      action: 'TRANSACTION_CREATE',
      entityType: 'TRANSACTION',
      entityId: transaction.id,
      details: {
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        categoryId: transaction.categoryId,
        sourceDetail: transaction.sourceDetail || null,
        evidenceOnGoogleDrive: Boolean(transaction.evidenceFileId),
        mutationOnGoogleDrive: Boolean(transaction.bankMutationFileId)
      }
    });

    const notification = await sendTransactionNotification(transaction, summary);

    return res.status(201).json({
      message: 'Transaksi berhasil disimpan.',
      transaction,
      summary,
      notification
    });
  }
);

apiRouter.post(
  '/transactions/:id/attachments',
  requireAuth,
  requireRole('TREASURER'),
  transactionUpload,
  async (req, res) => {
    const transaction = db.prepare(`
      SELECT
        id,
        type,
        transaction_date AS transactionDate,
        evidence_drive_file_id AS evidenceFileId,
        mutation_drive_file_id AS bankMutationFileId
      FROM transactions
      WHERE id = ?
    `).get(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
    }

    const evidence = req.files?.evidence?.[0] ?? null;
    const mutation = req.files?.mutation?.[0] ?? null;

    if (!evidence && !mutation) {
      return res.status(422).json({ message: 'Tidak ada dokumen yang dipilih.' });
    }

    const uploaded = {};

    try {
      if (evidence) {
        uploaded.evidence = await uploadTransactionAttachment(evidence, {
          transactionId: transaction.id,
          transactionDate: transaction.transactionDate,
          type: transaction.type,
          kind: 'evidence'
        });
      }

      if (mutation) {
        uploaded.mutation = await uploadTransactionAttachment(mutation, {
          transactionId: transaction.id,
          transactionDate: transaction.transactionDate,
          type: transaction.type,
          kind: 'mutation'
        });
      }

      db.prepare(`
        UPDATE transactions
        SET
          evidence_drive_file_id = COALESCE(?, evidence_drive_file_id),
          evidence_original_name = COALESCE(?, evidence_original_name),
          evidence_mime_type = COALESCE(?, evidence_mime_type),
          mutation_drive_file_id = COALESCE(?, mutation_drive_file_id),
          mutation_original_name = COALESCE(?, mutation_original_name),
          mutation_mime_type = COALESCE(?, mutation_mime_type)
        WHERE id = ?
      `).run(
        uploaded.evidence?.id ?? null,
        uploaded.evidence?.originalName ?? null,
        uploaded.evidence?.mimeType ?? null,
        uploaded.mutation?.id ?? null,
        uploaded.mutation?.originalName ?? null,
        uploaded.mutation?.mimeType ?? null,
        transaction.id
      );
    } catch (error) {
      await Promise.allSettled([
        deleteTransactionAttachment(uploaded.evidence?.id),
        deleteTransactionAttachment(uploaded.mutation?.id)
      ]);
      console.error('Google Drive attachment replacement failed:', error);
      return res.status(502).json({ message: 'Upload dokumen ke Google Drive gagal.' });
    }

    await Promise.allSettled([
      evidence ? deleteTransactionAttachment(transaction.evidenceFileId) : Promise.resolve(),
      mutation ? deleteTransactionAttachment(transaction.bankMutationFileId) : Promise.resolve()
    ]);

    logAudit(req, {
      action: 'TRANSACTION_ATTACHMENTS_UPDATE',
      entityType: 'TRANSACTION',
      entityId: transaction.id,
      details: {
        evidenceOnGoogleDrive: Boolean(evidence),
        bankMutationOnGoogleDrive: Boolean(mutation)
      }
    });

    return res.json({
      message: 'Dokumen transaksi berhasil diperbarui di Google Drive.',
      evidenceFileId: uploaded.evidence?.id ?? transaction.evidenceFileId,
      bankMutationFileId: uploaded.mutation?.id ?? transaction.bankMutationFileId
    });
  }
);

apiRouter.get('/transactions/:id/attachments/:kind', requireAuth, async (req, res) => {
  const transaction = db.prepare(`
    SELECT
      evidence_drive_file_id AS evidenceFileId,
      evidence_original_name AS evidenceOriginalName,
      evidence_mime_type AS evidenceMimeType,
      mutation_drive_file_id AS bankMutationFileId,
      mutation_original_name AS bankMutationOriginalName,
      mutation_mime_type AS bankMutationMimeType
    FROM transactions
    WHERE id = ?
  `).get(req.params.id);

  if (!transaction) {
    return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
  }

  const isEvidence = req.params.kind === 'evidence';
  const isMutation = req.params.kind === 'mutation';
  if (!isEvidence && !isMutation) {
    return res.status(404).json({ message: 'Jenis dokumen tidak dikenal.' });
  }

  const fileId = isEvidence ? transaction.evidenceFileId : transaction.bankMutationFileId;
  const originalName = isEvidence ? transaction.evidenceOriginalName : transaction.bankMutationOriginalName;
  const storedMimeType = isEvidence ? transaction.evidenceMimeType : transaction.bankMutationMimeType;

  if (!fileId) {
    return res.status(404).json({ message: 'Dokumen tidak tersedia.' });
  }

  try {
    const file = await getTransactionAttachment(fileId);
    const mimeType = file.metadata.mimeType || storedMimeType || 'application/octet-stream';
    const fileName = originalName || file.metadata.name || 'attachment';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Cache-Control', 'private, no-store');

    file.stream.on('error', (error) => {
      console.error('Google Drive stream failed:', error);
      if (!res.headersSent) {
        res.status(502).json({ message: 'File dari Google Drive gagal dibaca.' });
      } else {
        res.destroy(error);
      }
    });

    file.stream.pipe(res);
  } catch (error) {
    console.error('Google Drive download failed:', error);
    return res.status(502).json({ message: 'Dokumen dari Google Drive gagal diambil.' });
  }
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
      source_detail AS sourceDetail,
      description
    FROM transactions
    WHERE transaction_date BETWEEN ? AND ?
    ORDER BY transaction_date ASC, id ASC
  `).all(range.from, range.to);

  const header = ['Tanggal', 'Jenis', 'Metode', 'Kategori', 'Nominal', 'Detail Sumber', 'Keterangan'];
  const lines = [
    header.map(escapeCsv).join(','),
    ...rows.map((row) => [
      row.transactionDate,
      row.type === 'INCOME' ? 'Kas Masuk' : 'Kas Keluar',
      row.method === 'TRANSFER' ? 'Transfer' : 'Cash/Tunai',
      row.category,
      row.amount,
      row.sourceDetail,
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

apiRouter.get('/transaction-categories', requireAuth, (req, res) => {
  const params = [];
  let where = '';

  if (req.query.type === 'INCOME' || req.query.type === 'EXPENSE') {
    where = 'WHERE type = ?';
    params.push(req.query.type);
  }

  const rows = db.prepare(`
    SELECT
      id,
      type,
      name,
      is_active AS isActive,
      sort_order AS sortOrder
    FROM transaction_categories
    ${where}
    ORDER BY type ASC, sort_order ASC, name ASC
  `).all(...params).map((row) => ({ ...row, isActive: Boolean(row.isActive) }));

  res.json({
    data: req.user.role === 'ADMIN'
      ? rows
      : rows.filter((row) => row.isActive)
  });
});

apiRouter.post('/transaction-categories', requireAuth, requireRole('ADMIN'), (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Kategori belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  try {
    const input = parsed.data;
    const result = db.prepare(`
      INSERT INTO transaction_categories (type, name, is_active, sort_order)
      VALUES (?, ?, ?, ?)
    `).run(input.type, input.name, input.isActive ? 1 : 0, input.sortOrder);

    logAudit(req, {
      action: 'TRANSACTION_CATEGORY_CREATE',
      entityType: 'TRANSACTION_CATEGORY',
      entityId: result.lastInsertRowid,
      details: { type: input.type, name: input.name }
    });

    return res.status(201).json({ id: Number(result.lastInsertRowid) });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return res.status(409).json({ message: 'Nama kategori tersebut sudah ada untuk jenis transaksi ini.' });
    }
    throw error;
  }
});

apiRouter.put('/transaction-categories/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Kategori belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const existing = db.prepare('SELECT id FROM transaction_categories WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Kategori tidak ditemukan.' });

  try {
    const input = parsed.data;
    db.prepare(`
      UPDATE transaction_categories
      SET type = ?, name = ?, is_active = ?, sort_order = ?
      WHERE id = ?
    `).run(input.type, input.name, input.isActive ? 1 : 0, input.sortOrder, existing.id);

    logAudit(req, {
      action: 'TRANSACTION_CATEGORY_UPDATE',
      entityType: 'TRANSACTION_CATEGORY',
      entityId: existing.id,
      details: { type: input.type, name: input.name, isActive: input.isActive }
    });

    return res.json({ id: existing.id });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return res.status(409).json({ message: 'Nama kategori tersebut sudah ada untuk jenis transaksi ini.' });
    }
    throw error;
  }
});

apiRouter.get('/public-messages', requireAuth, requireRole('ADMIN'), (_req, res) => {
  const rows = db.prepare(`
    SELECT
      id,
      kind,
      title,
      content,
      source,
      is_active AS isActive,
      sort_order AS sortOrder
    FROM public_messages
    ORDER BY sort_order ASC, id ASC
  `).all().map((row) => ({ ...row, isActive: Boolean(row.isActive) }));

  res.json({ data: rows });
});

apiRouter.post('/public-messages', requireAuth, requireRole('ADMIN'), (req, res) => {
  const parsed = publicMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Konten Public Display belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const input = parsed.data;
  const result = db.prepare(`
    INSERT INTO public_messages (kind, title, content, source, is_active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(input.kind, input.title, input.content, input.source, input.isActive ? 1 : 0, input.sortOrder);

  logAudit(req, {
    action: 'PUBLIC_MESSAGE_CREATE',
    entityType: 'PUBLIC_MESSAGE',
    entityId: result.lastInsertRowid,
    details: { kind: input.kind, title: input.title }
  });

  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

apiRouter.put('/public-messages/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const parsed = publicMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Konten Public Display belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const existing = db.prepare('SELECT id FROM public_messages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Konten tidak ditemukan.' });

  const input = parsed.data;
  db.prepare(`
    UPDATE public_messages
    SET kind = ?, title = ?, content = ?, source = ?, is_active = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(input.kind, input.title, input.content, input.source, input.isActive ? 1 : 0, input.sortOrder, existing.id);

  logAudit(req, {
    action: 'PUBLIC_MESSAGE_UPDATE',
    entityType: 'PUBLIC_MESSAGE',
    entityId: existing.id,
    details: { kind: input.kind, title: input.title, isActive: input.isActive }
  });

  res.json({ id: existing.id });
});

apiRouter.delete('/public-messages/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const existing = db.prepare('SELECT id FROM public_messages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Konten tidak ditemukan.' });

  db.prepare('DELETE FROM public_messages WHERE id = ?').run(existing.id);
  logAudit(req, {
    action: 'PUBLIC_MESSAGE_DELETE',
    entityType: 'PUBLIC_MESSAGE',
    entityId: existing.id
  });

  res.status(204).end();
});

apiRouter.get('/settings', requireAuth, requireRole('ADMIN'), (_req, res) => {
  res.json(adminSettings());
});

apiRouter.put('/settings', requireAuth, requireRole('ADMIN'), (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Pengaturan belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const before = adminSettings();
  const map = {
    mosqueName: 'mosque_name',
    mosqueTagline: 'mosque_tagline',
    bankName: 'bank_name',
    bankAccountNumber: 'bank_account_number',
    bankAccountHolder: 'bank_account_holder',
    defaultYoutubeUrl: 'default_youtube_url',
    activeLiveUrl: 'active_live_url',
    activeLiveTitle: 'active_live_title',
    openingBalance: 'opening_balance',
    openingBalanceDate: 'opening_balance_date',
    openingBalanceNote: 'opening_balance_note'
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
    entityType: 'SETTINGS',
    details: {
      openingBalanceChanged: before.openingBalance !== parsed.data.openingBalance,
      openingBalanceDate: parsed.data.openingBalanceDate || null
    }
  });

  res.json(adminSettings());
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
