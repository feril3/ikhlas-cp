import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { ensureDatabase } from './db.js';
import { apiRouter } from './routes.js';
import { createDatabaseBackupToDrive } from './driveBackup.js';
import { isGoogleDriveConfigured } from './driveStorage.js';

// Aplikasi Express dipakai bersama oleh server lokal (server.js) dan Vercel Function (api/index.js).
export const app = express();
const onVercel = Boolean(process.env.VERCEL);
// Di Vercel frontend dan API berada pada domain yang sama sehingga CORS tidak diperlukan.
const corsOrigin = process.env.CORS_ORIGIN ?? (onVercel ? null : 'http://localhost:5173');

if (process.env.TRUST_PROXY === 'true' || onVercel) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(self)');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

if (corsOrigin) {
  app.use(cors({
    origin: corsOrigin,
    credentials: true,
    exposedHeaders: ['Content-Disposition']
  }));
}

app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Pastikan skema basis data siap sebelum permintaan pertama diproses.
app.use('/api', (_req, _res, next) => {
  ensureDatabase().then(() => next(), next);
});

const authAttempts = new Map();
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 20;

app.use('/api/auth', (req, res, next) => {
  if (req.method !== 'POST' || !['/login', '/setup'].includes(req.path)) {
    return next();
  }

  const now = Date.now();
  const key = req.ip || 'unknown';
  const entry = authAttempts.get(key);

  if (!entry || entry.resetAt <= now) {
    authAttempts.set(key, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return next();
  }

  if (entry.count >= AUTH_MAX_ATTEMPTS) {
    res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({ message: 'Terlalu banyak percobaan. Coba lagi beberapa menit.' });
  }

  entry.count += 1;
  next();
});

// Backup harian dipicu Vercel Cron (lihat vercel.json). Vercel mengirim header
// "Authorization: Bearer <CRON_SECRET>" bila variabel CRON_SECRET diatur.
app.get('/api/cron/daily-backup', (req, res, next) => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.get('authorization') !== `Bearer ${secret}`) {
    return res.status(401).json({ message: 'Tidak diizinkan.' });
  }
  if (process.env.GOOGLE_DRIVE_BACKUP_ENABLED !== 'true' || !isGoogleDriveConfigured()) {
    return res.json({ skipped: true, message: 'Backup Google Drive belum diaktifkan atau belum dikonfigurasi.' });
  }
  createDatabaseBackupToDrive({ reason: 'scheduled' })
    .then((result) => res.json({ ok: true, filename: result.filename, size: result.size, retention: result.retention }))
    .catch(next);
});

app.use(express.json({ limit: '1mb' }));
app.use('/api', apiRouter);

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Ukuran file maksimal 4 MB.'
      : 'File harus berupa JPG, PNG, WEBP, atau PDF.';
    return res.status(422).json({ message });
  }

  console.error(error);
  return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
});

export default app;
