import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = path.resolve(new URL('..', import.meta.url).pathname);
async function source(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

test('dashboard overhaul phase 1 installs the intended UI foundation', async () => {
  const pkg = JSON.parse(await source('apps/web/package.json'));
  const components = JSON.parse(await source('components.json'));
  const uiCss = await source('apps/web/src/styles/ui.css');

  assert.ok(pkg.dependencies['@tabler/icons-react']);
  assert.ok(pkg.dependencies['@tanstack/react-table']);
  assert.ok(pkg.dependencies.recharts);
  assert.ok(pkg.dependencies.sonner);
  assert.ok(pkg.dependencies['@radix-ui/react-dialog']);
  assert.ok(pkg.dependencies['@fontsource-variable/ibm-plex-sans']);
  assert.ok(pkg.devDependencies.tailwindcss);
  assert.equal(components.style, 'nova');
  assert.equal(components.iconLibrary, 'tabler');
  assert.match(uiCss, /IBM Plex Sans Variable/);
  assert.match(uiCss, /--ui-primary: #146b5a/);
  assert.doesNotMatch(uiCss, /@import "tailwindcss";/);
});

test('dashboard shell uses shadcn-style sidebar composition and removes legacy SaaS nav clutter', async () => {
  const shell = await source('apps/web/src/components/AppShell.jsx');
  const sidebar = await source('apps/web/src/components/app/AppSidebar.jsx');

  assert.match(shell, /SidebarProvider/);
  assert.match(shell, /AppHeader/);
  assert.match(shell, /Toaster/);
  assert.match(sidebar, /Jadwal Jumat & Agenda/);
  assert.match(sidebar, /Tampilan Publik/);
  assert.doesNotMatch(sidebar, /Kas Masuk/);
  assert.doesNotMatch(sidebar, /Kas Keluar/);
  assert.doesNotMatch(sidebar, /CircleDollarSign/);
  assert.match(sidebar, /@tabler\/icons-react/);
});

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
  assert.match(routes, /cashflow: getCashflowSeries\(chartFrom, dashboardDate\)/);
  assert.match(routes, /monthSummary: getPeriodSummary/);

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

  assert.match(routes, /cashflow: getCashflowSeries\(range\.from, range\.to\)/);
  assert.match(reports, /BarChart/);
  assert.match(reports, /Distribusi kategori/);
  assert.match(reports, /Rincian kategori/);
  assert.match(reports, /TableHeader/);
  assert.match(reports, /Unduh CSV/);
  assert.doesNotMatch(reports, /section-kicker/);
});


test('phase 3 transactions use TanStack desktop tables, mobile cards, Radix sheets, and alert dialogs', async () => {
  const page = await source('apps/web/src/pages/Transactions.jsx');
  const table = await source('apps/web/src/components/finance/TransactionTable.jsx');
  const edit = await source('apps/web/src/components/finance/TransactionEditSheet.jsx');
  const remove = await source('apps/web/src/components/finance/TransactionDeleteDialog.jsx');

  assert.match(page, /TransactionTable/);
  assert.match(page, /TransactionMobileList/);
  assert.match(page, /TransactionEditSheet/);
  assert.match(page, /TransactionDeleteDialog/);
  assert.doesNotMatch(page, /window\.confirm/);
  assert.doesNotMatch(page, /TransactionRow/);

  assert.match(table, /@tanstack\/react-table/);
  assert.match(table, /getPaginationRowModel/);
  assert.match(table, /DropdownMenu/);
  assert.match(edit, /SheetContent/);
  assert.match(edit, /FieldGroup/);
  assert.match(remove, /AlertDialogContent/);
});

test('phase 3 transaction entry is mobile-first shadcn form composition', async () => {
  const form = await source('apps/web/src/pages/TransactionForm.jsx');

  assert.match(form, /InputGroup/);
  assert.match(form, /ToggleGroup/);
  assert.match(form, /FieldGroup/);
  assert.match(form, /SelectGroup/);
  assert.match(form, /UploadField/);
  assert.match(form, /fixed inset-x-0 bottom-0/);
  assert.match(form, /@tabler\/icons-react/);
  assert.doesNotMatch(form, /lucide-react/);
  assert.doesNotMatch(form, /section-kicker/);
});
