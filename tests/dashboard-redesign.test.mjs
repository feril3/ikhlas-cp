import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = path.resolve(new URL('..', import.meta.url).pathname);

async function source(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

test('dashboard redesign foundation installs the agreed UI stack', async () => {
  const pkg = JSON.parse(await source('apps/web/package.json'));
  const components = JSON.parse(await source('apps/web/components.json'));

  for (const dependency of [
    '@fontsource-variable/ibm-plex-sans',
    '@tabler/icons-react',
    '@tanstack/react-table',
    'recharts',
    'radix-ui',
    'tailwindcss'
  ]) {
    assert.ok(
      pkg.dependencies?.[dependency] || pkg.devDependencies?.[dependency],
      `missing ${dependency}`
    );
  }

  assert.equal(components.style, 'radix-nova');
  assert.equal(components.iconLibrary, 'tabler');
  assert.equal(components.aliases.ui, '@/components/ui');
});

test('dashboard typography and theme use IBM Plex with Amanah semantic tokens', async () => {
  const css = await source('apps/web/src/index.css');
  const base = await source('apps/web/src/styles/base.css');

  assert.match(css, /IBM Plex Sans Variable/);
  assert.doesNotMatch(css, /fontsource-variable\/geist/);
  assert.match(css, /--primary:\s*#146b5a/);
  assert.match(css, /--sidebar:\s*#0b463b/);
  assert.match(css, /--sidebar-primary:\s*#d2b878/);
  assert.match(base, /IBM Plex Sans Variable/);
  assert.doesNotMatch(base, /Plus Jakarta Sans/);
});

test('new app shell uses shadcn sidebar, breadcrumb, dropdown and toaster primitives', async () => {
  const shell = await source('apps/web/src/components/AppShell.jsx');
  const sidebar = await source('apps/web/src/components/app/AppSidebar.jsx');
  const header = await source('apps/web/src/components/app/AppHeader.jsx');
  const user = await source('apps/web/src/components/app/UserMenu.jsx');

  assert.match(shell, /SidebarProvider/);
  assert.match(shell, /SidebarInset/);
  assert.match(shell, /Toaster/);
  assert.doesNotMatch(shell, /page-container/);

  assert.match(sidebar, /@tabler\/icons-react/);
  assert.match(sidebar, /SidebarGroup/);
  assert.match(sidebar, /TooltipProvider/);
  assert.match(sidebar, /Jadwal Jumat & Agenda/);
  assert.doesNotMatch(sidebar, /transactions\/income/);
  assert.doesNotMatch(sidebar, /transactions\/expense/);
  assert.doesNotMatch(sidebar, /lucide-react/);

  assert.match(header, /Breadcrumb/);
  assert.match(header, /Tampilan Publik/);
  assert.match(user, /DropdownMenu/);
  assert.match(user, /AvatarFallback/);
});

test('Tailwind foundation loads before Public Display styles so TV remains independently overridden', async () => {
  const main = await source('apps/web/src/main.jsx');
  const indexPosition = main.indexOf("import './index.css'");
  const displayPosition = main.indexOf("import './styles/public-display.css'");
  const ornamentPosition = main.indexOf("import './styles/public-display-ornamental.css'");

  assert.ok(indexPosition >= 0);
  assert.ok(displayPosition > indexPosition);
  assert.ok(ornamentPosition > displayPosition);
});
