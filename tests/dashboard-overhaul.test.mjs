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


test('phase 6b contrast tokens meet visual accessibility gates', async () => {
  const uiCss = await source('apps/web/src/styles/ui.css');

  function token(name) {
    const match = uiCss.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
    assert.ok(match, `Missing color token --${name}`);
    return match[1];
  }

  function luminance(hex) {
    const channels = hex.slice(1).match(/.{2}/g).map((part) => Number.parseInt(part, 16) / 255);
    const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }

  function contrast(a, b) {
    const first = luminance(a);
    const second = luminance(b);
    const lighter = Math.max(first, second);
    const darker = Math.min(first, second);
    return (lighter + 0.05) / (darker + 0.05);
  }

  assert.ok(contrast(token('ui-input'), token('ui-card')) >= 3, 'Input boundary must reach 3:1 against card');
  assert.ok(contrast(token('ui-muted-foreground'), token('ui-background')) >= 4.5, 'Muted text must reach 4.5:1 against app background');
  assert.match(uiCss, /:where\(\.dashboard-shell \*\)/);
  assert.doesNotMatch(uiCss, /\.dashboard-shell \* \{/);
});

test('phase 6b primitives expose clear borders, focus and selected states', async () => {
  const input = await source('apps/web/src/components/ui/input.jsx');
  const textarea = await source('apps/web/src/components/ui/textarea.jsx');
  const inputGroup = await source('apps/web/src/components/ui/input-group.jsx');
  const button = await source('apps/web/src/components/ui/button.jsx');
  const table = await source('apps/web/src/components/ui/table.jsx');
  const toggle = await source('apps/web/src/components/ui/toggle.jsx');
  const select = await source('apps/web/src/components/ui/select.jsx');
  const switchUi = await source('apps/web/src/components/ui/switch.jsx');
  const badge = await source('apps/web/src/components/ui/badge.jsx');
  const alert = await source('apps/web/src/components/ui/alert.jsx');
  const settingsNav = await source('apps/web/src/components/settings/SettingsNav.jsx');

  assert.match(input, /border-input/);
  assert.match(input, /hover:border-ring\/70/);
  assert.match(textarea, /bg-card/);
  assert.match(textarea, /focus-visible:ring-ring\/25/);
  assert.match(inputGroup, /bg-card/);
  assert.match(button, /outline: 'border border-input/);
  assert.match(table, /bg-muted\/55/);
  assert.match(table, /hover:bg-accent\/45/);
  assert.match(toggle, /data-\[state=on\]:border-primary\/55/);
  assert.match(toggle, /data-\[state=on\]:bg-accent/);
  assert.match(select, /hover:border-ring\/70/);
  assert.match(switchUi, /border border-input bg-card/);
  assert.match(switchUi, /data-\[state=checked\]:border-primary/);
  assert.match(badge, /ui-success-border/);
  assert.match(alert, /ui-danger-border/);
  assert.doesNotMatch(alert, /opacity-90/);
  assert.match(settingsNav, /inset_3px_0_0_var\(--ui-primary\)/);
});


test('phase 6c page layouts use desktop space without sacrificing mobile composition', async () => {
  const dashboard = await source('apps/web/src/pages/Dashboard.jsx');
  const transactions = await source('apps/web/src/pages/Transactions.jsx');
  const form = await source('apps/web/src/pages/TransactionForm.jsx');
  const reports = await source('apps/web/src/pages/Reports.jsx');

  assert.match(dashboard, /featured/);
  assert.match(dashboard, /xl:grid-cols-\[1\.15fr_repeat\(3,1fr\)\]/);
  assert.match(dashboard, /xl:grid-cols-\[minmax\(0,1fr\)_360px\]/);
  assert.match(dashboard, /border-b bg-muted\/25/);

  assert.match(transactions, /xl:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(transactions, />Metode\s*<Select/);
  assert.match(transactions, />Kategori\s*<Select/);
  assert.match(transactions, />Dari\s*<Input/);
  assert.match(transactions, />Sampai\s*<Input/);
  assert.match(transactions, /md:grid-cols-2/);

  assert.match(form, /max-w-6xl/);
  assert.match(form, /lg:grid-cols-\[minmax\(0,1\.35fr\)_minmax\(320px,\.65fr\)\]/);
  assert.match(form, /lg:sticky lg:top-20/);
  assert.match(form, /sticky bottom-0/);

  assert.match(reports, /md:grid-cols-2 xl:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)_auto\]/);
  assert.match(reports, /bg-muted\/55 p-1/);
  assert.match(reports, /h-\[290px\]/);
});

test('phase 6c schedule reduces repeated status chrome while preserving responsive tables and cards', async () => {
  const schedule = await source('apps/web/src/pages/Schedule.jsx');

  assert.match(schedule, /space-y-5/);
  assert.match(schedule, /border-b bg-muted\/25/);
  assert.match(schedule, /bg-muted-foreground\/55/);
  assert.match(schedule, /Disembunyikan/);
  assert.match(schedule, /hidden md:block/);
  assert.match(schedule, /md:hidden/);
  assert.doesNotMatch(schedule, /variant=\{complete \? 'success' : 'outline'\}/);
});

test('phase 6c settings favor readable content width and responsive internal navigation', async () => {
  const page = await source('apps/web/src/pages/AdminSettings.jsx');
  const nav = await source('apps/web/src/components/settings/SettingsNav.jsx');
  const general = await source('apps/web/src/components/settings/GeneralSettings.jsx');
  const finance = await source('apps/web/src/components/settings/FinanceSettings.jsx');
  const categories = await source('apps/web/src/components/settings/CategorySettings.jsx');
  const display = await source('apps/web/src/components/settings/PublicDisplaySettings.jsx');
  const users = await source('apps/web/src/components/settings/UserSettings.jsx');
  const audit = await source('apps/web/src/components/settings/AuditSettings.jsx');

  assert.match(page, /lg:grid-cols-\[190px_minmax\(0,1fr\)\]/);
  assert.match(page, /max-w-5xl/);
  assert.match(nav, /lg:hidden/);
  assert.match(nav, /lg:sticky lg:top-20 lg:block/);
  assert.doesNotMatch(nav, /rounded-xl border bg-card p-2/);

  assert.match(general, /border-b bg-muted\/25/);
  assert.match(general, /md:grid-cols-2/);
  assert.match(finance, /md:grid-cols-2/);
  assert.match(finance, /space-y-5 p-5/);

  for (const content of [categories, display, users]) {
    assert.match(content, /flex flex-col gap-3 border-b bg-muted\/25/);
    assert.match(content, /w-full sm:w-auto/);
  }

  assert.match(audit, /bg-muted\/25/);
  assert.match(audit, /sm:grid-cols-2 xl:grid-cols-4/);
});
