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
let treasurerCookie;
let approvalRequestId;
let approvedTransactionId;

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


test('Treasurer transaction create waits for Ketua/Admin approval and supports revision', async () => {
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@test.local',
      password: 'TestPassword123!'
    })
  });
  const adminCookie = adminLogin.headers.get('set-cookie')?.split(';', 1)[0];
  assert.ok(adminCookie);

  const createTreasurer = await request('/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: adminCookie },
    body: JSON.stringify({
      name: 'Test Treasurer',
      email: 'treasurer@test.local',
      password: 'TreasurerPassword123!',
      role: 'TREASURER'
    })
  });
  assert.equal(createTreasurer.status, 201);

  const treasurerLogin = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'treasurer@test.local',
      password: 'TreasurerPassword123!'
    })
  });
  assert.equal(treasurerLogin.status, 200);
  treasurerCookie = treasurerLogin.headers.get('set-cookie')?.split(';', 1)[0];
  assert.ok(treasurerCookie);

  const form = new FormData();
  form.set('type', 'INCOME');
  form.set('amount', '7777');
  form.set('transactionDate', '2026-09-23');
  form.set('method', 'CASH');
  form.set('categoryId', '1');
  form.set('sourceDetail', 'Pending approval test');
  form.set('description', 'Needs chairman review');

  const submitted = await request('/transactions', {
    method: 'POST',
    headers: { cookie: treasurerCookie },
    body: form
  });
  assert.equal(submitted.status, 202);
  const submittedBody = await submitted.json();
  assert.equal(submittedBody.approvalRequired, true);
  assert.equal(submittedBody.approvalRequest.status, 'PENDING_REVIEW');
  approvalRequestId = submittedBody.approvalRequest.id;

  const transactionsBeforeApproval = await request('/transactions', {
    headers: { cookie: treasurerCookie }
  });
  const beforeBody = await transactionsBeforeApproval.json();
  assert.equal(beforeBody.data.some((item) => item.description === 'Needs chairman review'), false);

  const revision = await request(`/transaction-approvals/${approvalRequestId}/review`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie: adminCookie },
    body: JSON.stringify({
      decision: 'REVISION_REQUIRED',
      note: 'Nominal perlu dikoreksi sesuai bukti.'
    })
  });
  assert.equal(revision.status, 200);
  assert.equal((await revision.json()).approvalRequest.status, 'REVISION_REQUIRED');

  const resubmit = await request(`/transaction-approvals/${approvalRequestId}/resubmit`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie: treasurerCookie },
    body: JSON.stringify({
      type: 'INCOME',
      amount: 8888,
      transactionDate: '2026-09-23',
      method: 'CASH',
      categoryId: 1,
      sourceDetail: 'Pending approval test',
      description: 'Corrected after chairman review'
    })
  });
  assert.equal(resubmit.status, 200);
  assert.equal((await resubmit.json()).approvalRequest.status, 'PENDING_REVIEW');

  const approve = await request(`/transaction-approvals/${approvalRequestId}/review`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie: adminCookie },
    body: JSON.stringify({ decision: 'APPROVE', note: 'Sesuai.' })
  });
  assert.equal(approve.status, 200);
  const approvedBody = await approve.json();
  assert.equal(approvedBody.approvalRequest.status, 'APPROVED');
  assert.equal(approvedBody.transaction.amount, 8888);
  approvedTransactionId = approvedBody.transaction.id;

  const transactionsAfterApproval = await request('/transactions', {
    headers: { cookie: treasurerCookie }
  });
  const afterBody = await transactionsAfterApproval.json();
  assert.equal(afterBody.data.some((item) => item.id === approvedTransactionId && item.amount === 8888), true);
});

test('Treasurer edits keep posted value until approval, then apply atomically', async () => {
  assert.ok(treasurerCookie);
  assert.ok(approvedTransactionId);

  const edit = await request(`/transactions/${approvedTransactionId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie: treasurerCookie },
    body: JSON.stringify({
      amount: 9999,
      transactionDate: '2026-09-23',
      method: 'CASH',
      categoryId: 1,
      sourceDetail: 'Approved edit test',
      description: 'Pending update'
    })
  });
  assert.equal(edit.status, 202);
  const editBody = await edit.json();
  const updateApprovalId = editBody.approvalRequest.id;

  const before = await request('/transactions', { headers: { cookie: treasurerCookie } });
  const beforeBody = await before.json();
  assert.equal(beforeBody.data.find((item) => item.id === approvedTransactionId).amount, 8888);

  const adminLogin = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.local', password: 'TestPassword123!' })
  });
  const adminCookie = adminLogin.headers.get('set-cookie')?.split(';', 1)[0];

  const approve = await request(`/transaction-approvals/${updateApprovalId}/review`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie: adminCookie },
    body: JSON.stringify({ decision: 'APPROVE' })
  });
  assert.equal(approve.status, 200);

  const after = await request('/transactions', { headers: { cookie: treasurerCookie } });
  const afterBody = await after.json();
  assert.equal(afterBody.data.find((item) => item.id === approvedTransactionId).amount, 9999);
});

test('Treasurer delete request keeps transaction posted until Ketua/Admin approval', async () => {
  const submitted = await request(`/transactions/${approvedTransactionId}`, {
    method: 'DELETE',
    headers: { cookie: treasurerCookie }
  });
  assert.equal(submitted.status, 202);
  const deleteApprovalId = (await submitted.json()).approvalRequest.id;

  const before = await request('/transactions', { headers: { cookie: treasurerCookie } });
  assert.equal((await before.json()).data.some((item) => item.id === approvedTransactionId), true);

  const adminLogin = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.local', password: 'TestPassword123!' })
  });
  const adminCookie = adminLogin.headers.get('set-cookie')?.split(';', 1)[0];

  const approve = await request(`/transaction-approvals/${deleteApprovalId}/review`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie: adminCookie },
    body: JSON.stringify({ decision: 'APPROVE', note: 'Hapus disetujui.' })
  });
  assert.equal(approve.status, 200);

  const after = await request('/transactions', { headers: { cookie: treasurerCookie } });
  assert.equal((await after.json()).data.some((item) => item.id === approvedTransactionId), false);
});
