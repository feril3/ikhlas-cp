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
import { getPushPublicKey, notifyRole, notifyUser, removeSubscription, saveSubscription } from './push.js';
import { transactionUpload } from './uploads.js';
import {
  deleteTransactionAttachment,
  getAttachmentStorageInfo,
  getTransactionAttachment,
  uploadTransactionAttachment
} from './attachmentStorage.js';
import {
  PRAYER_LOCATION,
  addDays,
  getPrayerSchedule as getProviderPrayerSchedule
} from './prayerService.js';

export const apiRouter = Router();

// Express 4 tidak menangkap Promise yang ditolak; teruskan error dari handler async ke next().
for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
  const register = apiRouter[method].bind(apiRouter);
  apiRouter[method] = (...args) => register(...args.map((handler) => (
    typeof handler === 'function' && handler.length < 4
      ? (req, res, next) => {
        try {
          const result = handler(req, res, next);
          if (result && typeof result.then === 'function') result.catch(next);
        } catch (error) {
          next(error);
        }
      }
      : handler
  )));
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

// Regex saja meloloskan tanggal seperti 2026-13-45 yang membuat Date() melempar RangeError.
function isIsoDate(value) {
  const text = String(value ?? '');
  if (!datePattern.test(text)) return false;
  const parsed = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text;
}

const timePattern = /^\d{2}:\d{2}$/;

const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.coerce.number().int().positive().max(9_999_999_999),
  transactionDate: z.string().refine(isIsoDate, 'Tanggal tidak valid.'),
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

// Masuk dengan email atau nama pengguna (mis. akun demo "admin-ikhlas").
const loginSchema = z.object({
  email: z.string().trim().min(3).max(160),
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
  activityDate: z.string().refine(isIsoDate, 'Tanggal tidak valid.'),
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
  openingBalanceDate: z.string().refine(isIsoDate, 'Tanggal tidak valid.').or(z.literal('')).optional().default(''),
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

async function getSummary() {
  const openingBalance = await getOpeningBalance();
  const totals = await db.prepare(`
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

async function getPeriodSummary(from, to) {
  const openingBalance = await getOpeningBalance();
  const before = await db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END), 0) AS net
    FROM transactions
    WHERE transaction_date < ?
  `).get(from);

  const period = await db.prepare(`
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

async function getCashflowSeries(from, to) {
  const rows = await db.prepare(`
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


async function getPrayerSchedule(date) {
  let scheduleDate = date;

  if (!scheduleDate || !isIsoDate(scheduleDate)) {
    scheduleDate = (await db.prepare('SELECT MAX(prayer_date) AS date FROM prayer_schedules').get())?.date;
  }

  let rows = scheduleDate
    ? await db.prepare(`
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
    scheduleDate = (await db.prepare(`
      SELECT MAX(prayer_date) AS date
      FROM prayer_schedules
      WHERE prayer_date <= ?
    `).get(date))?.date;

    rows = scheduleDate
      ? await db.prepare(`
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

async function getUpcomingActivities(date, limit = 6) {
  return (await db.prepare(`
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
  `).all(date, limit)).map((row) => ({ ...row, isPublished: Boolean(row.isPublished) }));
}

function isFridayDate(date) {
  if (!isIsoDate(String(date ?? ''))) return false;
  return new Date(`${date}T12:00:00+07:00`).getUTCDay() === 5;
}

async function getFridaySchedule(date) {
  if (!isFridayDate(date)) return null;
  return (await db.prepare(`
    SELECT
      schedule_date AS scheduleDate,
      imam,
      khatib,
      bilal,
      updated_at AS updatedAt
    FROM friday_schedules
    WHERE schedule_date = ?
  `).get(date)) ?? null;
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

async function getUpcomingFridaySchedules(from, count = 8) {
  return Promise.all(upcomingFridayDates(from, count).map(async scheduleDate => {
    const existing = await getFridaySchedule(scheduleDate);
    return existing ?? {
      scheduleDate,
      imam: '',
      khatib: '',
      bilal: '',
      updatedAt: null
    };
  }));
}

async function getTransactionRecord(id, executor = db) {
  return (await executor.prepare(`
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
  `).get(id)) ?? null;
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

async function getApprovalRequestRecord(id) {
  const row = await db.prepare(`
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

async function createApprovalRequest({ action, transactionId = null, payload, submittedBy }) {
  if (transactionId) {
    const active = await db.prepare(`
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

  const result = await db.prepare(`
    INSERT INTO transaction_approval_requests
      (action, transaction_id, status, payload_json, submitted_by)
    VALUES (?, ?, 'PENDING_REVIEW', ?, ?)
  `).run(action, transactionId, serializeApprovalPayload(payload), submittedBy);

  return await getApprovalRequestRecord(Number(result.lastInsertRowid));
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
    bankMutationMimeType: attachments.bankMutationMimeType ?? existing?.bankMutationMimeType ?? null,
    baseUpdatedAt: existing?.updatedAt ?? null
  };
}

// Notifikasi push PWA untuk alur approval: Ketua/Admin diberi tahu pengajuan baru, Bendahara diberi tahu hasil review.
const ACTION_TITLES = {
  CREATE: 'Pengajuan transaksi baru',
  UPDATE: 'Pengajuan perubahan transaksi',
  DELETE: 'Pengajuan penghapusan transaksi',
  DOCUMENT: 'Pengajuan penggantian dokumen',
  RESUBMIT: 'Pengajuan dikirim ulang'
};

function rupiahText(amount) {
  return 'Rp' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(amount) || 0);
}

function approvalSummaryText(request) {
  const proposal = request?.proposal ?? {};
  const kind = proposal.type === 'EXPENSE' ? 'Kas keluar' : proposal.type === 'INCOME' ? 'Kas masuk' : 'Transaksi';
  return [kind, proposal.amount ? rupiahText(proposal.amount) : null, proposal.category ?? null].filter(Boolean).join(' · ');
}

async function notifyReviewers(request, kind, submitterName) {
  await notifyRole('ADMIN', {
    title: ACTION_TITLES[kind] ?? ACTION_TITLES.CREATE,
    body: `${approvalSummaryText(request)} dari ${submitterName}. Ketuk untuk mereview.`,
    url: `/approvals?id=${request.id}`,
    tag: `approval-${request.id}`
  });
}

async function notifySubmitter(request, decision, note) {
  const approved = decision === 'APPROVE';
  await notifyUser(request.submittedBy, {
    title: approved ? 'Pengajuan disetujui' : 'Pengajuan perlu revisi',
    body: approved
      ? `${approvalSummaryText(request)} sudah diposting.`
      : `${approvalSummaryText(request)}. Catatan Ketua: ${note}`,
    url: `/approvals?id=${request.id}`,
    tag: `approval-${request.id}`
  });
}

async function approvalRequestResponse(request) {
  if (!request) return null;
  const { payloadJson, ...rest } = request;
  return {
    ...rest,
    currentTransaction: request.transactionId
      ? await getTransactionRecord(request.transactionId)
      : null
  };
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
  const to = isIsoDate(String(req.query.to ?? '')) ? String(req.query.to) : todayIso();
  const from = isIsoDate(String(req.query.from ?? '')) ? String(req.query.from) : firstDayOfMonth(to);
  if (from > to) return null;
  return { from, to };
}

function escapeCsv(value) {
  let string = String(value ?? '');
  // Cegah CSV/formula injection saat file dibuka di Excel atau Google Sheets.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(string)) string = `'${string}`;
  if (/[",\n]/.test(string)) return `"${string.replaceAll('"', '""')}"`;
  return string;
}

async function publicSettings() {
  const raw = await getSettings([
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

async function adminSettings() {
  const publicValues = await publicSettings();
  const raw = await getSettings([
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

async function getActivePublicMessages() {
  return await db.prepare(`
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
    storage: getAttachmentStorageInfo(),
    prayerTimes: {
      provider: 'aladhan',
      calculationMethod: PRAYER_LOCATION.calculationMethod,
      calculationMethodName: PRAYER_LOCATION.calculationMethodName,
      location: PRAYER_LOCATION
    }
  });
});

apiRouter.get('/auth/status', async (req, res) => {
  const userCount = (await db.prepare('SELECT COUNT(*) AS count FROM users').get()).count;
  const user = await getAuthenticatedUser(req);
  res.json({
    setupRequired: userCount === 0,
    authenticated: Boolean(user),
    user
  });
});

apiRouter.post('/auth/setup', async (req, res) => {
  const userCount = (await db.prepare('SELECT COUNT(*) AS count FROM users').get()).count;
  if (userCount > 0) {
    return res.status(409).json({ message: 'Setup awal sudah diselesaikan.' });
  }

  const parsed = setupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Data akun belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const role = await db.prepare("SELECT id FROM roles WHERE name = 'ADMIN'").get();
  const input = parsed.data;

  const result = await db.prepare(`
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

  const session = await createSession(user.id);
  setSessionCookie(res, session.token);
  await logAudit(req, {
    userId: user.id,
    action: 'AUTH_SETUP',
    entityType: 'USER',
    entityId: user.id,
    details: { email: user.email, role: user.role }
  });

  return res.status(201).json({ user });
});

apiRouter.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Isi email atau nama pengguna dan kata sandi.' });
  }

  const account = await db.prepare(`
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
    await logAudit(req, {
      action: 'AUTH_LOGIN_FAILED',
      entityType: 'USER',
      details: { email: parsed.data.email.toLowerCase() }
    });
    return res.status(401).json({ message: 'Email/nama pengguna atau kata sandi salah.' });
  }

  const session = await createSession(account.id);
  setSessionCookie(res, session.token);

  const user = {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    isActive: account.isActive
  };

  await logAudit(req, {
    userId: account.id,
    action: 'AUTH_LOGIN',
    entityType: 'USER',
    entityId: account.id
  });

  return res.json({ user });
});

apiRouter.post('/auth/logout', requireAuth, async (req, res) => {
  await logAudit(req, {
    action: 'AUTH_LOGOUT',
    entityType: 'USER',
    entityId: req.user.id
  });
  await destroySession(req);
  clearSessionCookie(res);
  res.json({ message: 'Logout berhasil.' });
});

apiRouter.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Jumlah pengajuan untuk badge navigasi: Ketua/Admin melihat yang menunggu review,
// Bendahara melihat pengajuannya yang perlu revisi atau masih menunggu.
apiRouter.get('/notifications/summary', requireAuth, async (req, res) => {
  if (req.user.role === 'ADMIN') {
    const row = await db.prepare(`
      SELECT COUNT(*) AS count FROM transaction_approval_requests WHERE status = 'PENDING_REVIEW'
    `).get();
    return res.json({ pendingReview: Number(row?.count ?? 0), revisionRequired: 0 });
  }
  const rows = await db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM transaction_approval_requests
    WHERE submitted_by = ? AND status IN ('PENDING_REVIEW', 'REVISION_REQUIRED')
    GROUP BY status
  `).all(req.user.id);
  const count = (status) => Number(rows.find((row) => row.status === status)?.count ?? 0);
  return res.json({ pendingReview: count('PENDING_REVIEW'), revisionRequired: count('REVISION_REQUIRED') });
});

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(10).max(200),
    auth: z.string().min(8).max(100)
  })
});

apiRouter.get('/push/public-key', requireAuth, (_req, res) => {
  res.json({ publicKey: getPushPublicKey() });
});

apiRouter.post('/push/subscriptions', requireAuth, async (req, res) => {
  if (!getPushPublicKey()) {
    return res.status(503).json({ message: 'Notifikasi belum diaktifkan di server.' });
  }
  const parsed = pushSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Data langganan notifikasi tidak valid.' });
  }
  await saveSubscription(req.user.id, parsed.data, req.get('user-agent')?.slice(0, 250));
  return res.status(201).json({ message: 'Notifikasi aktif di perangkat ini.' });
});

apiRouter.delete('/push/subscriptions', requireAuth, async (req, res) => {
  const endpoint = String(req.body?.endpoint ?? '');
  if (endpoint) await removeSubscription(req.user.id, endpoint);
  return res.status(204).end();
});

apiRouter.get('/public/display', async (req, res) => {
  const date = isIsoDate(String(req.query.date ?? '')) ? String(req.query.date) : todayIso();
  const period = await getPeriodSummary(firstDayOfMonth(date), date);

  const recentTransactions = await db.prepare(`
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
    settings: await publicSettings(),
    finance: {
      currentBalance: (await getSummary()).currentBalance,
      totalIncome: period.totalIncome,
      totalExpense: period.totalExpense,
      from: period.from,
      to: period.to
    },
    prayerSchedule,
    nextDayPrayerSchedule,
    activities: (await getUpcomingActivities(date, 4)).filter((item) => item.isPublished),
    fridaySchedule: await getFridaySchedule(date),
    recentTransactions,
    messages: await getActivePublicMessages()
  });
});

apiRouter.get('/dashboard', requireAuth, async (req, res) => {
  const recentTransactions = await db.prepare(`
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

  const dashboardDate = isIsoDate(String(req.query.date ?? ''))
    ? String(req.query.date)
    : todayIso();
  const schedule = await getProviderPrayerSchedule(dashboardDate);
  const activities = await getUpcomingActivities(dashboardDate, 4);
  const monthFrom = firstDayOfMonth(dashboardDate);
  const chartFrom = addCalendarDays(dashboardDate, -29);

  res.json({
    summary: await getSummary(),
    monthSummary: await getPeriodSummary(monthFrom, dashboardDate),
    cashflow: await getCashflowSeries(chartFrom, dashboardDate),
    recentTransactions,
    prayerSchedule: schedule.items,
    prayerScheduleDate: schedule.scheduleDate,
    prayerHijriDate: schedule.hijriDate ?? null,
    activities
  });
});

apiRouter.get('/transactions', requireAuth, async (req, res) => {
  const clauses = [];
  const params = [];

  if (req.query.type === 'INCOME' || req.query.type === 'EXPENSE') {
    clauses.push('type = ?');
    params.push(req.query.type);
  }
  if (isIsoDate(String(req.query.from ?? ''))) {
    clauses.push('transaction_date >= ?');
    params.push(req.query.from);
  }
  if (isIsoDate(String(req.query.to ?? ''))) {
    clauses.push('transaction_date <= ?');
    params.push(req.query.to);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await db.prepare(`
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

  res.json({ data: rows, summary: await getSummary() });
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
    const category = await db.prepare(`
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
        request = await createApprovalRequest({
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

        await db.prepare(`
          UPDATE transaction_approval_requests
          SET payload_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(serializeApprovalPayload(proposal), request.id);

        request = await getApprovalRequestRecord(request.id);
      } catch (error) {
        await Promise.allSettled([
          deleteTransactionAttachment(uploaded.evidence?.id),
          deleteTransactionAttachment(uploaded.mutation?.id)
        ]);
        if (request?.id) {
          await db.prepare('DELETE FROM transaction_approval_requests WHERE id = ?').run(request.id);
        }

        console.error('Transaction approval submission failed:', error);
        return res.status(error?.code === 'ACTIVE_APPROVAL_EXISTS' ? 409 : 502).json({
          message: error?.code === 'ACTIVE_APPROVAL_EXISTS'
            ? error.message
            : 'Pengajuan transaksi gagal dibuat. Periksa upload dokumen dan coba lagi.'
        });
      }

      await logAudit(req, {
        action: 'TRANSACTION_APPROVAL_SUBMITTED',
        entityType: 'TRANSACTION_APPROVAL',
        entityId: request.id,
        details: {
          action: request.action,
          status: request.status,
          proposal: request.proposal
        }
      });

      await notifyReviewers(request, 'CREATE', req.user.name);
      return res.status(202).json({
        message: 'Pengajuan transaksi dikirim ke Ketua untuk direview.',
        approvalRequired: true,
        approvalRequest: await approvalRequestResponse(request)
      });
    }

    const insert = db.prepare(`
      INSERT INTO transactions
        (type, amount, transaction_date, method, category, category_id, source_detail, description, created_by)
      VALUES
        (@type, @amount, @transactionDate, @method, @category, @categoryId, @sourceDetail, @description, @createdBy)
    `);

    const created = await insert.run({
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

      await db.prepare(`
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
      await db.prepare('DELETE FROM transactions WHERE id = ?').run(transactionId);

      console.error('Google Drive upload failed:', error);
      return res.status(502).json({
        message: 'Transaksi tidak disimpan karena bukti gagal diunggah. Coba lagi.'
      });
    }

    const transaction = await db.prepare(`
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

    const summary = await getSummary();
    await logAudit(req, {
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

    return res.status(201).json({
      message: 'Transaksi berhasil disimpan.',
      transaction,
      summary
    });
  }
);

apiRouter.put(
  '/transactions/:id',
  requireAuth,
  requireRole('ADMIN', 'TREASURER'),
  async (req, res) => {
    const existing = await getTransactionRecord(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });

    const parsed = transactionEditSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        message: 'Perubahan transaksi belum valid.',
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const input = parsed.data;
    const category = await db.prepare(`
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

    if (req.user.role === 'TREASURER') {
      let request;
      try {
        request = await createApprovalRequest({
          action: 'UPDATE',
          transactionId: existing.id,
          payload: transactionPayload({
            type: existing.type,
            input,
            category,
            existing
          }),
          submittedBy: req.user.id
        });
      } catch (error) {
        if (error?.code === 'ACTIVE_APPROVAL_EXISTS') {
          return res.status(409).json({ message: error.message });
        }
        throw error;
      }

      await logAudit(req, {
        action: 'TRANSACTION_APPROVAL_SUBMITTED',
        entityType: 'TRANSACTION_APPROVAL',
        entityId: request.id,
        details: {
          action: request.action,
          transactionId: existing.id,
          before: existing,
          proposal: request.proposal
        }
      });

      await notifyReviewers(request, 'UPDATE', req.user.name);
      return res.status(202).json({
        message: 'Perubahan transaksi dikirim ke Ketua untuk direview.',
        approvalRequired: true,
        approvalRequest: await approvalRequestResponse(request)
      });
    }

    await db.prepare(`
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

    const updated = await getTransactionRecord(existing.id);
    await logAudit(req, {
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
      summary: await getSummary()
    });
  }
);

apiRouter.delete(
  '/transactions/:id',
  requireAuth,
  requireRole('ADMIN', 'TREASURER'),
  async (req, res) => {
    const existing = await getTransactionRecord(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });

    if (req.user.role === 'TREASURER') {
      let request;
      try {
        request = await createApprovalRequest({
          action: 'DELETE',
          transactionId: existing.id,
          payload: existing,
          submittedBy: req.user.id
        });
      } catch (error) {
        if (error?.code === 'ACTIVE_APPROVAL_EXISTS') {
          return res.status(409).json({ message: error.message });
        }
        throw error;
      }

      await logAudit(req, {
        action: 'TRANSACTION_APPROVAL_SUBMITTED',
        entityType: 'TRANSACTION_APPROVAL',
        entityId: request.id,
        details: {
          action: request.action,
          transactionId: existing.id,
          snapshot: existing
        }
      });

      await notifyReviewers(request, 'DELETE', req.user.name);
      return res.status(202).json({
        message: 'Penghapusan transaksi dikirim ke Ketua untuk direview.',
        approvalRequired: true,
        approvalRequest: await approvalRequestResponse(request)
      });
    }

    await db.prepare('DELETE FROM transactions WHERE id = ?').run(existing.id);

    await logAudit(req, {
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
      summary: await getSummary()
    });
  }
);

apiRouter.post(
  '/transactions/:id/attachments',
  requireAuth,
  requireRole('ADMIN', 'TREASURER'),
  transactionUpload,
  async (req, res) => {
    const transaction = await getTransactionRecord(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
    }

    const evidence = req.files?.evidence?.[0] ?? null;
    const mutation = req.files?.mutation?.[0] ?? null;

    if (!evidence && !mutation) {
      return res.status(422).json({ message: 'Tidak ada dokumen yang dipilih.' });
    }

    if (req.user.role === 'TREASURER') {
      let request;
      const uploaded = {};

      try {
        request = await createApprovalRequest({
          action: 'UPDATE',
          transactionId: transaction.id,
          payload: transaction,
          submittedBy: req.user.id
        });

        if (evidence) {
          uploaded.evidence = await uploadTransactionAttachment(evidence, {
            transactionId: `approval-${request.id}`,
            transactionDate: transaction.transactionDate,
            type: transaction.type,
            kind: 'evidence'
          });
        }

        if (mutation) {
          uploaded.mutation = await uploadTransactionAttachment(mutation, {
            transactionId: `approval-${request.id}`,
            transactionDate: transaction.transactionDate,
            type: transaction.type,
            kind: 'mutation'
          });
        }

        const proposal = {
          ...transaction,
          baseUpdatedAt: transaction.updatedAt,
          evidenceFileId: uploaded.evidence?.id ?? transaction.evidenceFileId,
          evidenceOriginalName: uploaded.evidence?.originalName ?? transaction.evidenceOriginalName,
          evidenceMimeType: uploaded.evidence?.mimeType ?? transaction.evidenceMimeType,
          bankMutationFileId: uploaded.mutation?.id ?? transaction.bankMutationFileId,
          bankMutationOriginalName: uploaded.mutation?.originalName ?? transaction.bankMutationOriginalName,
          bankMutationMimeType: uploaded.mutation?.mimeType ?? transaction.bankMutationMimeType
        };

        await db.prepare(`
          UPDATE transaction_approval_requests
          SET payload_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(serializeApprovalPayload(proposal), request.id);

        request = await getApprovalRequestRecord(request.id);
      } catch (error) {
        await Promise.allSettled([
          deleteTransactionAttachment(uploaded.evidence?.id),
          deleteTransactionAttachment(uploaded.mutation?.id)
        ]);
        if (request?.id) {
          await db.prepare('DELETE FROM transaction_approval_requests WHERE id = ?').run(request.id);
        }
        if (error?.code === 'ACTIVE_APPROVAL_EXISTS') {
          return res.status(409).json({ message: error.message });
        }
        console.error('Transaction attachment approval submission failed:', error);
        return res.status(502).json({ message: 'Pengajuan perubahan dokumen gagal dibuat.' });
      }

      await logAudit(req, {
        action: 'TRANSACTION_APPROVAL_SUBMITTED',
        entityType: 'TRANSACTION_APPROVAL',
        entityId: request.id,
        details: {
          action: request.action,
          transactionId: transaction.id,
          documentUpdate: true
        }
      });

      await notifyReviewers(request, 'DOCUMENT', req.user.name);
      return res.status(202).json({
        message: 'Perubahan dokumen dikirim ke Ketua untuk direview.',
        approvalRequired: true,
        approvalRequest: await approvalRequestResponse(request)
      });
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

      await db.prepare(`
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
      return res.status(502).json({ message: 'Dokumen gagal diunggah. Coba lagi.' });
    }

    await Promise.allSettled([
      evidence ? deleteTransactionAttachment(transaction.evidenceFileId) : Promise.resolve(),
      mutation ? deleteTransactionAttachment(transaction.bankMutationFileId) : Promise.resolve()
    ]);

    await logAudit(req, {
      action: 'TRANSACTION_ATTACHMENTS_UPDATE',
      entityType: 'TRANSACTION',
      entityId: transaction.id,
      details: {
        evidenceOnGoogleDrive: Boolean(evidence),
        bankMutationOnGoogleDrive: Boolean(mutation)
      }
    });

    return res.json({
      message: 'Dokumen transaksi berhasil diperbarui.',
      evidenceFileId: uploaded.evidence?.id ?? transaction.evidenceFileId,
      bankMutationFileId: uploaded.mutation?.id ?? transaction.bankMutationFileId
    });
  }
);

apiRouter.get('/transactions/:id/attachments/:kind', requireAuth, async (req, res) => {
  const transaction = await db.prepare(`
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
        res.status(502).json({ message: 'Dokumen gagal dibaca.' });
      } else {
        res.destroy(error);
      }
    });

    file.stream.pipe(res);
  } catch (error) {
    console.error('Google Drive download failed:', error);
    return res.status(502).json({ message: 'Dokumen gagal diambil.' });
  }
});


apiRouter.post(
  '/transaction-approvals/:id/attachments',
  requireAuth,
  requireRole('TREASURER'),
  transactionUpload,
  async (req, res) => {
    const request = await getApprovalRequestRecord(req.params.id);
    if (!request) return res.status(404).json({ message: 'Pengajuan tidak ditemukan.' });
    if (Number(request.submittedBy) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Pengajuan ini bukan milik akun Bendahara yang sedang digunakan.' });
    }
    if (request.status !== 'REVISION_REQUIRED') {
      return res.status(409).json({ message: 'Dokumen hanya dapat diganti saat pengajuan meminta revisi.' });
    }

    const evidence = req.files?.evidence?.[0] ?? null;
    const mutation = req.files?.mutation?.[0] ?? null;
    if (!evidence && !mutation) {
      return res.status(422).json({ message: 'Tidak ada dokumen revisi yang dipilih.' });
    }

    const uploaded = {};
    try {
      if (evidence) {
        uploaded.evidence = await uploadTransactionAttachment(evidence, {
          transactionId: `approval-${request.id}`,
          transactionDate: request.proposal.transactionDate,
          type: request.proposal.type,
          kind: 'evidence'
        });
      }
      if (mutation) {
        uploaded.mutation = await uploadTransactionAttachment(mutation, {
          transactionId: `approval-${request.id}`,
          transactionDate: request.proposal.transactionDate,
          type: request.proposal.type,
          kind: 'mutation'
        });
      }
    } catch (error) {
      await Promise.allSettled([
        deleteTransactionAttachment(uploaded.evidence?.id),
        deleteTransactionAttachment(uploaded.mutation?.id)
      ]);
      console.error('Approval revision attachment upload failed:', error);
      return res.status(502).json({ message: 'Dokumen revisi gagal diunggah. Coba lagi.' });
    }

    const currentTransaction = request.transactionId
      ? await getTransactionRecord(request.transactionId)
      : null;
    const previous = request.proposal;
    const proposal = {
      ...previous,
      evidenceFileId: uploaded.evidence?.id ?? previous.evidenceFileId ?? null,
      evidenceOriginalName: uploaded.evidence?.originalName ?? previous.evidenceOriginalName ?? null,
      evidenceMimeType: uploaded.evidence?.mimeType ?? previous.evidenceMimeType ?? null,
      bankMutationFileId: uploaded.mutation?.id ?? previous.bankMutationFileId ?? null,
      bankMutationOriginalName: uploaded.mutation?.originalName ?? previous.bankMutationOriginalName ?? null,
      bankMutationMimeType: uploaded.mutation?.mimeType ?? previous.bankMutationMimeType ?? null
    };

    await db.prepare(`
      UPDATE transaction_approval_requests
      SET payload_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(serializeApprovalPayload(proposal), request.id);

    await Promise.allSettled([
      evidence
        && previous.evidenceFileId
        && previous.evidenceFileId !== currentTransaction?.evidenceFileId
        && previous.evidenceFileId !== uploaded.evidence?.id
        ? deleteTransactionAttachment(previous.evidenceFileId)
        : Promise.resolve(),
      mutation
        && previous.bankMutationFileId
        && previous.bankMutationFileId !== currentTransaction?.bankMutationFileId
        && previous.bankMutationFileId !== uploaded.mutation?.id
        ? deleteTransactionAttachment(previous.bankMutationFileId)
        : Promise.resolve()
    ]);

    const updated = await getApprovalRequestRecord(request.id);
    await logAudit(req, {
      action: 'TRANSACTION_APPROVAL_DOCUMENTS_UPDATED',
      entityType: 'TRANSACTION_APPROVAL',
      entityId: request.id,
      details: {
        evidenceUpdated: Boolean(evidence),
        mutationUpdated: Boolean(mutation)
      }
    });

    return res.json({
      message: 'Dokumen revisi berhasil diperbarui.',
      approvalRequest: await approvalRequestResponse(updated)
    });
  }
);

apiRouter.get(
  '/transaction-approvals/:id/attachments/:kind',
  requireAuth,
  requireRole('ADMIN', 'TREASURER'),
  async (req, res) => {
    const request = await getApprovalRequestRecord(req.params.id);
    if (!request) return res.status(404).json({ message: 'Pengajuan tidak ditemukan.' });

    if (req.user.role === 'TREASURER' && Number(request.submittedBy) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Dokumen pengajuan ini tidak dapat diakses.' });
    }

    const isEvidence = req.params.kind === 'evidence';
    const isMutation = req.params.kind === 'mutation';
    if (!isEvidence && !isMutation) {
      return res.status(404).json({ message: 'Jenis dokumen tidak dikenal.' });
    }

    const proposal = request.proposal ?? {};
    const fileId = isEvidence ? proposal.evidenceFileId : proposal.bankMutationFileId;
    const originalName = isEvidence ? proposal.evidenceOriginalName : proposal.bankMutationOriginalName;
    const storedMimeType = isEvidence ? proposal.evidenceMimeType : proposal.bankMutationMimeType;

    if (!fileId) {
      return res.status(404).json({ message: 'Dokumen pengajuan tidak tersedia.' });
    }

    try {
      const file = await getTransactionAttachment(fileId);
      const mimeType = file.metadata.mimeType || storedMimeType || 'application/octet-stream';
      const fileName = originalName || file.metadata.name || 'attachment';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      res.setHeader('Cache-Control', 'private, no-store');

      file.stream.on('error', (error) => {
        console.error('Approval attachment stream failed:', error);
        if (!res.headersSent) {
          res.status(502).json({ message: 'Dokumen pengajuan gagal dibaca.' });
        } else {
          res.destroy(error);
        }
      });

      file.stream.pipe(res);
    } catch (error) {
      console.error('Approval attachment download failed:', error);
      return res.status(502).json({ message: 'Dokumen pengajuan gagal diambil.' });
    }
  }
);

apiRouter.get(
  '/transaction-approvals',
  requireAuth,
  requireRole('ADMIN', 'TREASURER'),
  async (req, res) => {
    const params = [];
    const where = req.user.role === 'TREASURER'
      ? (params.push(req.user.id), 'WHERE requests.submitted_by = ?')
      : '';

    const rows = await db.prepare(`
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
      ${where}
      ORDER BY
        CASE requests.status
          WHEN 'PENDING_REVIEW' THEN 0
          WHEN 'REVISION_REQUIRED' THEN 1
          ELSE 2
        END,
        requests.updated_at DESC
      LIMIT 100
    `).all(...params);

    return res.json({
      data: await Promise.all(rows.map(async row => await approvalRequestResponse({
        ...row,
        proposal: parseApprovalPayload(row.payloadJson)
      })))
    });
  }
);

apiRouter.put(
  '/transaction-approvals/:id/review',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    const parsed = transactionApprovalReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ message: 'Keputusan review tidak valid.' });
    }

    const request = await getApprovalRequestRecord(req.params.id);
    if (!request) return res.status(404).json({ message: 'Pengajuan tidak ditemukan.' });
    if (request.status !== 'PENDING_REVIEW') {
      return res.status(409).json({ message: 'Pengajuan ini tidak lagi menunggu review.' });
    }

    const { decision, note } = parsed.data;
    if (decision === 'REVISION_REQUIRED' && note.length < 3) {
      return res.status(422).json({ message: 'Catatan revisi wajib diisi.' });
    }

    if (decision === 'REVISION_REQUIRED') {
      await db.prepare(`
        UPDATE transaction_approval_requests
        SET
          status = 'REVISION_REQUIRED',
          reviewed_by = ?,
          review_note = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.user.id, note, request.id);

      await logAudit(req, {
        action: 'TRANSACTION_APPROVAL_REVISION_REQUIRED',
        entityType: 'TRANSACTION_APPROVAL',
        entityId: request.id,
        details: {
          action: request.action,
          transactionId: request.transactionId,
          submittedBy: request.submittedBy,
          note
        }
      });

      await notifySubmitter(request, 'REVISION_REQUIRED', note);

      return res.json({
        message: 'Pengajuan dikembalikan ke Bendahara untuk direvisi.',
        approvalRequest: await approvalRequestResponse(await getApprovalRequestRecord(request.id))
      });
    }

    const proposal = request.proposal;
    if (request.action !== 'DELETE' && proposal?.type === 'EXPENSE' && !proposal.evidenceFileId) {
      return res.status(422).json({ message: 'Kas keluar tanpa bukti transaksi tidak dapat disetujui. Minta revisi kepada Bendahara.' });
    }
    let transactionId = request.transactionId;
    let before = null;
    let after = null;

    try {
      await db.transaction(async (tx) => {
        if (request.action === 'CREATE') {
          const created = await tx.prepare(`
            INSERT INTO transactions (
              type,
              amount,
              transaction_date,
              method,
              category,
              category_id,
              source_detail,
              description,
              evidence_drive_file_id,
              evidence_original_name,
              evidence_mime_type,
              mutation_drive_file_id,
              mutation_original_name,
              mutation_mime_type,
              created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            proposal.type,
            proposal.amount,
            proposal.transactionDate,
            proposal.method,
            proposal.category,
            proposal.categoryId,
            proposal.sourceDetail || '',
            proposal.description || '',
            proposal.evidenceFileId || null,
            proposal.evidenceOriginalName || null,
            proposal.evidenceMimeType || null,
            proposal.bankMutationFileId || null,
            proposal.bankMutationOriginalName || null,
            proposal.bankMutationMimeType || null,
            request.submittedBy
          );
          transactionId = Number(created.lastInsertRowid);
        } else if (request.action === 'UPDATE') {
          before = await getTransactionRecord(request.transactionId, tx);
          if (!before) throw new Error('Transaksi target tidak ditemukan.');
          if (proposal.baseUpdatedAt && before.updatedAt !== proposal.baseUpdatedAt) {
            throw new Error('Transaksi berubah setelah pengajuan dibuat. Minta Bendahara memperbarui pengajuan.');
          }

          await tx.prepare(`
            UPDATE transactions
            SET
              amount = ?,
              transaction_date = ?,
              method = ?,
              category = ?,
              category_id = ?,
              source_detail = ?,
              description = ?,
              evidence_drive_file_id = ?,
              evidence_original_name = ?,
              evidence_mime_type = ?,
              mutation_drive_file_id = ?,
              mutation_original_name = ?,
              mutation_mime_type = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            proposal.amount,
            proposal.transactionDate,
            proposal.method,
            proposal.category,
            proposal.categoryId,
            proposal.sourceDetail || '',
            proposal.description || '',
            proposal.evidenceFileId || null,
            proposal.evidenceOriginalName || null,
            proposal.evidenceMimeType || null,
            proposal.bankMutationFileId || null,
            proposal.bankMutationOriginalName || null,
            proposal.bankMutationMimeType || null,
            request.transactionId
          );
        } else if (request.action === 'DELETE') {
          before = await getTransactionRecord(request.transactionId, tx);
          if (!before) throw new Error('Transaksi target tidak ditemukan.');
          const expectedUpdatedAt = proposal.baseUpdatedAt || proposal.updatedAt;
          if (expectedUpdatedAt && before.updatedAt !== expectedUpdatedAt) {
            throw new Error('Transaksi berubah setelah pengajuan penghapusan dibuat. Ajukan ulang penghapusan.');
          }
          await tx.prepare('DELETE FROM transactions WHERE id = ?').run(request.transactionId);
        }

        if (request.action !== 'DELETE') {
          after = await getTransactionRecord(transactionId, tx);
        }

        await tx.prepare(`
          UPDATE transaction_approval_requests
          SET
            transaction_id = ?,
            status = 'APPROVED',
            reviewed_by = ?,
            review_note = ?,
            reviewed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(request.action === 'DELETE' ? null : transactionId, req.user.id, note || null, request.id);
      });
    } catch (error) {
      console.error('Transaction approval apply failed:', error);
      return res.status(409).json({ message: error.message || 'Pengajuan gagal diterapkan.' });
    }

    await logAudit(req, {
      action: 'TRANSACTION_APPROVAL_APPROVED',
      entityType: 'TRANSACTION_APPROVAL',
      entityId: request.id,
      details: {
        action: request.action,
        transactionId,
        submittedBy: request.submittedBy,
        before,
        after
      }
    });

    if (request.action === 'UPDATE' && before && after) {
      await Promise.allSettled([
        before.evidenceFileId && before.evidenceFileId !== after.evidenceFileId
          ? deleteTransactionAttachment(before.evidenceFileId)
          : Promise.resolve(),
        before.bankMutationFileId && before.bankMutationFileId !== after.bankMutationFileId
          ? deleteTransactionAttachment(before.bankMutationFileId)
          : Promise.resolve()
      ]);
    }

    await notifySubmitter(request, 'APPROVE');

    return res.json({
      message: request.action === 'DELETE'
        ? 'Penghapusan transaksi disetujui dan diterapkan.'
        : 'Pengajuan disetujui dan transaksi sudah diposting.',
      approvalRequest: await approvalRequestResponse(await getApprovalRequestRecord(request.id)),
      transaction: after,
      summary: await getSummary()
    });
  }
);

apiRouter.put(
  '/transaction-approvals/:id/resubmit',
  requireAuth,
  requireRole('TREASURER'),
  async (req, res) => {
    const request = await getApprovalRequestRecord(req.params.id);
    if (!request) return res.status(404).json({ message: 'Pengajuan tidak ditemukan.' });
    if (Number(request.submittedBy) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Pengajuan ini bukan milik akun Bendahara yang sedang digunakan.' });
    }
    if (request.status !== 'REVISION_REQUIRED') {
      return res.status(409).json({ message: 'Pengajuan ini tidak sedang menunggu revisi.' });
    }

    let proposal = request.proposal;

    if (request.action === 'DELETE') {
      const current = await getTransactionRecord(request.transactionId);
      if (!current) return res.status(404).json({ message: 'Transaksi target tidak ditemukan.' });
      proposal = { ...current, baseUpdatedAt: current.updatedAt };
    } else {
      const schema = request.action === 'CREATE' ? transactionSchema : transactionEditSchema;
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(422).json({
          message: 'Perbaikan transaksi belum valid.',
          errors: parsed.error.flatten().fieldErrors
        });
      }

      const type = request.action === 'CREATE' ? parsed.data.type : request.proposal.type;
      const input = request.action === 'CREATE' ? parsed.data : { ...parsed.data, type };
      const existing = request.transactionId ? await getTransactionRecord(request.transactionId) : null;
      const category = await db.prepare(`
        SELECT id, type, name, is_active AS isActive
        FROM transaction_categories
        WHERE id = ?
        LIMIT 1
      `).get(input.categoryId);

      if (
        !category ||
        category.type !== type ||
        (!category.isActive && Number(category.id) !== Number(existing?.categoryId))
      ) {
        return res.status(422).json({ message: 'Kategori transaksi tidak valid atau sudah dinonaktifkan.' });
      }

      proposal = transactionPayload({
        type,
        input,
        category,
        existing: request.action === 'UPDATE' ? existing : null,
        attachments: {
          evidenceFileId: request.proposal.evidenceFileId ?? null,
          evidenceOriginalName: request.proposal.evidenceOriginalName ?? null,
          evidenceMimeType: request.proposal.evidenceMimeType ?? null,
          bankMutationFileId: request.proposal.bankMutationFileId ?? null,
          bankMutationOriginalName: request.proposal.bankMutationOriginalName ?? null,
          bankMutationMimeType: request.proposal.bankMutationMimeType ?? null
        }
      });

      if (proposal.type === 'EXPENSE' && !proposal.evidenceFileId) {
        return res.status(422).json({ message: 'Bukti transaksi wajib dilampirkan untuk kas keluar.' });
      }
    }

    await db.prepare(`
      UPDATE transaction_approval_requests
      SET
        status = 'PENDING_REVIEW',
        payload_json = ?,
        reviewed_by = NULL,
        review_note = NULL,
        reviewed_at = NULL,
        submitted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(serializeApprovalPayload(proposal), request.id);

    const updated = await getApprovalRequestRecord(request.id);
    await logAudit(req, {
      action: 'TRANSACTION_APPROVAL_RESUBMITTED',
      entityType: 'TRANSACTION_APPROVAL',
      entityId: request.id,
      details: {
        action: request.action,
        transactionId: request.transactionId,
        proposal: updated.proposal
      }
    });

    await notifyReviewers(updated, 'RESUBMIT', req.user.name);
    return res.json({
      message: 'Perbaikan dikirim ulang ke Ketua untuk direview.',
      approvalRequired: true,
      approvalRequest: await approvalRequestResponse(updated)
    });
  }
);

apiRouter.get('/reports/summary', requireAuth, async (req, res) => {
  const range = validateDateRange(req);
  if (!range) return res.status(422).json({ message: 'Rentang tanggal tidak valid.' });

  const categories = await db.prepare(`
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
    summary: await getPeriodSummary(range.from, range.to),
    categories,
    cashflow: await getCashflowSeries(range.from, range.to)
  });
});

apiRouter.get('/reports/transactions.csv', requireAuth, async (req, res) => {
  const range = validateDateRange(req);
  if (!range) return res.status(422).json({ message: 'Rentang tanggal tidak valid.' });

  const rows = await db.prepare(`
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

  await logAudit(req, {
    action: 'REPORT_EXPORT_CSV',
    entityType: 'REPORT',
    details: range
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="ikhlas-transaksi-${range.from}-${range.to}.csv"`);
  res.send('\uFEFF' + lines.join('\n'));
});

apiRouter.get('/friday-schedules', requireAuth, async (req, res) => {
  if (isIsoDate(String(req.query.date ?? ''))) {
    const date = String(req.query.date);
    return res.json({
      date,
      isFriday: isFridayDate(date),
      schedule: await getFridaySchedule(date)
    });
  }

  const from = isIsoDate(String(req.query.from ?? '')) ? String(req.query.from) : todayIso();
  const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 16);

  return res.json({
    from,
    data: await getUpcomingFridaySchedules(from, limit)
  });
});

apiRouter.put('/friday-schedules/:date', requireAuth, requireRole('ADMIN'), async (req, res) => {
  if (!isIsoDate(req.params.date) || !isFridayDate(req.params.date)) {
    return res.status(422).json({ message: 'Jadwal Jumat hanya dapat disimpan untuk tanggal hari Jumat.' });
  }

  const parsed = fridayScheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Data petugas Jumat belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const before = await getFridaySchedule(req.params.date);
  const input = parsed.data;

  await db.prepare(`
    INSERT INTO friday_schedules (schedule_date, imam, khatib, bilal, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(schedule_date) DO UPDATE SET
      imam = excluded.imam,
      khatib = excluded.khatib,
      bilal = excluded.bilal,
      updated_at = CURRENT_TIMESTAMP
  `).run(req.params.date, input.imam, input.khatib, input.bilal);

  const after = await getFridaySchedule(req.params.date);
  await logAudit(req, {
    action: before ? 'FRIDAY_SCHEDULE_UPDATE' : 'FRIDAY_SCHEDULE_CREATE',
    entityType: 'FRIDAY_SCHEDULE',
    entityId: req.params.date,
    details: { before, after }
  });

  return res.json({ schedule: after });
});

apiRouter.get('/prayer-schedules', requireAuth, async (req, res) => {
  const date = isIsoDate(String(req.query.date ?? '')) ? String(req.query.date) : todayIso();
  res.json(await getProviderPrayerSchedule(date));
});


apiRouter.get('/activities', requireAuth, async (req, res) => {
  const date = isIsoDate(String(req.query.from ?? '')) ? String(req.query.from) : todayIso();
  res.json({ data: await getUpcomingActivities(date, 100) });
});

apiRouter.post('/activities', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const parsed = activitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Data kegiatan belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const input = parsed.data;
  const result = await db.prepare(`
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

  await logAudit(req, {
    action: 'ACTIVITY_CREATE',
    entityType: 'ACTIVITY',
    entityId: result.lastInsertRowid,
    details: { title: input.title, activityDate: input.activityDate }
  });

  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

apiRouter.put('/activities/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const existing = await db.prepare(`
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
  await db.prepare(`
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

  await logAudit(req, {
    action: 'ACTIVITY_UPDATE',
    entityType: 'ACTIVITY',
    entityId: existing.id,
    details: { before: { ...existing, isPublished: Boolean(existing.isPublished) }, after }
  });

  return res.json(after);
});

apiRouter.delete('/activities/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const activity = await db.prepare('SELECT id, title FROM activities WHERE id = ?').get(req.params.id);
  if (!activity) return res.status(404).json({ message: 'Kegiatan tidak ditemukan.' });

  await db.prepare('DELETE FROM activities WHERE id = ?').run(activity.id);
  await logAudit(req, {
    action: 'ACTIVITY_DELETE',
    entityType: 'ACTIVITY',
    entityId: activity.id,
    details: { title: activity.title }
  });

  res.status(204).end();
});

apiRouter.get('/users', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const users = (await db.prepare(`
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
  `).all()).map((user) => ({ ...user, isActive: Boolean(user.isActive) }));

  res.json({ data: users });
});

apiRouter.post('/users', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Data pengguna belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const input = parsed.data;
  const role = await db.prepare('SELECT id FROM roles WHERE name = ?').get(input.role);

  try {
    const result = await db.prepare(`
      INSERT INTO users (role_id, name, email, password_hash)
      VALUES (?, ?, ?, ?)
    `).run(role.id, input.name, input.email.toLowerCase(), hashPassword(input.password));

    await logAudit(req, {
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

apiRouter.put('/users/:id/status', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const parsed = userStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Status pengguna tidak valid.' });
  }

  const userId = Number(req.params.id);
  const existing = await db.prepare(`
    SELECT id, name, email, is_active AS isActive
    FROM users
    WHERE id = ?
  `).get(userId);

  if (!existing) return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
  if (userId === Number(req.user.id) && !parsed.data.isActive) {
    return res.status(422).json({ message: 'Akun yang sedang digunakan tidak dapat dinonaktifkan.' });
  }

  await db.prepare('UPDATE users SET is_active = ? WHERE id = ?')
    .run(parsed.data.isActive ? 1 : 0, userId);

  if (!parsed.data.isActive) {
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }

  await logAudit(req, {
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

apiRouter.get('/transaction-categories', requireAuth, async (req, res) => {
  const params = [];
  let where = '';

  if (req.query.type === 'INCOME' || req.query.type === 'EXPENSE') {
    where = 'WHERE type = ?';
    params.push(req.query.type);
  }

  const rows = (await db.prepare(`
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
  `).all(...params)).map((row) => ({ ...row, isActive: Boolean(row.isActive) }));

  res.json({
    data: req.user.role === 'ADMIN'
      ? rows
      : rows.filter((row) => row.isActive)
  });
});

apiRouter.post('/transaction-categories', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Kategori belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  try {
    const input = parsed.data;
    const result = await db.prepare(`
      INSERT INTO transaction_categories (type, name, is_active, sort_order)
      VALUES (?, ?, ?, ?)
    `).run(input.type, input.name, input.isActive ? 1 : 0, input.sortOrder);

    await logAudit(req, {
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

apiRouter.put('/transaction-categories/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Kategori belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const existing = await db.prepare(`
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
    await db.prepare(`
      UPDATE transaction_categories
      SET type = ?, name = ?, is_active = ?, sort_order = ?
      WHERE id = ?
    `).run(input.type, input.name, input.isActive ? 1 : 0, input.sortOrder, existing.id);

    await logAudit(req, {
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

apiRouter.get('/public-messages', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const rows = (await db.prepare(`
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
  `).all()).map((row) => ({ ...row, isActive: Boolean(row.isActive) }));

  res.json({ data: rows });
});

apiRouter.post('/public-messages', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const parsed = publicMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Konten Public Display belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const input = parsed.data;
  const result = await db.prepare(`
    INSERT INTO public_messages (kind, title, content, source, is_active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(input.kind, input.title, input.content, input.source, input.isActive ? 1 : 0, input.sortOrder);

  await logAudit(req, {
    action: 'PUBLIC_MESSAGE_CREATE',
    entityType: 'PUBLIC_MESSAGE',
    entityId: result.lastInsertRowid,
    details: { kind: input.kind, title: input.title }
  });

  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

apiRouter.put('/public-messages/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const parsed = publicMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Konten Public Display belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const existing = await db.prepare('SELECT id FROM public_messages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Konten tidak ditemukan.' });

  const input = parsed.data;
  await db.prepare(`
    UPDATE public_messages
    SET kind = ?, title = ?, content = ?, source = ?, is_active = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(input.kind, input.title, input.content, input.source, input.isActive ? 1 : 0, input.sortOrder, existing.id);

  await logAudit(req, {
    action: 'PUBLIC_MESSAGE_UPDATE',
    entityType: 'PUBLIC_MESSAGE',
    entityId: existing.id,
    details: { kind: input.kind, title: input.title, isActive: input.isActive }
  });

  res.json({ id: existing.id });
});

apiRouter.delete('/public-messages/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const existing = await db.prepare('SELECT id FROM public_messages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Konten tidak ditemukan.' });

  await db.prepare('DELETE FROM public_messages WHERE id = ?').run(existing.id);
  await logAudit(req, {
    action: 'PUBLIC_MESSAGE_DELETE',
    entityType: 'PUBLIC_MESSAGE',
    entityId: existing.id
  });

  res.status(204).end();
});

apiRouter.get('/settings', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  res.json(await adminSettings());
});

apiRouter.put('/settings', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Pengaturan belum valid.', errors: parsed.error.flatten().fieldErrors });
  }

  const before = await adminSettings();
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

  const upsertSql = `
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `;

  await db.transaction(async (tx) => {
    for (const [field, key] of Object.entries(map)) {
      await tx.prepare(upsertSql).run(key, parsed.data[field] ?? '');
    }
  });

  await logAudit(req, {
    action: 'SETTINGS_UPDATE',
    entityType: 'SETTINGS',
    details: {
      openingBalanceChanged: before.openingBalance !== parsed.data.openingBalance,
      openingBalanceDate: parsed.data.openingBalanceDate || null
    }
  });

  res.json(await adminSettings());
});

apiRouter.get('/audit-logs', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 250);
  const rows = (await db.prepare(`
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
    ORDER BY audit_logs.created_at DESC, audit_logs.id DESC
    LIMIT ?
  `).all(limit)).map((row) => ({
    ...row,
    details: row.detailsJson ? JSON.parse(row.detailsJson) : null,
    detailsJson: undefined
  }));

  res.json({ data: rows });
});
