// Membuat atau memperbarui akun (mis. akun demo) tanpa menyimpan kata sandi di repositori.
// Pemakaian:
//   SEED_ACCOUNTS='[{"login":"admin-ikhlas","password":"...","role":"ADMIN","name":"Admin Demo"}]' npm run db:seed-accounts -w apps/api
// "login" boleh berupa email atau nama pengguna. Akun yang sudah ada diperbarui kata sandi, peran, dan statusnya.
import 'dotenv/config';
import { hashPassword } from './auth.js';
import { db, initializeDatabase } from './db.js';

const ROLES = new Set(['ADMIN', 'TREASURER']);

function readAccounts() {
  let accounts;
  try {
    accounts = JSON.parse(process.env.SEED_ACCOUNTS || '[]');
  } catch {
    throw new Error('SEED_ACCOUNTS harus berupa JSON array.');
  }
  if (!Array.isArray(accounts) || accounts.length === 0) throw new Error('SEED_ACCOUNTS kosong.');
  return accounts.map((account, index) => {
    const login = String(account.login ?? '').trim().toLowerCase();
    const role = String(account.role ?? '').trim().toUpperCase();
    const password = String(account.password ?? '');
    if (login.length < 3 || login.length > 160) throw new Error(`Akun ke-${index + 1}: login tidak valid.`);
    if (!ROLES.has(role)) throw new Error(`Akun ke-${index + 1}: role harus ADMIN atau TREASURER.`);
    if (password.length < 10) throw new Error(`Akun ke-${index + 1}: kata sandi minimal 10 karakter.`);
    const name = String(account.name ?? '').trim() || (role === 'ADMIN' ? 'Ketua/Admin' : 'Bendahara');
    return { login, role, password, name };
  });
}

const accounts = readAccounts();
await initializeDatabase();

for (const account of accounts) {
  const role = await db.prepare('SELECT id FROM roles WHERE name = ?').get(account.role);
  const existing = await db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(account.login);
  const hash = hashPassword(account.password);
  if (existing) {
    await db.prepare('UPDATE users SET name = ?, role_id = ?, password_hash = ?, is_active = 1 WHERE id = ?')
      .run(account.name, role.id, hash, existing.id);
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
    console.log(`Diperbarui: ${account.login} (${account.role})`);
  } else {
    await db.prepare('INSERT INTO users (role_id, name, email, password_hash, is_active) VALUES (?, ?, ?, ?, 1)')
      .run(role.id, account.name, account.login, hash);
    console.log(`Dibuat: ${account.login} (${account.role})`);
  }
}

db.close();
