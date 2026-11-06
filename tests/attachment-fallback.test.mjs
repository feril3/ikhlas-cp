import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { test, before, after } from 'node:test';

// Tanpa kredensial Google Drive, bukti transaksi disimpan di basis data dan tetap bisa dibuka.
const root = fileURLToPath(new URL('..', import.meta.url));
const port = 34127;
const baseUrl = `http://127.0.0.1:${port}/api`;
let tempDir;
let server;
let env;

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array.from({ length: 2048 }, (_, i) => i % 251)]);
const request = (pathname, options = {}) => fetch(`${baseUrl}${pathname}`, options);
const cookieOf = (response) => response.headers.get('set-cookie')?.split(';', 1)[0];

async function waitForHealth() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/health`)).ok) return;
    } catch { /* server masih dimulai */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Test API did not become healthy.');
}

function run(script, extraEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { cwd: root, env: { ...env, ...extraEnv }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('exit', (code) => (code === 0 ? resolve(output) : reject(new Error(output))));
  });
}

before(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'ikhlas-blob-'));
  env = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(port),
    DATABASE_PATH: path.join(tempDir, 'ikhlas.db'),
    SEED_DEMO_DATA: 'false',
    CORS_ORIGIN: 'http://localhost:5173',
    TRUST_PROXY: 'false',
    GOOGLE_DRIVE_CLIENT_ID: '',
    GOOGLE_DRIVE_CLIENT_SECRET: '',
    GOOGLE_DRIVE_REFRESH_TOKEN: '',
    VAPID_PUBLIC_KEY: '',
    VAPID_PRIVATE_KEY: ''
  };
  server = spawn(process.execPath, ['apps/api/src/server.js'], { cwd: root, env, stdio: ['ignore', 'ignore', 'pipe'] });
  await waitForHealth();
});

after(async () => {
  if (server && !server.killed) {
    server.kill('SIGTERM');
    await once(server, 'exit').catch(() => {});
  }
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

test('health reports database fallback storage when Google Drive is not configured', async () => {
  const body = await (await request('/health')).json();
  assert.equal(body.storage.provider, 'database');
  assert.equal(body.storage.googleDriveConfigured, false);
});

test('seeded accounts can sign in with a username, and evidence is stored in the database', async () => {
  const setup = await request('/auth/setup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Admin Uji', email: 'admin@test.local', password: 'TestPassword123!' })
  });
  assert.equal(setup.status, 201);
  const adminCookie = cookieOf(setup);

  const seeded = await run('apps/api/src/seed-accounts.js', {
    SEED_ACCOUNTS: JSON.stringify([{ login: 'bendahara-uji', password: 'BendaharaUji123', role: 'TREASURER', name: 'Bendahara Uji' }])
  });
  assert.match(seeded, /Dibuat: bendahara-uji/);

  const wrong = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'bendahara-uji', password: 'salah-sandi-123' })
  });
  assert.equal(wrong.status, 401);

  const login = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'Bendahara-Uji', password: 'BendaharaUji123' })
  });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).user.role, 'TREASURER');
  const treasurerCookie = cookieOf(login);

  const form = new FormData();
  form.set('type', 'EXPENSE');
  form.set('amount', '25000');
  form.set('transactionDate', '2026-11-06');
  form.set('method', 'CASH');
  form.set('categoryId', '6');
  form.set('description', 'Uji bukti di basis data');
  form.set('evidence', new Blob([PNG], { type: 'image/png' }), 'nota.png');

  const submitted = await request('/transactions', { method: 'POST', headers: { cookie: treasurerCookie }, body: form });
  assert.equal(submitted.status, 202);
  const approvalId = (await submitted.json()).approvalRequest.id;

  const proposalFile = await request(`/transaction-approvals/${approvalId}/attachments/evidence`, { headers: { cookie: adminCookie } });
  assert.equal(proposalFile.status, 200);
  assert.equal(proposalFile.headers.get('content-type'), 'image/png');
  assert.deepEqual(new Uint8Array(await proposalFile.arrayBuffer()), PNG);

  const approve = await request(`/transaction-approvals/${approvalId}/review`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie: adminCookie },
    body: JSON.stringify({ decision: 'APPROVE', note: 'Sesuai nota.' })
  });
  assert.equal(approve.status, 200);
  const transactionId = (await approve.json()).transaction.id;

  const postedFile = await request(`/transactions/${transactionId}/attachments/evidence`, { headers: { cookie: treasurerCookie } });
  assert.equal(postedFile.status, 200);
  assert.deepEqual(new Uint8Array(await postedFile.arrayBuffer()), PNG);

  const anonymous = await request(`/transactions/${transactionId}/attachments/evidence`);
  assert.equal(anonymous.status, 401);
});
