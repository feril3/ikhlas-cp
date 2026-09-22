import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { test, before, after } from 'node:test';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const port = 34123;
const baseUrl = `http://127.0.0.1:${port}/api`;
let tempDir;
let server;

async function waitForHealth() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // The child process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Test API did not become healthy.');
}

async function request(pathname, options = {}) {
  return fetch(`${baseUrl}${pathname}`, options);
}

before(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'ikhlas-test-'));
  server = spawn(process.execPath, ['apps/api/src/server.js'], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      DATABASE_PATH: path.join(tempDir, 'ikhlas.db'),
      CORS_ORIGIN: 'http://localhost:5173',
      TRUST_PROXY: 'false',
      GOOGLE_DRIVE_CLIENT_ID: '',
      GOOGLE_DRIVE_CLIENT_SECRET: '',
      GOOGLE_DRIVE_REFRESH_TOKEN: '',
      TELEGRAM_BOT_TOKEN: '',
      TELEGRAM_CHAT_ID: ''
    },
    stdio: ['ignore', 'ignore', 'pipe']
  });
  await waitForHealth();
});

after(async () => {
  if (server && !server.killed) {
    server.kill('SIGTERM');
    await once(server, 'exit').catch(() => {});
  }
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

test('dynamic API responses opt out of browser caching', async () => {
  const response = await request('/health');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('browser API requests opt out of browser caching', async () => {
  const source = await readFile(path.join(root, 'apps/web/src/lib/api.js'), 'utf8');
  assert.match(source, /cache:\s*['"]no-store['"]/);
});

test('service worker does not cache API responses', async () => {
  const source = await readFile(path.join(root, 'apps/web/public/sw.js'), 'utf8');
  assert.match(source, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(source, /CACHE_NAME = ['"]ikhlas-shell-v2['"]/);
});

test('Admin can create an income transaction', async () => {
  const setup = await request('/auth/setup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Admin',
      email: 'admin@test.local',
      password: 'TestPassword123!'
    })
  });
  assert.equal(setup.status, 201);
  const cookie = setup.headers.get('set-cookie')?.split(';', 1)[0];
  assert.ok(cookie);

  const form = new FormData();
  form.set('type', 'INCOME');
  form.set('amount', '1000');
  form.set('transactionDate', '2026-09-22');
  form.set('method', 'CASH');
  form.set('categoryId', '1');
  form.set('sourceDetail', 'Test admin');
  form.set('description', 'Regression test');

  const response = await request('/transactions', {
    method: 'POST',
    headers: { cookie },
    body: form
  });
  assert.equal(response.status, 201);
});

test('Admin can reach expense transaction validation', async () => {
  const login = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@test.local',
      password: 'TestPassword123!'
    })
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie')?.split(';', 1)[0];
  assert.ok(cookie);

  const form = new FormData();
  form.set('type', 'EXPENSE');
  form.set('amount', '1000');
  form.set('transactionDate', '2026-09-22');
  form.set('method', 'CASH');
  form.set('categoryId', '6');
  form.set('description', 'Regression test');

  const response = await request('/transactions', {
    method: 'POST',
    headers: { cookie },
    body: form
  });
  assert.equal(response.status, 422);
  assert.match((await response.json()).message, /Bukti transaksi wajib/);
});
