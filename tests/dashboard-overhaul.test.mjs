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
