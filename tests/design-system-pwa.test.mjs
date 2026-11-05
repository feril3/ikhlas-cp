import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const web = path.join(root, 'apps/web');
const source = (relativePath) => readFile(path.join(root, relativePath), 'utf8');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  }));
  return files.flat();
}

test('design tokens: every UI file passes the semantic token check', () => {
  const output = execFileSync(process.execPath, ['scripts/check-token-usage.mjs', 'src'], { cwd: web, encoding: 'utf8' });
  assert.match(output, /Semua file memakai token semantik/);
});

test('design tokens: app styles import the vendored token sheet and Plus Jakarta Sans', async () => {
  const uiCss = await source('apps/web/src/styles/ui.css');
  const tokens = await source('apps/web/src/styles/tokens.css');
  const main = await source('apps/web/src/main.jsx');
  assert.match(uiCss, /^@layer theme, base, components, utilities;/);
  assert.match(uiCss, /@import "\.\/tokens\.css"/);
  assert.doesNotMatch(uiCss, /tailwindcss\/preflight/);
  assert.match(tokens, /--color-\*: initial/);
  assert.match(tokens, /--shadow-panel: var\(--elevation-panel\)/);
  assert.match(main, /@fontsource-variable\/plus-jakarta-sans/);
});

test('icons: the app uses one icon set (Hugeicons) and no Tabler or lucide imports', async () => {
  const pkg = JSON.parse(await source('apps/web/package.json'));
  assert.ok(pkg.dependencies['@hugeicons/react']);
  assert.ok(pkg.dependencies['@hugeicons/core-free-icons']);
  assert.equal(pkg.dependencies['lucide-react'], undefined);
  const files = (await walk(path.join(web, 'src'))).filter((file) => /\.jsx?$/.test(file));
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    assert.doesNotMatch(text, /from ['"](@tabler\/icons-react|lucide-react)['"]/, file);
  }
  const icons = await source('apps/web/src/components/icons.jsx');
  assert.match(icons, /HugeiconsIcon/);
  assert.match(icons, /strokeWidth=\{stroke\}/);
});

test('public display stays isolated from the redesigned app styles', async () => {
  const base = await source('apps/web/src/styles/base.css');
  const ui = await source('apps/web/src/styles/ui.css');
  const display = await source('apps/web/src/pages/PublicDisplay.jsx');
  const main = await source('apps/web/src/main.jsx');
  assert.match(base, /html\.public-display-route/);
  assert.match(ui, /html:not\(\.public-display-route\)/);
  assert.match(display, /classList\.add\('public-display-route'\)/);
  assert.match(display, /formatRupiahLegacy as formatRupiah/);
  assert.match(main, /startsWith\('\/public-display'\)/);
});

test('shell: canvas sidebar, floating panel, skip link and mobile bottom navigation', async () => {
  const shell = await source('apps/web/src/components/AppShell.jsx');
  const sidebar = await source('apps/web/src/components/ui/sidebar.jsx');
  const mobileNav = await source('apps/web/src/components/app/MobileNav.jsx');
  const nav = await source('apps/web/src/components/app/navigation.js');
  assert.match(shell, /Lewati ke konten/);
  assert.match(shell, /MobileNav/);
  assert.match(shell, /ApprovalCountsProvider/);
  assert.match(sidebar, /lg:rounded-3xl lg:shadow-panel/);
  assert.match(sidebar, /data-\[active=true\]:bg-sidebar-primary/);
  assert.match(sidebar, /React\.forwardRef\(function SidebarMenuButton/);
  assert.match(mobileNav, /Navigasi bawah/);
  assert.match(mobileNav, /safe-bottom/);
  assert.match(mobileNav, /Catat transaksi/);
  assert.match(nav, /Perlu review/);
  assert.match(nav, /Pengajuan saya/);
});

test('pwa: manifest, icons and iOS meta make the app installable', async () => {
  const manifest = JSON.parse(await source('apps/web/public/manifest.webmanifest'));
  const html = await source('apps/web/index.html');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.type === 'image/png'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable'));
  assert.ok(manifest.shortcuts.some((item) => item.url === '/approvals'));
  for (const file of ['icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png', 'badge-96.png']) {
    assert.ok((await stat(path.join(web, 'public/icons', file))).size > 0, file);
  }
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-touch-icon/);
  assert.match(html, /apple-mobile-web-app-capable/);
});

test('pwa: service worker shows push notifications and opens the related approval', async () => {
  const sw = await source('apps/web/public/sw.js');
  const pwa = await source('apps/web/src/lib/pwa.js');
  assert.match(sw, /addEventListener\('push'/);
  assert.match(sw, /showNotification/);
  assert.match(sw, /addEventListener\('notificationclick'/);
  assert.match(sw, /push-received/);
  assert.match(pwa, /pushManager\.subscribe/);
  assert.match(pwa, /beforeinstallprompt/);
});

test('camera upload: evidence can be photographed and is compressed before upload', async () => {
  const upload = await source('apps/web/src/features/transactions/FileUploadField.jsx');
  const image = await source('apps/web/src/lib/image.js');
  assert.match(upload, /capture="environment"/);
  assert.match(upload, /Ambil foto/);
  assert.match(upload, /prepareUpload/);
  assert.match(image, /MAX_SIDE = 1600/);
  assert.match(image, /image\/jpeg/);
});

test('approval notifications use the in-app flow and web push, not Telegram', async () => {
  const routes = await source('apps/api/src/routes.js');
  const push = await source('apps/api/src/push.js');
  const db = await source('apps/api/src/db.js');
  assert.doesNotMatch(routes, /telegram/i);
  assert.match(routes, /notifyReviewers\(request, 'CREATE'/);
  assert.match(routes, /notifyReviewers\(updated, 'RESUBMIT'/);
  assert.match(routes, /notifySubmitter\(request, 'APPROVE'\)/);
  assert.match(routes, /\/notifications\/summary/);
  assert.match(push, /setVapidDetails/);
  assert.match(push, /\[404, 410\]/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS push_subscriptions/);
});
