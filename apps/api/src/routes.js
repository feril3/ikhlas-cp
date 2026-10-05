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
import {
  PRAYER_LOCATION,
  addDays,
  getPrayerSchedule as getProviderPrayerSchedule
} from './prayerService.js';

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

const transactionEditSchema = transactionSchema.omit({ type: true });

const transactionApprovalReviewSchema = z.object({
  decision: z.enum(['APPROVE', 'REVISION_REQUIRED']),
  note: z.string().trim().max(500).optional().default('')
});

const fridayScheduleSchema = z.object({
  imam: z.string().trim().min(2).max(120),
  khatib: z.string().trim().min(2).max(120),
  bilal: z.string().trim().min(2).max(120)
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

const userStatusSchema = z.object({
  isActive: z.boolean()
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

function getCashflowSeries(from, to) {
  const rows = db.prepare(`
    SELECT
      transaction_date AS date,
      COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount END), 0) AS expense
    FROM transactions
    WHERE transaction_date BETWEEN ? AND ?
    GROUP BY transaction_date
    ORDER BY transaction_date ASC
  `).all(from, to);

  const byDate = new Map(rows.map((row) => [row.date, row]));
  const series = [];
  let cursor = from;

  while (cursor <= to) {
    const row = byDate.get(cursor);
    const income = Number(row?.income ?? 0);
    const expense = Number(row?.expense ?? 0);
    series.push({
      date: cursor,
      income,
      expense,
      net: income - expense
    });
    cursor = addCalendarDays(cursor, 1);
  }

  return series;
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

function isFridayDate(date) {
  if (!datePattern.test(String(date ?? ''))) return false;
  return new Date(`${date}T12:00:00+07:00`).getUTCDay() === 5;
}

function getFridaySchedule(date) {
  if (!isFridayDate(date)) return null;
  return db.prepare(`
    SELECT
      schedule_date AS scheduleDate,
      imam,
      khatib,
      bilal,
      updated_at AS updatedAt
    FROM friday_schedules
    WHERE schedule_date = ?
  `).get(date) ?? null;
}

function addCalendarDays(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, '0'),
    String(value.getUTCDate()).padStart(2, '0')
  ].join('-');
}

function upcomingFridayDates(from, count = 8) {
  const safeCount = Math.min(Math.max(Number(count) || 8, 1), 16);
  const weekday = new Date(`${from}T12:00:00+07:00`).getUTCDay();
  const daysUntilFriday = (5 - weekday + 7) % 7;
  const firstFriday = addCalendarDays(from, daysUntilFriday);

  return Array.from({ length: safeCount }, (_, index) => addCalendarDays(firstFriday, index * 7));
}

function getUpcomingFridaySchedules(from, count = 8) {
  return upcomingFridayDates(from, count).map((scheduleDate) => {
    const existing = getFridaySchedule(scheduleDate);
    return existing ?? {
      scheduleDate,
      imam: '',
      khatib: '',
      bilal: '',
      updatedAt: null
    };
  });
}

function getTransactionRecord(id) {
  return db.prepare(`
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
      created_by AS createdBy,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM transactions
    WHERE id = ?
  `).get(id) ?? null;
}


function serializeApprovalPayload(payload) {
  return JSON.stringify(payload);
}

function parseApprovalPayload(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function getApprovalRequestRecord(id) {
  const row = db.prepare(`
    SELECT
      requests.id,
      requests.action,
      requests.transaction_id AS transactionId,
      requests.status,
      requests.payload_json AS payloadJson,
      requests.submitted_by AS submittedBy,
      submitter.name AS submittedByName,
      requests.reviewed_by AS reviewedBy,
      reviewer.name AS reviewedByName,
      requests.review_note AS reviewNote,
      requests.submitted_at AS submittedAt,
      requests.reviewed_at AS reviewedAt,
      requests.updated_at AS updatedAt
    FROM transaction_approval_requests AS requests
    JOIN users AS submitter ON submitter.id = requests.submitted_by
    LEFT JOIN users AS reviewer ON reviewer.id = requests.reviewed_by
    WHERE requests.id = ?
  `).get(id);

  return row ? { ...row, proposal: parseApprovalPayload(row.payloadJson) } : null;
}

function createApprovalRequest({ action, transactionId = null, payload, submittedBy }) {
  if (transactionId) {
    const active = db.prepare(`
      SELECT id
      FROM transaction_approval_requests
      WHERE transaction_id = ?
        AND status IN ('PENDING_REVIEW', 'REVISION_REQUIRED')
      LIMIT 1
    `).get(transactionId);

    if (active) {
      const error = new Error('Masih ada pengajuan transaksi yang menunggu review atau revisi.');
      error.code = 'ACTIVE_APPROVAL_EXISTS';
      throw error;
    }
  }

  const result = db.prepare(`
    INSERT INTO transaction_approval_requests
      (action, transaction_id, status, payload_json, submitted_by)
    VALUES (?, ?, 'PENDING_REVIEW', ?, ?)
  `).run(action, transactionId, serializeApprovalPayload(payload), submittedBy);

  return getApprovalRequestRecord(Number(result.lastInsertRowid));
}

function transactionPayload({ type, input, category, existing = null, attachments = {} }) {
  return {
    type,
    amount: input.amount,
    transactionDate: input.transactionDate,
    method: input.method,
    category: category.name,
    categoryId: category.id,
    sourceDetail: type === 'INCOME' ? input.sourceDetail : '',
    description: input.description,
    evidenceFileId: attachments.evidenceFileId ?? existing?.evidenceFileId ?? null,
    evidenceOriginalName: attachments.evidenceOriginalName ?? existing?.evidenceOriginalName ?? null,
    evidenceMimeType: attachments.evidenceMimeType ?? existing?.evidenceMimeType ?? null,
    bankMutationFileId: attachments.bankMutationFileId ?? existing?.bankMutationFileId ?? null,
    bankMutationOriginalName: attachments.bankMutationOriginalName ?? existing?.bankMutationOriginalName ?? null,
    bankMutationMimeType: attachments.bankMutationMimeType ?? existing?.bankMutationMimeType ?? null
  };
}

function approvalRequestResponse(request) {
  if (!request) return null;
  const { payloadJson, ...rest } = request;
  return rest;
}

function todayIso(timeZone = PRAYER_LOCATION.timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
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
    },
    prayerTimes: {
      provider: 'aladhan',
      calculationMethod: PRAYER_LOCATION.calculationMethod,
      calculationMethodName: PRAYER_LOCATION.calculationMethodName,
      location: PRAYER_LOCATION
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

apiRouter.get('/public/display', async (req, res) => {
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

  const [prayerSchedule, nextDayPrayerSchedule] = await Promise.all([
    getProviderPrayerSchedule(date),
    getProviderPrayerSchedule(addDays(date, 1))
  ]);

  res.json({
    settings: publicSettings(),
    finance: {
      currentBalance: getSummary().currentBalance,
      totalIncome: period.totalIncome,
      totalExpense: period.totalExpense,
      from: period.from,
      to: period.to
    },
    prayerSchedule,
    nextDayPrayerSchedule,
    activities: getUpcomingActivities(date, 4).filter((item) => item.isPublished),
    fridaySchedule: getFridaySchedule(date),
    recentTransactions,
    messages: getActivePublicMessages()
  });
});

apiRouter.get('/dashboard', requireAuth, async (req, res) => {
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

  const dashboardDate = datePattern.test(String(req.query.date ?? ''))
    ? String(req.query.date)
    : todayIso();
  const schedule = await getProviderPrayerSchedule(dashboardDate);
  const activities = getUpcomingActivities(dashboardDate, 4);
  const monthFrom = firstDayOfMonth(dashboardDate);
  const chartFrom = addCalendarDays(dashboardDate, -29);

  res.json({
    summary: getSummary(),
    monthSummary: getPeriodSummary(monthFrom, dashboardDate),
    cashflow: getCashflowSeries(chartFrom, dashboardDate),
    recentTransactions,
    prayerSchedule: schedule.items,
    prayerScheduleDate: schedule.scheduleDate,
    prayerHijriDate: schedule.hijriDate ?? null,
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
      created_at AS createdAt,
      updated_at AS updatedAt
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
  requireRole('ADMIN', 'TREASURER'),
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

    if (req.user.role === 'TREASURER') {
      let request;
      const uploaded = {};

      try {
        request = createApprovalRequest({
          action: 'CREATE',
          payload: transactionPayload({
            type: input.type,
            input,
            category
          }),
          submittedBy: req.user.id
        });

        if (evidence) {
          uploaded.evidence = await uploadTransactionAttachment(evidence, {
            transactionId: `approval-${request.id}`,
            transactionDate: input.transactionDate,
            type: input.type,
            kind: 'evidence'
          });
        }

        if (mutation) {
          uploaded.mutation = await uploadTransactionAttachment(mutation, {
            transactionId: `approval-${request.id}`,
            transactionDate: input.transactionDate,
            type: input.type,
            kind: 'mutation'
          });
        }

        const proposal = transactionPayload({
          type: input.type,
          input,
          category,
          attachments: {
            evidenceFileId: uploaded.evidence?.id ?? null,
            evidenceOriginalName: uploaded.evidence?.originalName ?? null,
            evidenceMimeType: uploaded.evidence?.mimeType ?? null,
            bankMutationFileId: uploaded.mutation?.id ?? null,
            bankMutationOriginalName: uploaded.mutation?.originalName ?? null,
            bankMutationMimeType: uploaded.mutation?.mimeType ?? null
          }
        });

        db.prepare(`
          UPDATE transaction_approval_requests
          SET payload_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(serializeApprovalPayload(proposal), request.id);

        request = getApprovalRequestRecord(request.id);
      } catch (error) {
        await Promise.allSettled([
          deleteTransactionAttachment(uploaded.evidence?.id),
          deleteTransactionAttachment(uploaded.mutation?.id)
        ]);
        if (request?.id) {
          db.prepare('DELETE FROM transaction_approval_requests WHERE id = ?').run(request.id);
        }

        console.error('Transaction approval submission failed:', error);
        return res.status(error?.code === 'ACTIVE_APPROVAL_EXISTS' ? 409 : 502).json({
          message: error?.code === 'ACTIVE_APPROVAL_EXISTS'
            ? error.message
            : 'Pengajuan transaksi gagal dibuat. Periksa upload dokumen dan coba lagi.'
        });
      }

      logAudit(req, {
        action: 'TRANSACTION_APPROVAL_SUBMITTED',
        entityType: 'TRANSACTION_APPROVAL',
        entityId: request.id,
        details: {
          action: request.action,
          status: request.status,
          proposal: request.proposal
        }
      });

      return res.status(202).json({
        message: 'Pengajuan transaksi dikirim ke Ketua untuk direview.',
        approvalRequired: true,
        approvalRequest: approvalRequestResponse(request)
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

apiRouter.put(
  '/transactions/:id',
  requireAuth,
  requireRole('ADMIN', 'TREASURER'),
  (req, res) => {
    const existing = getTransactionRecord(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });

    const parsed = transactionEditSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        message: 'Perubahan transaksi belum valid.',
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

    if (
      !category ||
      category.type !== existing.type ||
      (!category.isActive && Number(category.id) !== Number(existing.categoryId))
    ) {
      return res.status(422).json({
        message: 'Kategori transaksi tidak valid untuk jenis transaksi ini.'
      });
    }

    db.prepare(`
      UPDATE transactions
      SET
        amount = ?,
        transaction_date = ?,
        method = ?,
        category = ?,
        category_id = ?,
        source_detail = ?,
        description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      input.amount,
      input.transactionDate,
      input.method,
      category.name,
      category.id,
      existing.type === 'INCOME' ? input.sourceDetail : '',
      input.description,
      existing.id
    );

    const updated = getTransactionRecord(existing.id);
    logAudit(req, {
      action: 'TRANSACTION_UPDATE',
      entityType: 'TRANSACTION',
      entityId: existing.id,
      details: {
        before: existing,
        after: updated
      }
    });

    return res.json({
      message: 'Transaksi berhasil diperbarui.',
      transaction: updated,
      summary: getSummary()
    });
  }
);

apiRouter.delete(
  '/transactions/:id',
  requireAuth,
  requireRole('ADMIN', 'TREASURER'),
  (req, res) => {
    const existing = getTransactionRecord(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });

    db.prepare('DELETE FROM transactions WHERE id = ?').run(existing.id);

    logAudit(req, {
      action: 'TRANSACTION_DELETE',
      entityType: 'TRANSACTION',
      entityId: existing.id,
      details: {
        deleted: existing,
        evidencePreservedOnGoogleDrive: Boolean(existing.evidenceFileId),
        mutationPreservedOnGoogleDrive: Boolean(existing.bankMutationFileId)
      }
    });

    return res.json({
      message: 'Transaksi berhasil dihapus. Bukti Google Drive dipertahankan untuk audit.',
      summary: getSummary()
    });
  }
);

apiRouter.post(
  '/transactions/:id/attachments',
  requireAuth,
  requireRole('ADMIN', 'TREASURER'),
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
    categories,
    cashflow: getCashflowSeries(range.from, range.to)
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

apiRouter.get('/friday-schedules', requireAuth, (req, res) => {
  if (datePattern.test(String(req.query.date ?? ''))) {
    const date = String(req.query.date);
    return res.json({
      date,
      isFriday: isFridayDate(date),
      schedule: getFridaySchedule(date)
    });
  }

  const from = datePattern.test(String(req.query.from ?? '')) ? String(req.query.from) : todayIso();
  const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 16);

  return res.json({
    from,
    data: getUpcomingFridaySchedules(from, limit)
  });
});

apiRouter.put('/friday-schedules/:date', requireAuth, requireRole('ADMIN'), (req, res) => {
  if (!datePattern.test(req.params.date) || !isFridayDate(req.params.date)) {
    return res.status(422).json({ message: 'Jadwal Jumat hanya dapat disimpan untuk tanggal hari Jumat.' });
  }

  const parsed = fridayScheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Data petugas Jumat belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const before = getFridaySchedule(req.params.date);
  const input = parsed.data;

  db.prepare(`
    INSERT INTO friday_schedules (schedule_date, imam, khatib, bilal, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(schedule_date) DO UPDATE SET
      imam = excluded.imam,
      khatib = excluded.khatib,
      bilal = excluded.bilal,
      updated_at = CURRENT_TIMESTAMP
  `).run(req.params.date, input.imam, input.khatib, input.bilal);

  const after = getFridaySchedule(req.params.date);
  logAudit(req, {
    action: before ? 'FRIDAY_SCHEDULE_UPDATE' : 'FRIDAY_SCHEDULE_CREATE',
    entityType: 'FRIDAY_SCHEDULE',
    entityId: req.params.date,
    details: { before, after }
  });

  return res.json({ schedule: after });
});

apiRouter.get('/prayer-schedules', requireAuth, async (req, res) => {
  const date = datePattern.test(String(req.query.date ?? '')) ? String(req.query.date) : todayIso();
  res.json(await getProviderPrayerSchedule(date));
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

apiRouter.put('/activities/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const existing = db.prepare(`
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
    WHERE id = ?
  `).get(req.params.id);

  if (!existing) return res.status(404).json({ message: 'Kegiatan tidak ditemukan.' });

  const parsed = activitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Perubahan kegiatan belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const input = parsed.data;
  db.prepare(`
    UPDATE activities
    SET title = ?, activity_date = ?, start_time = ?, location = ?, speaker = ?, live_url = ?, is_published = ?
    WHERE id = ?
  `).run(
    input.title,
    input.activityDate,
    input.startTime || null,
    input.location || null,
    input.speaker || null,
    input.liveUrl || null,
    input.isPublished ? 1 : 0,
    existing.id
  );

  const after = {
    id: existing.id,
    ...input
  };

  logAudit(req, {
    action: 'ACTIVITY_UPDATE',
    entityType: 'ACTIVITY',
    entityId: existing.id,
    details: { before: { ...existing, isPublished: Boolean(existing.isPublished) }, after }
  });

  return res.json(after);
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

apiRouter.put('/users/:id/status', requireAuth, requireRole('ADMIN'), (req, res) => {
  const parsed = userStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Status pengguna tidak valid.' });
  }

  const userId = Number(req.params.id);
  const existing = db.prepare(`
    SELECT id, name, email, is_active AS isActive
    FROM users
    WHERE id = ?
  `).get(userId);

  if (!existing) return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
  if (userId === Number(req.user.id) && !parsed.data.isActive) {
    return res.status(422).json({ message: 'Akun yang sedang digunakan tidak dapat dinonaktifkan.' });
  }

  db.prepare('UPDATE users SET is_active = ? WHERE id = ?')
    .run(parsed.data.isActive ? 1 : 0, userId);

  if (!parsed.data.isActive) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }

  logAudit(req, {
    action: 'USER_STATUS_UPDATE',
    entityType: 'USER',
    entityId: userId,
    details: {
      email: existing.email,
      before: { isActive: Boolean(existing.isActive) },
      after: { isActive: parsed.data.isActive }
    }
  });

  return res.json({ id: userId, isActive: parsed.data.isActive });
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
      sort_order AS sortOrder,
      (
        SELECT COUNT(*)
        FROM transactions
        WHERE transactions.category_id = transaction_categories.id
      ) AS transactionCount
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

  const existing = db.prepare(`
    SELECT
      id,
      type,
      name,
      is_active AS isActive,
      sort_order AS sortOrder
    FROM transaction_categories
    WHERE id = ?
  `).get(req.params.id);
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
      details: {
        before: {
          type: existing.type,
          name: existing.name,
          isActive: Boolean(existing.isActive),
          sortOrder: existing.sortOrder
        },
        after: {
          type: input.type,
          name: input.name,
          isActive: input.isActive,
          sortOrder: input.sortOrder
        }
      }
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
