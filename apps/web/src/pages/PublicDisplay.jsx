import { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, Clock3, ExternalLink, Landmark, Radio, Wifi } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatRupiah, toInputDate } from '../lib/format.js';

function toYouTubeEmbed(url) {
  if (!url) return '';

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1` : '';
    }

    if (host.endsWith('youtube.com')) {
      if (parsed.pathname === '/watch') {
        const id = parsed.searchParams.get('v');
        return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1` : '';
      }

      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0] === 'live' && parts[1]) {
        return `https://www.youtube-nocookie.com/embed/${parts[1]}?autoplay=1&mute=1`;
      }
      if (parts[0] === 'embed' && parts[1]) {
        return `https://www.youtube-nocookie.com/embed/${parts[1]}?autoplay=1&mute=1`;
      }

      if (parsed.pathname === '/embed/live_stream' && parsed.searchParams.get('channel')) {
        return `https://www.youtube-nocookie.com/embed/live_stream?channel=${encodeURIComponent(parsed.searchParams.get('channel'))}&autoplay=1&mute=1`;
      }
    }
  } catch {
    return '';
  }

  return '';
}

function getCountdown(prayers, now) {
  if (!prayers.length) return null;
  const date = toInputDate(now);
  const makeTarget = (time, dayOffset = 0) => {
    const target = new Date(`${date}T${time}:00`);
    if (dayOffset) target.setDate(target.getDate() + dayOffset);
    return target;
  };

  for (const prayer of prayers) {
    if (!prayer.iqamahTime) continue;
    const iqamah = makeTarget(prayer.iqamahTime);
    const diff = iqamah - now;
    if (diff > 0 && diff <= 5 * 60_000) {
      return { label: `Menuju Iqamah ${prayer.prayerName}`, target: iqamah, urgent: true };
    }
  }

  for (const prayer of prayers) {
    const adhan = makeTarget(prayer.adhanTime);
    const diff = adhan - now;
    if (diff > 0 && diff <= 5 * 60_000) {
      return { label: `Menuju Adzan ${prayer.prayerName}`, target: adhan, urgent: true };
    }
  }

  const nextToday = prayers.find((prayer) => makeTarget(prayer.adhanTime) > now);
  const prayer = nextToday ?? prayers[0];
  const target = nextToday ? makeTarget(prayer.adhanTime) : makeTarget(prayer.adhanTime, 1);
  return { label: `Salat berikutnya · ${prayer.prayerName}`, target, urgent: false, prayer };
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function PublicDisplay() {
  const [now, setNow] = useState(new Date());
  const [data, setData] = useState(null);

  async function load() {
    try {
      setData(await api.publicDisplay(toInputDate()));
    } catch {
      // Keep the last successful public display data on transient network errors.
    }
  }

  useEffect(() => {
    load();
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    const refreshTimer = setInterval(load, 60_000);
    return () => {
      clearInterval(clockTimer);
      clearInterval(refreshTimer);
    };
  }, []);

  const prayers = data?.prayerSchedule?.items ?? [];
  const countdown = useMemo(() => getCountdown(prayers, now), [prayers, now]);
  const time = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now).replaceAll('.', ':');
  const date = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(now);

  const settings = data?.settings ?? {
    mosqueName: 'Masjid Al-Ikhlas',
    mosqueTagline: 'Pusat Informasi Jamaah',
    bankName: 'Bank Syariah Indonesia',
    bankAccountNumber: '-',
    bankAccountHolder: 'Masjid Al-Ikhlas',
    defaultYoutubeUrl: '',
    activeLiveUrl: '',
    activeLiveTitle: ''
  };

  const currentBalance = data?.finance?.currentBalance ?? 0;
  const activity = data?.activities?.[0];
  const liveSource = settings.activeLiveUrl || activity?.liveUrl || settings.defaultYoutubeUrl;
  const liveEmbed = toYouTubeEmbed(liveSource);
  const liveTitle = settings.activeLiveTitle || activity?.title || 'Live Masjid';

  return (
    <div className="public-display">
      <header className="display-header">
        <div className="display-brand">
          <span className="display-mark"><CircleDollarSign size={29} /></span>
          <div><strong>{settings.mosqueName.toUpperCase()}</strong><span>{settings.mosqueTagline}</span></div>
        </div>
        <div className="display-status"><Wifi size={18} /><span>Data diperbarui otomatis</span></div>
      </header>

      <main className="display-grid">
        <section className="display-clock-card">
          <p>{date}</p>
          <time>{time}</time>

          {countdown && (
            <div className={`next-prayer ${countdown.urgent ? 'urgent' : ''}`}>
              <span>{countdown.label}</span>
              <strong>{formatCountdown(countdown.target - now)}</strong>
              {countdown.prayer && <b>{countdown.prayer.adhanTime}</b>}
            </div>
          )}
        </section>

        <section className="display-prayer-card">
          <div className="display-section-title"><Clock3 size={22} /><span>Jadwal Salat</span></div>
          <div className="display-prayers">
            {prayers.map((item) => (
              <div key={item.prayerName}>
                <span>{item.prayerName}</span>
                <strong>{item.adhanTime}</strong>
                <small>Iqamah {item.iqamahTime || '-'}</small>
              </div>
            ))}
          </div>
          {data?.prayerSchedule?.scheduleDate && <p className="display-source-note">Jadwal acuan: {data.prayerSchedule.scheduleDate}</p>}
        </section>

        <section className="display-activity-card">
          <div className="display-section-title"><Radio size={22} /><span>{liveEmbed ? 'Live Masjid' : 'Kegiatan Masjid'}</span></div>
          {liveEmbed ? (
            <div className="live-frame-wrap">
              <iframe
                src={liveEmbed}
                title={liveTitle}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
              <strong>{liveTitle}</strong>
            </div>
          ) : (
            <>
              <div className="display-activity-copy">
                <span>Agenda terdekat</span>
                <h2>{activity?.title ?? 'Belum ada kegiatan terjadwal'}</h2>
                <p>{activity ? `${activity.startTime || 'Waktu fleksibel'}${activity.speaker ? ` · ${activity.speaker}` : ''}` : 'Informasi kegiatan akan muncul di sini.'}</p>
              </div>
              <div className="live-strip"><span className="live-dot" /> Streaming default dapat diatur dari dashboard Admin</div>
            </>
          )}
        </section>

        <section className="display-finance-card">
          <div className="display-section-title"><Landmark size={22} /><span>Transparansi Keuangan</span></div>
          <span>Saldo kas saat ini</span>
          <strong>{formatRupiah(currentBalance)}</strong>
          <div className="display-finance-mini">
            <span>Masuk bulan ini <b>+{formatRupiah(data?.finance?.totalIncome ?? 0)}</b></span>
            <span>Keluar bulan ini <b>-{formatRupiah(data?.finance?.totalExpense ?? 0)}</b></span>
          </div>
        </section>
      </main>

      <footer className="display-footer">
        <span>
          Donasi · {settings.bankName || 'Bank belum diatur'} · {settings.bankAccountNumber || '-'}
          {settings.bankAccountHolder ? ` · a.n. ${settings.bankAccountHolder}` : ''}
        </span>
        <a href="/" target="_blank" rel="noreferrer">Dashboard Admin <ExternalLink size={15} /></a>
      </footer>
    </div>
  );
}
