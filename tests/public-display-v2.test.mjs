import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import {
  getIqamahTime,
  getPrayerState
} from '../apps/web/src/lib/prayerDisplay.js';

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


test('public display visual-balance pass keeps donation, carousel, and next-prayer hierarchy explicit', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');
  const css = await source('apps/web/src/styles/public-display-ornamental.css');

  assert.match(jsx, /signage-donation-emblem/);
  assert.match(jsx, /signage-donation-meta/);
  assert.match(jsx, /signage-carousel-progress/);
  assert.match(jsx, /signage-prayer-next/);

  assert.match(css, /viewing-distance legibility/);
  assert.match(css, /signage-donation-number/);
  assert.match(css, /signage-carousel-progress/);
  assert.match(css, /signage-prayer-next/);
});


test('iqamah countdown is anchored to adhan plus five minutes, not app start time', () => {
  const today = {
    scheduleDate: '2026-09-22',
    items: [
      { prayerName: 'Subuh', adhanTime: '03:56' },
      { prayerName: 'Dzuhur', adhanTime: '11:17' },
      { prayerName: 'Ashar', adhanTime: '14:29' },
      { prayerName: 'Maghrib', adhanTime: '17:20' },
      { prayerName: 'Isya', adhanTime: '18:29' }
    ]
  };

  const tomorrow = {
    scheduleDate: '2026-09-23',
    items: [{ prayerName: 'Subuh', adhanTime: '03:56' }]
  };

  assert.equal(getIqamahTime('2026-09-22', '11:17'), '11:22');

  const duringIqamah = getPrayerState(
    today,
    tomorrow,
    new Date('2026-09-22T11:19:00+07:00')
  );

  assert.equal(duringIqamah.kind, 'iqamah');
  assert.equal(duringIqamah.prayerName, 'Dzuhur');
  assert.equal(
    duringIqamah.target.getTime(),
    new Date('2026-09-22T11:22:00+07:00').getTime()
  );

  const afterIqamahWindow = getPrayerState(
    today,
    tomorrow,
    new Date('2026-09-22T11:56:25+07:00')
  );

  assert.equal(afterIqamahWindow.kind, 'adhan');
  assert.equal(afterIqamahWindow.prayerName, 'Ashar');
  assert.equal(afterIqamahWindow.adhanTime, '14:29');
});

test('public display copy stays jamaah-first and hides technical/product branding', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');

  assert.doesNotMatch(jsx, /Amanah yang Terlihat/);
  assert.doesNotMatch(jsx, /Aktivitas Kas/);
  assert.doesNotMatch(jsx, /Pusat Informasi Jamaah/);
  assert.doesNotMatch(jsx, /Kementerian Agama Republik Indonesia/);
  assert.doesNotMatch(jsx, /cache aman/i);
  assert.doesNotMatch(jsx, /Fallback jadwal lokal/);

  assert.match(jsx, /Iqamah 5 menit setelah adzan/);
  assert.match(jsx, /Salat berikutnya/);
  assert.match(jsx, /Transaksi Terbaru/);
});
