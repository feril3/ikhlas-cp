import {
  createHash,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual
} from 'node:crypto';
import { db } from './db.js';

const COOKIE_NAME = 'ikhlas_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PASSWORD_ITERATIONS = 600_000;

export function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const hash = pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 32, 'sha256').toString('base64url');
  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  try {
    const [algorithm, iterationsRaw, salt, expectedRaw] = String(stored).split('$');
    if (algorithm !== 'pbkdf2_sha256') return false;

    const iterations = Number(iterationsRaw);
    const expected = Buffer.from(expectedRaw, 'base64url');
    const actual = pbkdf2Sync(password, salt, iterations, expected.length, 'sha256');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf('=');
        return index === -1
          ? [item, '']
          : [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
      })
  );
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function createSession(userId) {
  db.prepare("DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now')").run();

  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  db.prepare(`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(tokenHash, userId, expiresAt);

  return { token, expiresAt };
}

export function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

export function getSessionToken(req) {
  return parseCookies(req.headers.cookie ?? '')[COOKIE_NAME] ?? null;
}

export function destroySession(req) {
  const token = getSessionToken(req);
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashSessionToken(token));
}

export function getAuthenticatedUser(req) {
  const token = getSessionToken(req);
  if (!token) return null;

  return db.prepare(`
    SELECT
      users.id,
      users.name,
      users.email,
      users.is_active AS isActive,
      roles.name AS role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    JOIN roles ON roles.id = users.role_id
    WHERE sessions.token_hash = ?
      AND datetime(sessions.expires_at) > datetime('now')
      AND users.is_active = 1
    LIMIT 1
  `).get(hashSessionToken(token)) ?? null;
}

export function requireAuth(req, res, next) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ message: 'Sesi tidak valid atau sudah berakhir.' });
  }

  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Sesi tidak valid atau sudah berakhir.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Akun tidak memiliki akses ke fungsi ini.' });
    }

    next();
  };
}
