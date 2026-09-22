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

export function getActiveIqamah(todaySchedule, now) {
  const items = todaySchedule?.items ?? [];

  for (const prayer of items) {
    const adhan = makePrayerDateTime(todaySchedule?.scheduleDate, prayer.adhanTime);
    const iqamah = getIqamahDateTime(todaySchedule?.scheduleDate, prayer.adhanTime);
    if (!adhan || !iqamah) continue;

    if (now >= adhan && now < iqamah) {
      return {
        prayerName: prayer.prayerName,
        adhanTime: prayer.adhanTime,
        iqamahTime: getIqamahTime(todaySchedule.scheduleDate, prayer.adhanTime),
        target: iqamah
      };
    }
  }

  return null;
}

export function getNextAdhan(todaySchedule, nextDaySchedule, now) {
  const candidates = [
    ...(todaySchedule?.items ?? []).map((prayer) => ({
      prayer,
      date: todaySchedule?.scheduleDate,
      today: true
    })),
    ...(nextDaySchedule?.items ?? []).map((prayer) => ({
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
    label: next.today ? 'Adzan berikutnya' : 'Adzan berikutnya besok',
    prayerName: next.prayer.prayerName,
    adhanTime: next.prayer.adhanTime,
    iqamahTime: getIqamahTime(next.date, next.prayer.adhanTime),
    target: next.target,
    date: next.date,
    today: next.today
  };
}

export function getPrayerDisplayState(todaySchedule, nextDaySchedule, now) {
  return {
    nextAdhan: getNextAdhan(todaySchedule, nextDaySchedule, now),
    activeIqamah: getActiveIqamah(todaySchedule, now)
  };
}

export function getCountdownFocus(todaySchedule, nextDaySchedule, now) {
  const state = getPrayerDisplayState(todaySchedule, nextDaySchedule, now);

  if (state.activeIqamah) {
    return {
      kind: 'IQAMAH',
      prayerName: state.activeIqamah.prayerName,
      target: state.activeIqamah.target
    };
  }

  if (state.nextAdhan) {
    const remaining = state.nextAdhan.target - now;
    if (remaining > 0 && remaining <= 5 * 60_000) {
      return {
        kind: 'ADHAN',
        prayerName: state.nextAdhan.prayerName,
        target: state.nextAdhan.target
      };
    }
  }

  return null;
}

// Compatibility helper for non-display consumers that only need the next adhan.
export function getPrayerState(todaySchedule, nextDaySchedule, now) {
  return getNextAdhan(todaySchedule, nextDaySchedule, now);
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


export function formatMinuteSecondCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return [
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ].join(':');
}
