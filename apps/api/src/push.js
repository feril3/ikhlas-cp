import webpush from 'web-push';
import { db } from './db.js';

// Notifikasi push PWA (Web Push + VAPID). Tanpa kunci VAPID, fitur ini nonaktif dan aplikasi tetap berjalan.
const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@ikhlas.local';

let configured = false;
if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (error) {
    console.error('Kunci VAPID tidak valid, notifikasi push dinonaktifkan:', error.message);
  }
}

export function isPushConfigured() {
  return configured;
}

export function getPushPublicKey() {
  return configured ? publicKey : null;
}

export async function saveSubscription(userId, subscription, userAgent) {
  await db.prepare(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      updated_at = CURRENT_TIMESTAMP
  `).run(userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userAgent ?? null);
}

export async function removeSubscription(userId, endpoint) {
  await db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').run(userId, endpoint);
}

async function sendToRows(rows, payload) {
  if (!configured || rows.length === 0) return { sent: 0 };
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(rows.map((row) => webpush.sendNotification(
    { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
    body,
    { TTL: 60 * 60 * 24, urgency: 'high', timeout: 5000 }
  )));

  // Langganan yang sudah kedaluwarsa (404/410) dihapus agar tidak dikirimi lagi.
  const expired = rows.filter((_, i) => {
    const r = results[i];
    return r.status === 'rejected' && [404, 410].includes(r.reason?.statusCode);
  });
  for (const row of expired) {
    await db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(row.id);
  }
  results.forEach((r) => {
    if (r.status === 'rejected' && ![404, 410].includes(r.reason?.statusCode)) {
      console.error('Notifikasi push gagal dikirim:', r.reason?.statusCode ?? r.reason?.message);
    }
  });
  return { sent: results.filter((r) => r.status === 'fulfilled').length };
}

// Dikirim sebelum respons selesai: di Vercel Function, pekerjaan setelah respons bisa terhenti.
export async function notifyRole(roleCode, payload) {
  if (!configured) return { sent: 0 };
  try {
    const rows = await db.prepare(`
      SELECT push_subscriptions.*
      FROM push_subscriptions
      JOIN users ON users.id = push_subscriptions.user_id
      JOIN roles ON roles.id = users.role_id
      WHERE roles.name = ? AND users.is_active = 1
    `).all(roleCode);
    return await sendToRows(rows, payload);
  } catch (error) {
    console.error('Notifikasi push gagal:', error);
    return { sent: 0 };
  }
}

export async function notifyUser(userId, payload) {
  if (!configured) return { sent: 0 };
  try {
    const rows = await db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId);
    return await sendToRows(rows, payload);
  } catch (error) {
    console.error('Notifikasi push gagal:', error);
    return { sent: 0 };
  }
}
