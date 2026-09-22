import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { initializeDatabase } from './db.js';
import { apiRouter } from './routes.js';
import { startDatabaseBackupScheduler } from './driveBackup.js';

initializeDatabase();

const app = express();
const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

if (process.env.TRUST_PROXY === 'true') {
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

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));

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

app.use(express.json({ limit: '1mb' }));
app.use('/api', apiRouter);

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Ukuran file maksimal 5 MB.'
      : 'File harus berupa JPG, PNG, WEBP, atau PDF.';
    return res.status(422).json({ message });
  }

  console.error(error);
  return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
});

app.listen(port, () => {
  console.log(`IKHLAS API running at http://localhost:${port}`);

  try {
    startDatabaseBackupScheduler();
  } catch (error) {
    console.error('Google Drive database backup scheduler gagal diinisialisasi:', error);
  }
});
