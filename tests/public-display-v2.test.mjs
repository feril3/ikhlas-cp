import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import {
  formatMinuteSecondCountdown,
  getCountdownFocus,
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
  assert.match(css, /grid-template-columns:\s*19%\s+minmax\(0,\s*1fr\)\s+20%/);

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

test('iqamah is exactly eight minutes after adhan while next adhan stays independent', () => {
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

  assert.equal(getIqamahTime('2026-09-22', '11:17'), '11:25');

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
    new Date('2026-09-22T11:25:00+07:00').getTime()
  );

  const afterIqamah = getPrayerDisplayState(
    today,
    tomorrow,
    new Date('2026-09-22T11:25:00+07:00')
  );

  assert.equal(afterIqamah.nextAdhan.prayerName, 'Ashar');
  assert.equal(afterIqamah.activeIqamah, null);
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
  assert.doesNotMatch(jsx, /Iqamah 5 menit setelah adzan/);
});


test('screenshot QA pass reduces dead space and framing noise', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');
  const css = await source('apps/web/src/styles/public-display.css');
  const ornament = await source('apps/web/src/styles/public-display-ornamental.css');

  assert.doesNotMatch(jsx, /youtube-caption/);
  assert.match(jsx, /Bulan ini/);
  assert.match(jsx, /Infaq & Donasi/);
  assert.match(css, /minmax\(104px, 15dvh\)/);
  assert.match(css, /minmax\(54px, 7\.4dvh\)/);
  assert.match(css, /mask-image: linear-gradient/);
  assert.doesNotMatch(ornament, /border-radius: 50% 50% 0 0 \/ 45% 45% 0 0/);
  assert.match(ornament, /inset 0 2px 0/);
});


test('left prayer focus uses one alignment axis without centered mihrab collision', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');
  const css = await source('apps/web/src/styles/public-display.css');
  const ornament = await source('apps/web/src/styles/public-display-ornamental.css');

  assert.doesNotMatch(jsx, /prayer-focus-star/);
  assert.match(css, /\.prayer-focus-panel \{[\s\S]*display:\s*flex/);
  assert.match(css, /\.prayer-focus-next \{[\s\S]*margin-top:\s*clamp\(22px, 2\.8dvh, 34px\)/);
  assert.match(css, /\.prayer-focus-countdown \{[\s\S]*padding:\s*1\.15dvh 0/);
  assert.match(css, /\.prayer-focus-iqamah \{[\s\S]*padding:\s*\.8dvh 0/);
  assert.doesNotMatch(ornament, /\.prayer-focus-panel::after/);
  assert.match(ornament, /\.prayer-focus-panel::before \{[\s\S]*right:\s*18px/);
});


test('public display header shows the full RS Elizabeth Situbondo address', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');
  const css = await source('apps/web/src/styles/public-display.css');

  assert.match(jsx, /Jl\. WR\. Supratman No\.2, Mulyautama, Patokan, Kec\. Situbondo, Kabupaten Situbondo, Jawa Timur 68312/);
  assert.match(jsx, /\{location\.address\}/);
  assert.match(css, /grid-template-columns:\s*minmax\(250px, \.9fr\)\s+minmax\(420px, 1\.15fr\)\s+auto/);
  assert.match(css, /-webkit-line-clamp:\s*2/);
  assert.match(css, /white-space:\s*normal/);
});


test('takeover uses five-minute countdowns, two-minute adhan message, and eight-minute iqamah gap', () => {
  const today = {
    scheduleDate: '2026-09-22',
    items: [
      { prayerName: 'Dzuhur', adhanTime: '11:17' },
      { prayerName: 'Ashar', adhanTime: '14:29' },
      { prayerName: 'Maghrib', adhanTime: '17:20' }
    ]
  };
  const tomorrow = {
    scheduleDate: '2026-09-23',
    items: [{ prayerName: 'Subuh', adhanTime: '03:56' }]
  };

  assert.equal(getIqamahTime('2026-09-22', '14:29'), '14:37');

  const beforeAdhanWindow = getCountdownFocus(today, tomorrow, new Date('2026-09-22T14:23:59+07:00'));
  assert.equal(beforeAdhanWindow, null);

  const adhanCountdown = getCountdownFocus(today, tomorrow, new Date('2026-09-22T14:24:00+07:00'));
  assert.equal(adhanCountdown.kind, 'ADHAN');
  assert.equal(adhanCountdown.prayerName, 'Ashar');
  assert.equal(
    formatMinuteSecondCountdown(adhanCountdown.target - new Date('2026-09-22T14:24:00+07:00')),
    '05:00'
  );

  const adhanNowStart = getCountdownFocus(today, tomorrow, new Date('2026-09-22T14:29:00+07:00'));
  assert.equal(adhanNowStart.kind, 'ADHAN_NOW');
  assert.equal(adhanNowStart.prayerName, 'Ashar');

  const adhanNowEndEdge = getCountdownFocus(today, tomorrow, new Date('2026-09-22T14:30:59+07:00'));
  assert.equal(adhanNowEndEdge.kind, 'ADHAN_NOW');

  const oneMinuteNormalGap = getCountdownFocus(today, tomorrow, new Date('2026-09-22T14:31:00+07:00'));
  assert.equal(oneMinuteNormalGap, null);

  const iqamahCountdown = getCountdownFocus(today, tomorrow, new Date('2026-09-22T14:32:00+07:00'));
  assert.equal(iqamahCountdown.kind, 'IQAMAH');
  assert.equal(iqamahCountdown.prayerName, 'Ashar');
  assert.equal(
    formatMinuteSecondCountdown(iqamahCountdown.target - new Date('2026-09-22T14:32:00+07:00')),
    '05:00'
  );

  const iqamahEndEdge = getCountdownFocus(today, tomorrow, new Date('2026-09-22T14:36:59+07:00'));
  assert.equal(iqamahEndEdge.kind, 'IQAMAH');

  const afterIqamah = getCountdownFocus(today, tomorrow, new Date('2026-09-22T14:37:00+07:00'));
  assert.equal(afterIqamah, null);
});

test('public display takeover hides normal dashboard composition during five-minute focus', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');
  const css = await source('apps/web/src/styles/public-display.css');

  assert.match(jsx, /if \(countdownFocus\)/);
  assert.match(jsx, /className="public-display countdown-takeover"/);
  assert.match(jsx, /ADHAN_NOW/);
  assert.match(jsx, /Waktunya Adzan/);
  assert.match(jsx, /formatMinuteSecondCountdown/);
  assert.match(css, /\.countdown-takeover \{[\s\S]*position:\s*fixed/);
  assert.match(css, /\.countdown-takeover strong \{[\s\S]*font-size:\s*clamp\(120px, 21vw, 330px\)/);
  assert.match(css, /\.adhan-now-message \{[\s\S]*font-size:\s*clamp\(58px, 7\.4vw, 128px\)/);
});

test('public display shows public agenda under prayer focus and Friday officers only from Friday payload', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');
  const routes = await source('apps/api/src/routes.js');

  assert.match(jsx, /className="public-agenda"/);
  assert.match(jsx, /publicAgenda = data\?\.activities\?\.slice\(0, 2\)/);
  assert.match(jsx, /fridaySchedule &&/);
  assert.match(jsx, /Imam/);
  assert.match(jsx, /Khatib/);
  assert.match(jsx, /Bilal/);
  assert.match(routes, /fridaySchedule: getFridaySchedule\(date\)/);
});

test('schedule dashboard manages only upcoming Friday officers and hides past Fridays', async () => {
  const db = await source('apps/api/src/db.js');
  const routes = await source('apps/api/src/routes.js');
  const schedule = await source('apps/web/src/pages/Schedule.jsx');
  const api = await source('apps/web/src/lib/api.js');

  assert.match(db, /CREATE TABLE IF NOT EXISTS friday_schedules/);
  assert.match(routes, /function upcomingFridayDates/);
  assert.match(routes, /getUpcomingFridaySchedules/);
  assert.match(routes, /apiRouter\.put\('\/friday-schedules\/:date'/);
  assert.match(routes, /FRIDAY_SCHEDULE_UPDATE/);
  assert.doesNotMatch(routes, /apiRouter\.put\('\/prayer-schedules\/:date'/);

  assert.match(schedule, /Jadwal Jumat & Agenda/);
  assert.match(schedule, /api\.fridaySchedules\(today, 8\)/);
  assert.match(schedule, /Jumat mendatang/);
  assert.match(schedule, /Imam, Khatib & Bilal/);
  assert.doesNotMatch(schedule, /api\.prayerSchedule/);
  assert.doesNotMatch(schedule, /updatePrayerSchedule/);
  assert.doesNotMatch(schedule, /Jadwal salat/);

  assert.match(api, /fridaySchedules/);
  assert.doesNotMatch(api, /updatePrayerSchedule/);
});

test('existing public agenda can be edited with an audited backend update', async () => {
  const routes = await source('apps/api/src/routes.js');
  const schedule = await source('apps/web/src/pages/Schedule.jsx');
  const api = await source('apps/web/src/lib/api.js');

  assert.match(routes, /apiRouter\.put\('\/activities\/:id'/);
  assert.match(routes, /ACTIVITY_UPDATE/);
  assert.match(routes, /details: \{ before:/);
  assert.match(schedule, /startEditActivity/);
  assert.match(schedule, /saveActivityEdit/);
  assert.match(api, /updateActivity/);
});

test('transactions support audited edit and delete while preserving Drive evidence references', async () => {
  const routes = await source('apps/api/src/routes.js');
  const transactions = await source('apps/web/src/pages/Transactions.jsx');
  const row = await source('apps/web/src/components/TransactionRow.jsx');
  const admin = await source('apps/web/src/pages/AdminSettings.jsx');

  assert.match(routes, /apiRouter\.put\([\s\S]*'\/transactions\/:id'/);
  assert.match(routes, /TRANSACTION_UPDATE/);
  assert.match(routes, /before: existing/);
  assert.match(routes, /after: updated/);
  assert.match(routes, /apiRouter\.delete\([\s\S]*'\/transactions\/:id'/);
  assert.match(routes, /TRANSACTION_DELETE/);
  assert.match(routes, /evidencePreservedOnGoogleDrive/);
  assert.match(transactions, /TransactionEditPanel/);
  assert.match(transactions, /api\.deleteTransaction/);
  assert.match(row, /onEdit/);
  assert.match(row, /onDelete/);
  assert.match(admin, /AuditTransactionDetails/);
  assert.match(admin, /Lihat snapshot transaksi terhapus/);
});

test('header includes Gregorian and Hijri dates while running text stays TV-readable', async () => {
  const jsx = await source('apps/web/src/pages/PublicDisplay.jsx');
  const css = await source('apps/web/src/styles/public-display.css');
  const prayerService = await source('apps/api/src/prayerService.js');

  assert.match(jsx, /\{masehiDate\} Masehi/);
  assert.match(jsx, /\{weekday\}/);
  assert.match(jsx, /prayerSchedule\?\.hijriDate\?\.formatted/);
  assert.match(jsx, /signage-hijri-date/);
  assert.match(prayerService, /body\.data\.date\?\.hijri/);
  assert.match(prayerService, /islamic-umalqura/);
  assert.match(prayerService, /Rabiul Akhir/);
  assert.match(css, /\.signage-date-block \.signage-hijri-date/);
  assert.match(css, /\.verse-ticker-item strong \{[\s\S]*font-size:\s*clamp\(14px, 1\.18vw, 19px\)/);
  assert.match(css, /\.verse-ticker-label span \{[\s\S]*font-size:\s*clamp\(11px, \.88vw, 14px\)/);
});


test('Friday dashboard starts from today and emits only current-or-future Fridays', async () => {
  const routes = await source('apps/api/src/routes.js');

  assert.match(routes, /const daysUntilFriday = \(5 - weekday \+ 7\) % 7/);
  assert.match(routes, /const firstFriday = addCalendarDays\(from, daysUntilFriday\)/);
  assert.match(routes, /Array\.from\(\{ length: safeCount \}/);
  assert.match(routes, /getUpcomingFridaySchedules\(from, limit\)/);
});

test('adhan phase lasts two minutes and iqamah stays eight minutes after adhan', async () => {
  const helper = await source('apps/web/src/lib/prayerDisplay.js');
  const display = await source('apps/web/src/pages/PublicDisplay.jsx');

  assert.match(helper, /IQAMAH_DELAY_MINUTES = 8/);
  assert.match(helper, /announcementEnds = new Date\(adhan\.getTime\(\) \+ 2 \* 60_000\)/);
  assert.match(helper, /kind: 'ADHAN_NOW'/);
  assert.match(display, /Waktunya Adzan \{countdownFocus\.prayerName\}/);
});
