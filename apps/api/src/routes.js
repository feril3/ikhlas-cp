import { Router } from 'express';
import { z } from 'zod';
import { db, getOpeningBalance } from './db.js';

export const apiRouter = Router();

const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.coerce.number().int().positive().max(9_999_999_999),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(['CASH', 'TRANSFER']),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().default('')
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

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ikhlas-api' });
});

apiRouter.get('/dashboard', (_req, res) => {
  const recentTransactions = db.prepare(`
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
    ORDER BY transaction_date DESC, created_at DESC
    LIMIT 6
  `).all();

  const prayerSchedule = db.prepare(`
    SELECT
      prayer_name AS prayerName,
      adhan_time AS adhanTime,
      iqamah_time AS iqamahTime,
      imam,
      bilal
    FROM prayer_schedules
    ORDER BY prayer_date DESC, adhan_time ASC
    LIMIT 5
  `).all();

  const activities = db.prepare(`
    SELECT
      id,
      title,
      activity_date AS activityDate,
      start_time AS startTime,
      location,
      speaker
    FROM activities
    WHERE is_published = 1
    ORDER BY activity_date ASC, start_time ASC
    LIMIT 4
  `).all();

  res.json({
    summary: getSummary(),
    recentTransactions,
    prayerSchedule,
    activities
  });
});

apiRouter.get('/transactions', (req, res) => {
  const type = req.query.type;
  const params = [];
  let where = '';

  if (type === 'INCOME' || type === 'EXPENSE') {
    where = 'WHERE type = ?';
    params.push(type);
  }

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
    LIMIT 100
  `).all(...params);

  res.json({ data: rows, summary: getSummary() });
});

apiRouter.post('/transactions', (req, res) => {
  const result = transactionSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(422).json({
      message: 'Data transaksi belum valid.',
      errors: result.error.flatten().fieldErrors
    });
  }

  const input = result.data;
  const insert = db.prepare(`
    INSERT INTO transactions
      (type, amount, transaction_date, method, category, description)
    VALUES
      (@type, @amount, @transactionDate, @method, @category, @description)
  `);

  const created = insert.run(input);
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

  return res.status(201).json({
    message: 'Transaksi berhasil disimpan.',
    transaction,
    summary: getSummary()
  });
});
