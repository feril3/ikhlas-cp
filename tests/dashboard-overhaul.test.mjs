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
  assert.equal(components.style, 'radix-nova');
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
  assert.match(shell, /max-w-\[1600px\]/);
  assert.doesNotMatch(shell, /page-container/);
  assert.match(sidebar, /Jadwal Jumat & Agenda/);
  assert.match(sidebar, /Tampilan Publik/);
  assert.doesNotMatch(sidebar, /Kas Masuk/);
  assert.doesNotMatch(sidebar, /Kas Keluar/);
  assert.doesNotMatch(sidebar, /CircleDollarSign/);
  assert.match(sidebar, /@tabler\/icons-react/);
  assert.match(sidebar, /forceVisible=\{mobile\}/);
  assert.match(sidebar, /UserMenu compact=\{!expanded\} sidebar/);
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


test('phase 1 shell finalization keeps semantic brand, header action and mobile-safe sidebar primitives', async () => {
  const brand = await source('apps/web/src/components/app/AppBrand.jsx');
  const header = await source('apps/web/src/components/app/AppHeader.jsx');
  const userMenu = await source('apps/web/src/components/app/UserMenu.jsx');
  const sidebarUi = await source('apps/web/src/components/ui/sidebar.jsx');
  const uiCss = await source('apps/web/src/styles/ui.css');

  assert.match(brand, /text-sidebar-primary/);
  assert.doesNotMatch(brand, /text-\[#/);
  assert.match(header, /Tampilan Publik/);
  assert.match(header, /IconDeviceTv/);
  assert.match(userMenu, /sidebar = false/);
  assert.match(sidebarUi, /forceVisible = false/);
  assert.match(sidebarUi, /\[&_svg\]:size-\[18px\]/);
  assert.match(uiCss, /--ui-sidebar-primary: #d2b878/);
  assert.doesNotMatch(uiCss, /\.dashboard-shell \.page-container/);
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

test('phase 3 transaction entry forms are mobile-first shadcn forms with upload state', async () => {
  const form = await source('apps/web/src/pages/TransactionForm.jsx');
  const upload = await source('apps/web/src/features/transactions/FileUploadField.jsx');

  assert.match(form, /FieldGroup/);
  assert.match(form, /InputGroup/);
  assert.match(form, /SelectTrigger/);
  assert.match(form, /ToggleGroup/);
  assert.match(form, /sticky bottom-0/);
  assert.match(form, /h-12/);
  assert.match(form, /MAX_FILE_SIZE/);
  assert.match(form, /FileUploadField/);
  assert.doesNotMatch(form, /lucide-react/);
  assert.doesNotMatch(form, /section-kicker/);
  assert.doesNotMatch(form, /segmented-control/);

  assert.match(upload, /IconPhotoScan/);
  assert.match(upload, /sr-only/);
  assert.match(upload, /file\.name/);
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
