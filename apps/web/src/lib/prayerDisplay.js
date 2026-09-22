export const IQAMAH_DELAY_MINUTES = 5;

export function makePrayerDateTime(date, time) {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}:00+07:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function getIqamahDateTime(date, adhanTime) {
  const adhan = makePrayerDateTime(date, adhanTime);
  if (!adhan) return null;
  return new Date(adhan.getTime() + IQAMAH_DELAY_MINUTES * 60_000);
}

export function getIqamahTime(date, adhanTime) {
  const iqamah = getIqamahDateTime(date, adhanTime);
  if (!iqamah) return '';

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  }).format(iqamah).replace('.', ':');
}

export function getPrayerState(todaySchedule, nextDaySchedule, now) {
  const todayItems = todaySchedule?.items ?? [];
  const tomorrowItems = nextDaySchedule?.items ?? [];

  for (const prayer of todayItems) {
    const adhan = makePrayerDateTime(todaySchedule?.scheduleDate, prayer.adhanTime);
    const iqamah = getIqamahDateTime(todaySchedule?.scheduleDate, prayer.adhanTime);
    if (!adhan || !iqamah) continue;

    if (now >= adhan && now < iqamah) {
      return {
        kind: 'iqamah',
        label: `Menuju iqamah ${prayer.prayerName}`,
        prayerName: prayer.prayerName,
        target: iqamah,
        adhanTime: prayer.adhanTime,
        iqamahTime: getIqamahTime(todaySchedule.scheduleDate, prayer.adhanTime),
        date: todaySchedule.scheduleDate,
        today: true
      };
    }
  }

  const candidates = [
    ...todayItems.map((prayer) => ({
      prayer,
      date: todaySchedule?.scheduleDate,
      today: true
    })),
    ...tomorrowItems.map((prayer) => ({
      prayer,
      date: nextDaySchedule?.scheduleDate,
      today: false
    }))
  ]
    .map((entry) => ({
      ...entry,
      target: makePrayerDateTime(entry.date, entry.prayer.adhanTime)
    }))
    .filter((entry) => entry.target && entry.target > now)
    .sort((a, b) => a.target - b.target);

  const next = candidates[0];
  if (!next) return null;

  return {
    kind: 'adhan',
    label: next.today ? 'Salat berikutnya' : 'Salat berikutnya besok',
    prayerName: next.prayer.prayerName,
    target: next.target,
    adhanTime: next.prayer.adhanTime,
    iqamahTime: getIqamahTime(next.date, next.prayer.adhanTime),
    date: next.date,
    today: next.today
  };
}

export function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ].join(':');
}
