import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
async function source(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

test('public display styles remain separate from the Tailwind dashboard foundation', async () => {
  const main = await source('apps/web/src/main.jsx');
  const uiCss = await source('apps/web/src/styles/ui.css');

  assert.match(main, /public-display\.css/);
  assert.match(main, /public-display-ornamental\.css/);
  assert.match(uiCss, /tailwindcss\/theme\.css/);
  assert.match(uiCss, /tailwindcss\/utilities\.css/);
  assert.doesNotMatch(uiCss, /tailwindcss\/preflight/);
});


test('phase 2 dashboard uses real SQLite cashflow data and Recharts composition', async () => {
  const routes = await source('apps/api/src/routes.js');
  const dashboard = await source('apps/web/src/pages/Dashboard.jsx');

  assert.match(routes, /function getCashflowSeries/);
  assert.match(routes, /GROUP BY transaction_date/);
  assert.match(routes, /cashflow: (await )?getCashflowSeries\(chartFrom, dashboardDate\)/);
  assert.match(routes, /monthSummary: (await )?getPeriodSummary/);

  assert.match(dashboard, /AreaChart/);
  assert.match(dashboard, /ChartContainer/);
  assert.match(dashboard, /Arus kas 30 hari terakhir/);
  assert.match(dashboard, /Kas masuk bulan ini/);
  assert.match(dashboard, /PageHeader/);
  assert.doesNotMatch(dashboard, /CircleDollarSign/);
  assert.doesNotMatch(dashboard, /section-kicker/);
});

test('phase 2 reports combines Recharts analysis with verifiable numeric tables', async () => {
  const routes = await source('apps/api/src/routes.js');
  const reports = await source('apps/web/src/pages/Reports.jsx');

  assert.match(routes, /cashflow: (await )?getCashflowSeries\(range\.from, range\.to\)/);
  assert.match(reports, /BarChart/);
  assert.match(reports, /Distribusi kategori/);
  assert.match(reports, /Rincian kategori/);
  assert.match(reports, /TableHeader/);
  assert.match(reports, /Unduh CSV/);
  assert.doesNotMatch(reports, /section-kicker/);
});


test('phase 3 transaction history uses TanStack table and shadcn interaction primitives', async () => {
  const transactions = await source('apps/web/src/pages/Transactions.jsx');
  const table = await source('apps/web/src/features/transactions/TransactionTable.jsx');
  const editSheet = await source('apps/web/src/features/transactions/TransactionEditSheet.jsx');

  assert.match(transactions, /TransactionTable/);
  assert.match(transactions, /AlertDialog/);
  assert.match(transactions, /ToggleGroup/);
  assert.match(transactions, /InputGroup/);
  assert.doesNotMatch(transactions, /window\.confirm/);
  assert.doesNotMatch(transactions, /lucide-react/);
  assert.doesNotMatch(transactions, /section-kicker/);

  assert.match(table, /@tanstack\/react-table/);
  assert.match(table, /useReactTable/);
  assert.match(table, /DropdownMenu/);
  assert.match(table, /md:hidden/);
  assert.match(table, /hidden md:block/);

  assert.match(editSheet, /SheetContent/);
  assert.match(editSheet, /SelectTrigger/);
  assert.match(editSheet, /ToggleGroup/);
  assert.doesNotMatch(editSheet, /modal-backdrop/);
});

test('phase 3 shadcn workspace config is valid for the web package', async () => {
  const rootComponents = JSON.parse(await source('components.json'));
  const webComponents = JSON.parse(await source('apps/web/components.json'));
  const webJsconfig = JSON.parse(await source('apps/web/jsconfig.json'));

  assert.equal(rootComponents.style, 'radix-nova');
  assert.equal(webComponents.style, 'radix-nova');
  assert.equal(webComponents.iconLibrary, 'tabler');
  assert.equal(webComponents.tailwind.css, 'src/styles/ui.css');
  assert.deepEqual(webJsconfig.compilerOptions.paths['@/*'], ['./src/*']);
});


test('phase 4 Friday and agenda use tables, editors, and safe destructive interactions', async () => {
  const schedule = await source('apps/web/src/pages/Schedule.jsx');

  assert.match(schedule, /FridayEditor/);
  assert.match(schedule, /AgendaEditor/);
  assert.match(schedule, /TableHeader/);
  assert.match(schedule, /SheetContent/);
  assert.match(schedule, /DialogContent/);
  assert.match(schedule, /AlertDialogContent/);
  assert.match(schedule, /md:hidden/);
  assert.doesNotMatch(schedule, /window\.confirm/);
  assert.doesNotMatch(schedule, /lucide-react/);
  assert.doesNotMatch(schedule, /section-kicker/);
  assert.doesNotMatch(schedule, /className="panel/);
});

test('phase 4 settings are split into domain modules with Radix and shadcn interactions', async () => {
  const page = await source('apps/web/src/pages/AdminSettings.jsx');
  const nav = await source('apps/web/src/components/settings/SettingsNav.jsx');
  const categories = await source('apps/web/src/components/settings/CategorySettings.jsx');
  const display = await source('apps/web/src/components/settings/PublicDisplaySettings.jsx');
  const users = await source('apps/web/src/components/settings/UserSettings.jsx');
  const audit = await source('apps/web/src/components/settings/AuditSettings.jsx');

  assert.match(page, /SettingsNav/);
  assert.match(page, /GeneralSettings/);
  assert.match(page, /FinanceSettings/);
  assert.match(page, /CategorySettings/);
  assert.match(page, /PublicDisplaySettings/);
  assert.match(page, /UserSettings/);
  assert.match(page, /AuditSettings/);
  assert.doesNotMatch(page, /window\.confirm/);
  assert.doesNotMatch(page, /lucide-react/);
  assert.doesNotMatch(page, /section-kicker/);

  assert.match(nav, /Umum/);
  assert.match(nav, /Keuangan/);
  assert.match(nav, /Kategori/);
  assert.match(nav, /Public Display/);
  assert.match(nav, /Pengguna/);
  assert.match(nav, /Audit/);
  assert.match(categories, /DialogContent/);
  assert.match(display, /SheetContent/);
  assert.match(display, /AlertDialogContent/);
  assert.match(users, /Switch/);
  assert.match(audit, /StructuredDetails/);
  assert.match(audit, /Sebelum/);
  assert.match(audit, /Sesudah/);
});

test('phase 4 user status management is audited and prevents self deactivation', async () => {
  const routes = await source('apps/api/src/routes.js');
  const client = await source('apps/web/src/lib/api.js');

  assert.match(routes, /userStatusSchema/);
  assert.match(routes, /put\('\/users\/:id\/status'/);
  assert.match(routes, /Akun yang sedang digunakan tidak dapat dinonaktifkan/);
  assert.match(routes, /USER_STATUS_UPDATE/);
  assert.match(routes, /DELETE FROM sessions WHERE user_id/);
  assert.match(client, /updateUserStatus/);
});


test('phase 5 removes legacy dashboard CSS and dead transaction row implementation', async () => {
  const main = await source('apps/web/src/main.jsx');
  const base = await source('apps/web/src/styles/base.css');

  assert.doesNotMatch(main, /operations\.css/);
  assert.doesNotMatch(main, /auth-admin\.css/);
  assert.doesNotMatch(main, /responsive\.css/);
  assert.match(main, /public-display\.css/);
  assert.match(main, /public-display-ornamental\.css/);

  assert.doesNotMatch(base, /\.page-stack|\.panel|\.field\s*\{|\.auth-|\.transaction-row|\.sidebar\s*\{/);

  await assert.rejects(source('apps/web/src/styles/operations.css'));
  await assert.rejects(source('apps/web/src/styles/auth-admin.css'));
  await assert.rejects(source('apps/web/src/styles/responsive.css'));
  await assert.rejects(source('apps/web/src/components/TransactionRow.jsx'));
});

test('phase 5 final dashboard pages no longer depend on legacy page primitives', async () => {
  const pages = [
    'apps/web/src/pages/Dashboard.jsx',
    'apps/web/src/pages/Transactions.jsx',
    'apps/web/src/pages/TransactionForm.jsx',
    'apps/web/src/pages/Reports.jsx',
    'apps/web/src/pages/Schedule.jsx',
    'apps/web/src/pages/AdminSettings.jsx',
    'apps/web/src/pages/Login.jsx'
  ];

  for (const page of pages) {
    const content = await source(page);
    assert.doesNotMatch(content, /section-kicker|page-stack|page-heading|className="panel|className="button /);
  }
});


test('phase 6a overlay stack stays above sticky app chrome', async () => {
  const sheet = await source('apps/web/src/components/ui/sheet.jsx');
  const dialog = await source('apps/web/src/components/ui/dialog.jsx');
  const alertDialog = await source('apps/web/src/components/ui/alert-dialog.jsx');
  const dropdown = await source('apps/web/src/components/ui/dropdown-menu.jsx');
  const select = await source('apps/web/src/components/ui/select.jsx');
  const tooltip = await source('apps/web/src/components/ui/tooltip.jsx');
  const header = await source('apps/web/src/components/app/AppHeader.jsx');

  assert.match(header, /z-30/);
  assert.match(sheet, /fixed inset-0 z-50/);
  assert.match(sheet, /fixed z-\[60\]/);
  assert.match(dialog, /z-\[60\]/);
  assert.match(alertDialog, /z-\[60\]/);
  assert.match(dropdown, /z-\[70\]/);
  assert.match(select, /z-\[70\]/);
  assert.match(tooltip, /z-\[80\]/);
});

test('transaction summary cards use requested cash accounting labels', async () => {
  const transactions = await source('apps/web/src/pages/Transactions.jsx');

  assert.match(transactions, /label="Saldo awal"/);
  assert.match(transactions, /data\.summary\.openingBalance/);
  assert.match(transactions, /label="Masuk"/);
  assert.match(transactions, /data\.summary\.totalIncome/);
  assert.match(transactions, /label="Keluar"/);
  assert.match(transactions, /data\.summary\.totalExpense/);
  assert.match(transactions, /label="Sisa saldo"/);
  assert.match(transactions, /data\.summary\.currentBalance/);
  assert.doesNotMatch(transactions, /label="Transaksi tampil"/);
});

test('Friday editor can keep Imam and Khatib synchronized as one officer', async () => {
  const schedule = await source('apps/web/src/pages/Schedule.jsx');

  assert.match(schedule, /sameImamKhatib/);
  assert.match(schedule, /Imam juga menjadi Khatib/);
  assert.match(schedule, /Aktifkan jika satu orang bertugas sebagai imam sekaligus khatib/);
  assert.match(schedule, /aria-pressed=\{sameImamKhatib\}/);
  assert.match(schedule, /disabled=\{sameImamKhatib\}/);
  assert.match(schedule, /khatib: sameImamKhatib \? value : current\.khatib/);
  assert.match(schedule, /if \(next\) setForm\(\(value\) => \(\{ \.\.\.value, khatib: value\.imam \}\)\)/);
});

test('inactive transaction categories stay auditable but are excluded from new transaction entry', async () => {
  const routes = await source('apps/api/src/routes.js');
  const settings = await source('apps/web/src/components/settings/CategorySettings.jsx');
  const createForm = await source('apps/web/src/pages/TransactionForm.jsx');
  const editSheet = await source('apps/web/src/features/transactions/TransactionEditSheet.jsx');

  assert.match(routes, /AS transactionCount/);
  assert.match(routes, /transactions\.category_id = transaction_categories\.id/);
  assert.match(routes, /!category\.isActive/);
  assert.match(routes, /Kategori transaksi tidak valid atau sudah dinonaktifkan/);
  assert.match(routes, /!category\.isActive && Number\(category\.id\) !== Number\(existing\.categoryId\)/);
  assert.match(routes, /TRANSACTION_CATEGORY_UPDATE/);
  assert.match(routes, /before: \{/);
  assert.match(routes, /after: \{/);

  assert.match(settings, /Transaksi lama tetap tersimpan dan tetap dapat diaudit/);
  assert.match(settings, /transactionCount/);
  assert.match(settings, /Nonaktifkan/);
  assert.match(settings, /Aktifkan/);
  assert.doesNotMatch(settings, /DropdownMenuTrigger/);

  assert.match(createForm, /result\.data\.filter\(\(item\) => item\.isActive\)/);
  assert.match(editSheet, /item\.isActive \|\| Number\(item\.id\) === Number\(transaction\.categoryId\)/);
  assert.match(editSheet, /nonaktif, transaksi lama/);
});


test('treasurer approval workflow stages financial changes until Ketua review', async () => {
  const db = await source('apps/api/src/db.js');
  const routes = await source('apps/api/src/routes.js');
  const api = await source('apps/web/src/lib/api.js');
  const panel = await source('apps/web/src/features/transactions/TransactionApprovalPanel.jsx');
  const transactions = await source('apps/web/src/pages/Transactions.jsx');
  const form = await source('apps/web/src/pages/TransactionForm.jsx');
  const edit = await source('apps/web/src/features/transactions/TransactionEditSheet.jsx');

  assert.match(db, /CREATE TABLE IF NOT EXISTS transaction_approval_requests/);
  assert.match(db, /PENDING_REVIEW/);
  assert.match(db, /REVISION_REQUIRED/);
  assert.match(db, /ON DELETE SET NULL/);
  assert.match(db, /idx_transaction_approval_active_target/);

  assert.match(routes, /TRANSACTION_APPROVAL_SUBMITTED/);
  assert.match(routes, /TRANSACTION_APPROVAL_REVISION_REQUIRED/);
  assert.match(routes, /TRANSACTION_APPROVAL_RESUBMITTED/);
  assert.match(routes, /TRANSACTION_APPROVAL_APPROVED/);
  assert.match(routes, /\/transaction-approvals\/:id\/review/);
  assert.match(routes, /\/transaction-approvals\/:id\/resubmit/);
  assert.match(routes, /req\.user\.role === 'TREASURER'/);
  assert.match(routes, /approvalRequired: true/);
  assert.match(routes, /status = 'APPROVED'/);
  assert.match(routes, /TRANSACTION_APPROVAL_DOCUMENTS_UPDATED/);
  assert.match(routes, /baseUpdatedAt/);
  assert.match(routes, /Transaksi berubah setelah pengajuan dibuat/);

  assert.match(api, /transactionApprovals/);
  assert.match(api, /reviewTransactionApproval/);
  assert.match(api, /resubmitTransactionApproval/);
  assert.match(api, /approvalAttachmentUrl/);
  assert.match(api, /uploadApprovalAttachments/);

  assert.match(panel, /Review Transaksi/);
  assert.match(panel, /Pengajuan Saya/);
  assert.match(panel, /searchParams\.get\('id'\)/);
  assert.match(panel, /Approve & posting/);
  assert.match(panel, /Minta revisi/);
  assert.match(panel, /Perbaiki pengajuan/);
  assert.match(panel, /Catatan Ketua/);
  assert.match(panel, /TransactionComparison/);
  assert.match(panel, /Saat ini/);
  assert.match(panel, /Usulan/);
  assert.match(panel, /Buka bukti/);
  assert.match(panel, /Ganti bukti/);

  const approvalsPage = await source('apps/web/src/pages/Approvals.jsx');
  assert.match(approvalsPage, /TransactionApprovalPanel/);
  assert.match(transactions, /to="\/approvals"/);
  assert.match(transactions, /Penghapusan dikirim ke Ketua/);
  assert.match(form, /requiresApproval/);
  assert.match(form, /Ajukan untuk review/);
  assert.match(edit, /requiresApproval/);
  assert.match(edit, /Ajukan untuk review/);
});
