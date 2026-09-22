import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = path.resolve(new URL('..', import.meta.url).pathname);

async function source(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

test('public display is a fixed no-scroll viewport', async () => {
  const css = await source('apps/web/src/styles/public-display.css');
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /overflow:\s*hidden/);
  assert.match(css, /grid-template-rows/);
});

test('public display uses a dedicated secondary-content carousel', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');
  assert.match(jsx, /signage-carousel/);
  assert.match(jsx, /signage-carousel-dots/);
  assert.match(jsx, /CAROUSEL_INTERVAL_MS/);
  assert.doesNotMatch(jsx, /Dashboard Admin/);
});

test('prayer strip stays outside the carousel', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');
  const carousel = jsx.indexOf('className="signage-carousel"');
  const prayerStrip = jsx.indexOf('className="signage-prayer-strip"');
  assert.ok(carousel >= 0);
  assert.ok(prayerStrip > carousel);
});

test('Situbondo prayer provider uses Kemenag RI method and RS Elizabeth coordinates', async () => {
  const service = await source('apps/api/src/prayerService.js');
  assert.match(service, /RS Elizabeth Situbondo/);
  assert.match(service, /latitude:\s*-7\.7074/);
  assert.match(service, /longitude:\s*113\.9969/);
  assert.match(service, /calculationMethod:\s*20/);
  assert.match(service, /Asia\/Jakarta/);
  assert.match(service, /api\.aladhan\.com\/v1\/timings/);
});

test('public endpoint includes today and tomorrow prayer schedules for after-Isya rollover', async () => {
  const routes = await source('apps/api/src/routes.js');
  assert.match(routes, /nextDayPrayerSchedule/);
  assert.match(routes, /getProviderPrayerSchedule\(addDays\(date, 1\)\)/);
});

test('admin schedule editor treats adhan as API-managed', async () => {
  const schedule = await source('apps/web/src/pages/Schedule.jsx');
  assert.match(schedule, /Adzan · API/);
  assert.match(schedule, /Waktu adzan otomatis dari API jadwal salat/);
});


test('public display includes a mosque-inspired ornament system', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');
  const css = await source('apps/web/src/styles/public-display-ornamental.css');

  assert.match(jsx, /signage-mihrab-frame/);
  assert.match(jsx, /signage-corner-ornament/);
  assert.match(jsx, /signage-prayer-frieze/);
  assert.match(jsx, /signage-mosque-seal/);

  assert.match(css, /islamic/i);
  assert.match(css, /signage-pattern-layer/);
  assert.match(css, /ornament-brass/);
  assert.match(css, /signage-prayer-frieze/);
});
