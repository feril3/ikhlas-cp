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
  assert.match(upload, /file\?\.name/);
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


test('phase 5 login uses the final dashboard design system', async () => {
  const login = await source('apps/web/src/pages/Login.jsx');
  const loading = await source('apps/web/src/components/LoadingState.jsx');
  const uiCss = await source('apps/web/src/styles/ui.css');

  assert.match(login, /@tabler\/icons-react/);
  assert.match(login, /CardContent/);
  assert.match(login, /FieldGroup/);
  assert.match(login, /InputGroup/);
  assert.match(login, /AlertDescription/);
  assert.match(login, /Spinner/);
  assert.match(login, /dashboard-shell/);
  assert.match(login, /Buka Tampilan Publik/);
  assert.doesNotMatch(login, /lucide-react/);
  assert.doesNotMatch(login, /auth-screen|auth-card|password-field|button primary/);

  assert.match(loading, /Spinner/);
  assert.match(loading, /text-muted-foreground/);
  assert.doesNotMatch(loading, /loading-state|spinner"/);

  assert.match(uiCss, /:root \{[\s\S]*--ui-background:/);
  assert.match(uiCss, /\.dashboard-shell \{/);
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

test('phase 6a collapsed sidebar becomes a true icon rail with a stable account trigger', async () => {
  const sidebarUi = await source('apps/web/src/components/ui/sidebar.jsx');
  const sidebar = await source('apps/web/src/components/app/AppSidebar.jsx');
  const userMenu = await source('apps/web/src/components/app/UserMenu.jsx');

  assert.match(sidebarUi, /lg:data-\[state=collapsed\]:w-\[72px\]/);
  assert.match(sidebarUi, /IconLayoutSidebarLeftExpand/);
  assert.match(sidebarUi, /Lebarkan navigasi/);
  assert.match(sidebar, /justify-center px-0/);
  assert.match(sidebar, /flex w-full justify-center/);
  assert.match(userMenu, /bg-transparent p-0 text-sidebar-foreground/);
  assert.match(userMenu, /side=\{sidebar \? "right" : "bottom"\}/);
  assert.match(userMenu, /Menu akun/);
});

test('phase 6a charts render immediately with compact non-wrapping axes', async () => {
  const dashboard = await source('apps/web/src/pages/Dashboard.jsx');
  const reports = await source('apps/web/src/pages/Reports.jsx');

  assert.match(dashboard, /formatAxisAmount/);
  assert.match(dashboard, /color: 'var\(--ui-chart-1\)'/);
  assert.match(dashboard, /color: 'var\(--ui-chart-2\)'/);
  assert.match(dashboard, /tickFormatter=\{formatAxisAmount\}/);
  assert.match(dashboard, /isAnimationActive=\{false\}/);
  assert.doesNotMatch(dashboard, /function compactRupiah/);

  assert.match(reports, /formatAxisAmount/);
  assert.match(reports, /tickFormatter=\{formatAxisAmount\}/);
  assert.match(reports, /isAnimationActive=\{false\}/);
  assert.doesNotMatch(reports, /function compactRupiah/);
});
