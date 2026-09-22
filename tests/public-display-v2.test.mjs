import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import {
  getIqamahTime,
  getPrayerDisplayState
} from '../apps/web/src/lib/prayerDisplay.js';

const root = path.resolve(new URL('..', import.meta.url).pathname);

async function source(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

test('public display remains a fixed no-scroll TV viewport', async () => {
  const css = await source('apps/web/src/styles/public-display.css');
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /overflow:\s*hidden/);
  assert.match(css, /grid-template-rows/);
});

test('media-first layout gives YouTube the largest column and finance about twenty percent', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');
  const css = await source('apps/web/src/styles/public-display.css');

  assert.match(jsx, /prayer-focus-panel/);
  assert.match(jsx, /youtube-stage/);
  assert.match(jsx, /finance-rail/);
  assert.match(css, /grid-template-columns:\s*21%\s+minmax\(0,\s*1fr\)\s+20%/);

  const left = jsx.indexOf('className="prayer-focus-panel"');
  const video = jsx.indexOf('className="youtube-stage"');
  const finance = jsx.indexOf('className="finance-rail"');
  assert.ok(left >= 0 && video > left && finance > video);
});

test('current time and next adhan stay in the upper-left prayer focus', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');
  assert.match(jsx, /Waktu sekarang/);
  assert.match(jsx, /Menuju adzan/);
  assert.match(jsx, /getPrayerDisplayState/);
});

test('iqamah is exactly five minutes after adhan while next adhan stays independent', () => {
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

  const at1119 = getPrayerDisplayState(
    today,
    tomorrow,
    new Date('2026-09-22T11:19:00+07:00')
  );

  assert.equal(at1119.nextAdhan.prayerName, 'Ashar');
  assert.equal(at1119.nextAdhan.adhanTime, '14:29');
  assert.equal(at1119.activeIqamah.prayerName, 'Dzuhur');
  assert.equal(
    at1119.activeIqamah.target.getTime(),
    new Date('2026-09-22T11:22:00+07:00').getTime()
  );

  const at1156 = getPrayerDisplayState(
    today,
    tomorrow,
    new Date('2026-09-22T11:56:25+07:00')
  );

  assert.equal(at1156.nextAdhan.prayerName, 'Ashar');
  assert.equal(at1156.activeIqamah, null);
});

test('five-prayer schedule stays in its own full-width rail below the main display', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');
  const main = jsx.indexOf('className="media-signage-main"');
  const prayerStrip = jsx.indexOf('className="media-prayer-strip"');
  const ticker = jsx.indexOf('className="verse-ticker"');

  assert.ok(main >= 0);
  assert.ok(prayerStrip > main);
  assert.ok(ticker > prayerStrip);
  assert.match(jsx, /Iqamah \{getIqamahTime/);
});

test('finance rail keeps balance, cash-in, and cash-out visible while only finance content rotates', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');
  assert.match(jsx, /Saldo saat ini/);
  assert.match(jsx, /Kas masuk/);
  assert.match(jsx, /Kas keluar/);
  assert.match(jsx, /FINANCE_CAROUSEL_INTERVAL_MS/);
  assert.match(jsx, /Transaksi Terbaru/);
  assert.match(jsx, /Rekening Donasi/);
});

test('bottom ticker only consumes active VERSE content from the public message payload', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');
  const css = await source('apps/web/src/styles/public-display.css');

  assert.match(jsx, /message\.kind === 'VERSE'/);
  assert.match(jsx, /verse-ticker-track/);
  assert.match(css, /@keyframes verse-ticker-scroll/);
  assert.match(css, /animation:\s*verse-ticker-scroll/);
});

test('database seeds verified Quran and sahih-hadith references without duplicating edited rows', async () => {
  const db = await source('apps/api/src/db.js');

  assert.match(db, /seed_key/);
  assert.match(db, /QS\. At-Taubah 9:18/);
  assert.match(db, /Sahih al-Bukhari 527/);
  assert.match(db, /Sahih al-Bukhari 645/);
  assert.match(db, /Sahih Muslim 2588/);
  assert.match(db, /QS\. Al-Baqarah 2:261/);
  assert.match(db, /INSERT OR IGNORE INTO public_messages/);
});

test('admin can edit, reorder, activate, and delete multiple running-text entries', async () => {
  const admin = await source('apps/web/src/pages/AdminSettings.jsx');

  assert.match(admin, /startEditMessage/);
  assert.match(admin, /saveEditedMessage/);
  assert.match(admin, /Edit/);
  assert.match(admin, /Simpan perubahan/);
  assert.match(admin, /toggleMessage/);
  assert.match(admin, /deleteMessage/);
  assert.match(admin, /sortOrder/);
});

test('Situbondo prayer provider remains configured with Kemenag RI method', async () => {
  const service = await source('apps/api/src/prayerService.js');
  assert.match(service, /RS Elizabeth Situbondo/);
  assert.match(service, /latitude:\s*-7\.7074/);
  assert.match(service, /longitude:\s*113\.9969/);
  assert.match(service, /calculationMethod:\s*20/);
  assert.match(service, /Asia\/Jakarta/);
});

test('public endpoint still includes today and tomorrow prayer schedules for after-Isya rollover', async () => {
  const routes = await source('apps/api/src/routes.js');
  assert.match(routes, /nextDayPrayerSchedule/);
  assert.match(routes, /getProviderPrayerSchedule\(addDays\(date, 1\)\)/);
});

test('public display hides application branding and technical provider copy', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');

  assert.doesNotMatch(jsx, /Amanah yang Terlihat/);
  assert.doesNotMatch(jsx, /Aktivitas Kas/);
  assert.doesNotMatch(jsx, /Pusat Informasi Jamaah/);
  assert.doesNotMatch(jsx, /Kementerian Agama Republik Indonesia/);
  assert.doesNotMatch(jsx, /cache aman/i);
  assert.doesNotMatch(jsx, /Fallback jadwal lokal/);
  assert.match(jsx, /Iqamah 5 menit setelah adzan/);
});
