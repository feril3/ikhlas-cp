import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Landmark,
  Radio,
  ReceiptText,
  Wifi
} from 'lucide-react';
import { api } from '../lib/api.js';
import { formatDate, formatRupiah, toInputDate } from '../lib/format.js';

const TRANSACTION_PAGE_SIZE = 4;

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

function rotatingWindow(items, offset, size) {
  if (!items.length) return [];
  if (items.length <= size) return items;

  return Array.from({ length: size }, (_, index) => items[(offset + index) % items.length]);
}

export default function PublicDisplay() {
  const [now, setNow] = useState(new Date());
  const [data, setData] = useState(null);
  const [transactionOffset, setTransactionOffset] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  async function load() {
    try {
      setData(await api.publicDisplay(toInputDate()));
    } catch {
      // Pertahankan data terakhir ketika koneksi TV sempat putus.
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

  const transactions = data?.recentTransactions ?? [];
  const messages = data?.messages ?? [];

  useEffect(() => {
    setTransactionOffset(0);
    if (transactions.length <= TRANSACTION_PAGE_SIZE) return undefined;

    const timer = setInterval(() => {
      setTransactionOffset((current) => (current + TRANSACTION_PAGE_SIZE) % transactions.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [transactions.length]);

  useEffect(() => {
    setMessageIndex(0);
    if (messages.length <= 1) return undefined;

    const timer = setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, 12000);

    return () => clearInterval(timer);
  }, [messages.length]);

  const prayers = data?.prayerSchedule?.items ?? [];
  const countdown = useMemo(() => getCountdown(prayers, now), [prayers, now]);
  const visibleTransactions = useMemo(
    () => rotatingWindow(transactions, transactionOffset, TRANSACTION_PAGE_SIZE),
    [transactions, transactionOffset]
  );
  const activeMessage = messages[messageIndex] ?? null;

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

        <section className="display-transactions-card">
          <div className="display-section-title">
            <ReceiptText size={22} />
            <span>Transaksi Terbaru</span>
            {transactions.length > TRANSACTION_PAGE_SIZE && (
              <small>berganti otomatis</small>
            )}
          </div>

          <div className="display-transaction-grid">
            {visibleTransactions.map((transaction) => {
              const income = transaction.type === 'INCOME';
              const Icon = income ? ArrowDownLeft : ArrowUpRight;
              return (
                <article className="display-transaction-row" key={transaction.id}>
                  <span className={`display-transaction-icon ${income ? 'income' : 'expense'}`}><Icon size={19} /></span>
                  <div>
                    <strong>{transaction.category}</strong>
                    <span>{formatDate(transaction.transactionDate)}</span>
                  </div>
                  <b className={income ? 'public-income' : 'public-expense'}>
                    {income ? '+' : '-'}{formatRupiah(transaction.amount)}
                  </b>
                </article>
              );
            })}
            {visibleTransactions.length === 0 && (
              <div className="display-empty">Belum ada transaksi yang dipublikasikan.</div>
            )}
          </div>
        </section>
      </main>

      <footer className="display-footer display-footer-rotating">
        <div className="display-message">
          {activeMessage ? (
            <>
              <span className="display-message-kind">
                {activeMessage.kind === 'VERSE' ? 'Ayat / Hadits' : activeMessage.kind === 'ANNOUNCEMENT' ? 'Pengumuman' : 'Pesan Masjid'}
              </span>
              <strong>{activeMessage.title || activeMessage.content}</strong>
              {activeMessage.title && <span>{activeMessage.content}</span>}
              {activeMessage.source && <small>{activeMessage.source}</small>}
            </>
          ) : (
            <>
              <span className="display-message-kind">Donasi</span>
              <strong>{settings.bankName || 'Bank belum diatur'} · {settings.bankAccountNumber || '-'}</strong>
              {settings.bankAccountHolder && <span>a.n. {settings.bankAccountHolder}</span>}
            </>
          )}
        </div>

        <div className="display-footer-side">
          <span>Donasi · {settings.bankName || '-'} · {settings.bankAccountNumber || '-'}</span>
          <a href="/" target="_blank" rel="noreferrer">Dashboard Admin <ExternalLink size={15} /></a>
        </div>
      </footer>
    </div>
  );
}
