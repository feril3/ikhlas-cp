import { db } from './db.js';

export const PRAYER_LOCATION = Object.freeze({
  name: 'RS Elizabeth Situbondo',
  address: 'Jl. WR. Supratman No.2, Mulyautama, Patokan, Kec. Situbondo, Kabupaten Situbondo, Jawa Timur 68312',
  latitude: -7.7074,
  longitude: 113.9969,
  timezone: 'Asia/Jakarta',
  calculationMethod: 20,
  calculationMethodName: 'Kementerian Agama Republik Indonesia'
});

const PRAYER_MAP = Object.freeze([
  ['Subuh', 'Fajr'],
  ['Dzuhur', 'Dhuhr'],
  ['Ashar', 'Asr'],
  ['Maghrib', 'Maghrib'],
  ['Isya', 'Isha']
]);

function cleanPrayerTime(value) {
  const match = String(value ?? '').match(/(\d{1,2}:\d{2})/);
  if (!match) return '';
  const [hour, minute] = match[1].split(':');
  return `${String(Number(hour)).padStart(2, '0')}:${minute}`;
}

export function normalizeProviderTimings(timings = {}) {
  return PRAYER_MAP.map(([prayerName, providerKey]) => ({
    prayerName,
    adhanTime: cleanPrayerTime(timings[providerKey])
  })).filter((item) => item.adhanTime);
}

function readLocalMetadata(date) {
  let sourceDate = date;
  let rows = db.prepare(`
    SELECT
      prayer_name AS prayerName,
      adhan_time AS adhanTime,
      iqamah_time AS iqamahTime,
      imam,
      bilal
    FROM prayer_schedules
    WHERE prayer_date = ?
  `).all(date);

  if (rows.length === 0) {
    sourceDate = db.prepare(`
      SELECT MAX(prayer_date) AS date
      FROM prayer_schedules
      WHERE prayer_date <= ?
    `).get(date)?.date ?? null;

    rows = sourceDate
      ? db.prepare(`
          SELECT
            prayer_name AS prayerName,
            adhan_time AS adhanTime,
            iqamah_time AS iqamahTime,
            imam,
            bilal
          FROM prayer_schedules
          WHERE prayer_date = ?
        `).all(sourceDate)
      : [];
  }

  return {
    sourceDate,
    byPrayer: new Map(rows.map((row) => [row.prayerName, row])),
    rows
  };
}

function readCachedSchedule(date) {
  const row = db.prepare(`
    SELECT
      provider,
      payload_json AS payloadJson,
      fetched_at AS fetchedAt
    FROM prayer_time_cache
    WHERE prayer_date = ?
  `).get(date);

  if (!row) return null;

  try {
    const payload = JSON.parse(row.payloadJson);
    const items = normalizeProviderTimings(payload.timings);
    if (items.length !== PRAYER_MAP.length) return null;

    return {
      items,
      provider: row.provider,
      fetchedAt: row.fetchedAt
    };
  } catch {
    return null;
  }
}

function writeCachedSchedule(date, providerPayload) {
  db.prepare(`
    INSERT INTO prayer_time_cache
      (prayer_date, provider, latitude, longitude, calculation_method, timezone, payload_json, fetched_at)
    VALUES (?, 'aladhan', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(prayer_date) DO UPDATE SET
      provider = excluded.provider,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      calculation_method = excluded.calculation_method,
      timezone = excluded.timezone,
      payload_json = excluded.payload_json,
      fetched_at = CURRENT_TIMESTAMP
  `).run(
    date,
    PRAYER_LOCATION.latitude,
    PRAYER_LOCATION.longitude,
    PRAYER_LOCATION.calculationMethod,
    PRAYER_LOCATION.timezone,
    JSON.stringify(providerPayload)
  );
}

function formatProviderDate(date) {
  const [year, month, day] = date.split('-');
  return `${day}-${month}-${year}`;
}

async function fetchProviderSchedule(date) {
  const providerDate = formatProviderDate(date);
  const params = new URLSearchParams({
    latitude: String(PRAYER_LOCATION.latitude),
    longitude: String(PRAYER_LOCATION.longitude),
    method: String(PRAYER_LOCATION.calculationMethod),
    school: '0',
    timezonestring: PRAYER_LOCATION.timezone
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(
      `https://api.aladhan.com/v1/timings/${providerDate}?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'IKHLAS-Masjid/1.0'
        },
        signal: controller.signal
      }
    );

    if (!response.ok) {
      throw new Error(`Prayer API HTTP ${response.status}`);
    }

    const body = await response.json();
    if (body?.code !== 200 || !body?.data?.timings) {
      throw new Error('Prayer API response tidak valid.');
    }

    const items = normalizeProviderTimings(body.data.timings);
    if (items.length !== PRAYER_MAP.length) {
      throw new Error('Prayer API tidak mengembalikan lima waktu salat utama.');
    }

    writeCachedSchedule(date, {
      timings: body.data.timings,
      meta: body.data.meta ?? null,
      date: body.data.date ?? null
    });

    return {
      items,
      provider: 'aladhan',
      fetchedAt: new Date().toISOString()
    };
  } finally {
    clearTimeout(timeout);
  }
}

function mergeLocalMetadata(items, local) {
  return items.map((item) => {
    const metadata = local.byPrayer.get(item.prayerName);
    return {
      ...item,
      iqamahTime: metadata?.iqamahTime ?? '',
      imam: metadata?.imam ?? '',
      bilal: metadata?.bilal ?? ''
    };
  });
}

function fallbackSchedule(date, local, error) {
  const ordered = PRAYER_MAP.map(([prayerName]) => local.byPrayer.get(prayerName))
    .filter(Boolean)
    .map((item) => ({
      prayerName: item.prayerName,
      adhanTime: item.adhanTime,
      iqamahTime: item.iqamahTime ?? '',
      imam: item.imam ?? '',
      bilal: item.bilal ?? ''
    }));

  return {
    scheduleDate: date,
    localMetadataDate: local.sourceDate,
    items: ordered,
    source: {
      provider: 'local-fallback',
      providerLabel: 'Jadwal lokal (fallback)',
      calculationMethod: PRAYER_LOCATION.calculationMethod,
      calculationMethodName: PRAYER_LOCATION.calculationMethodName,
      status: 'fallback',
      fetchedAt: null,
      error: error ? String(error.message ?? error) : null,
      location: PRAYER_LOCATION
    }
  };
}

export async function getPrayerSchedule(date, { forceRefresh = false } = {}) {
  const local = readLocalMetadata(date);

  if (!forceRefresh) {
    const cached = readCachedSchedule(date);
    if (cached) {
      return {
        scheduleDate: date,
        localMetadataDate: local.sourceDate,
        items: mergeLocalMetadata(cached.items, local),
        source: {
          provider: 'aladhan',
          providerLabel: 'AlAdhan API',
          calculationMethod: PRAYER_LOCATION.calculationMethod,
          calculationMethodName: PRAYER_LOCATION.calculationMethodName,
          status: 'cache',
          fetchedAt: cached.fetchedAt,
          location: PRAYER_LOCATION
        }
      };
    }
  }

  try {
    const remote = await fetchProviderSchedule(date);
    return {
      scheduleDate: date,
      localMetadataDate: local.sourceDate,
      items: mergeLocalMetadata(remote.items, local),
      source: {
        provider: remote.provider,
        providerLabel: 'AlAdhan API',
        calculationMethod: PRAYER_LOCATION.calculationMethod,
        calculationMethodName: PRAYER_LOCATION.calculationMethodName,
        status: 'live',
        fetchedAt: remote.fetchedAt,
        location: PRAYER_LOCATION
      }
    };
  } catch (error) {
    const cached = readCachedSchedule(date);
    if (cached) {
      return {
        scheduleDate: date,
        localMetadataDate: local.sourceDate,
        items: mergeLocalMetadata(cached.items, local),
        source: {
          provider: 'aladhan',
          providerLabel: 'AlAdhan API',
          calculationMethod: PRAYER_LOCATION.calculationMethod,
          calculationMethodName: PRAYER_LOCATION.calculationMethodName,
          status: 'stale-cache',
          fetchedAt: cached.fetchedAt,
          error: String(error.message ?? error),
          location: PRAYER_LOCATION
        }
      };
    }

    return fallbackSchedule(date, local, error);
  }
}

export function addDays(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
