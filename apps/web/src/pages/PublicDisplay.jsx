import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  MapPin,
  PlayCircle,
  ReceiptText,
  WalletCards
} from 'lucide-react';
import { api } from '../lib/api.js';
import { formatDate, formatRupiah } from '../lib/format.js';
import {
  formatCountdown,
  getIqamahTime,
  getPrayerDisplayState
} from '../lib/prayerDisplay.js';

const FINANCE_CAROUSEL_INTERVAL_MS = 8500;
const DISPLAY_TIMEZONE = 'Asia/Jakarta';
const RECENT_TRANSACTION_LIMIT = 4;

function displayDateIso(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function toYouTubeEmbed(url) {
  if (!url) return '';

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    let id = '';

    if (host === 'youtu.be') {
      id = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (host.endsWith('youtube.com')) {
      if (parsed.pathname === '/watch') {
        id = parsed.searchParams.get('v') ?? '';
      } else {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts[0] === 'live' || parts[0] === 'embed') id = parts[1] ?? '';
      }

      if (!id && parsed.pathname === '/embed/live_stream' && parsed.searchParams.get('channel')) {
        return `https://www.youtube-nocookie.com/embed/live_stream?channel=${encodeURIComponent(parsed.searchParams.get('channel'))}&autoplay=1&mute=1&controls=1&rel=0`;
      }
    }

    return id
      ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=1&rel=0`
      : '';
  } catch {
    return '';
  }
}

function IslamicStar({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 8 92 50 50 92 8 50Z" />
      <path d="M20 20H80V80H20Z" />
      <circle cx="50" cy="50" r="8" />
    </svg>
  );
}

function MosqueSeal() {
  return (
    <svg className="signage-mosque-seal" viewBox="0 0 120 120" aria-hidden="true">
      <path className="seal-ring" d="M60 7a53 53 0 1 1 0 106A53 53 0 0 1 60 7Z" />
      <path className="seal-dome" d="M31 72h58v15H31zM38 70v-7c0-15 8-26 22-33 14 7 22 18 22 33v7" />
      <path className="seal-finial" d="M60 20v10m-5-7h10" />
      <path className="seal-door" d="M52 87V72h16v15" />
      <path className="seal-minaret" d="M25 81V48h10v33m50 0V48h10v33M23 48h14l-7-9-7 9Zm60 0h14l-7-9-7 9Z" />
    </svg>
  );
}

function FinanceCarousel({ data, index }) {
  const transactions = data?.recentTransactions?.slice(0, RECENT_TRANSACTION_LIMIT) ?? [];
  const settings = data?.settings ?? {};
  const slides = [
    {
      id: 'transactions',
      content: (
        <div className="finance-slide finance-transactions">
          <div className="finance-slide-title"><ReceiptText size={18} /><span>Transaksi Terbaru</span></div>
          <div className="finance-transaction-list">
            {transactions.map((transaction) => {
              const income = transaction.type === 'INCOME';
              const Icon = income ? ArrowDownLeft : ArrowUpRight;
              return (
                <div className="finance-transaction-row" key={transaction.id}>
                  <span className={income ? 'finance-flow-icon income' : 'finance-flow-icon expense'}>
                    <Icon size={15} />
                  </span>
                  <div>
                    <strong>{transaction.category}</strong>
                    <span>{formatDate(transaction.transactionDate)}</span>
                  </div>
                  <b className={income ? 'finance-income' : 'finance-expense'}>
                    {income ? '+' : '-'}{formatRupiah(transaction.amount)}
                  </b>
                </div>
              );
            })}
            {transactions.length === 0 && <span className="finance-empty">Belum ada transaksi.</span>}
          </div>
        </div>
      )
    },
    {
      id: 'donation',
      content: (
        <div className="finance-slide finance-donation">
          <div className="finance-slide-title"><Landmark size={18} /><span>Rekening Donasi</span></div>
          <div className="finance-donation-copy">
            <span>Infaq & Donasi</span>
            <b>{settings.bankName || 'Bank'}</b>
            <small>Nomor rekening</small>
            <strong>{settings.bankAccountNumber || '-'}</strong>
            <p>{settings.bankAccountHolder ? `a.n. ${settings.bankAccountHolder}` : ''}</p>
          </div>
        </div>
      )
    }
  ];

  const active = slides[index % slides.length];
  return (
    <>
      <div className="finance-carousel-window" key={active.id}>{active.content}</div>
      <div className="finance-carousel-dots" aria-hidden="true">
        {slides.map((slide, slideIndex) => (
          <span className={slideIndex === index % slides.length ? 'active' : ''} key={slide.id} />
        ))}
      </div>
    </>
  );
}

export default function PublicDisplay() {
  const [now, setNow] = useState(new Date());
  const [data, setData] = useState(null);
  const [financeSlideIndex, setFinanceSlideIndex] = useState(0);

  async function load() {
    try {
      setData(await api.publicDisplay(displayDateIso()));
    } catch {
      // Pertahankan payload terakhir agar TV tidak kosong saat jaringan putus sementara.
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

  useEffect(() => {
    const timer = setInterval(() => {
      setFinanceSlideIndex((current) => (current + 1) % 2);
    }, FINANCE_CAROUSEL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const settings = data?.settings ?? {
    mosqueName: 'Masjid Al-Ikhlas',
    bankName: 'Bank Syariah Indonesia',
    bankAccountNumber: '-',
    bankAccountHolder: '',
    defaultYoutubeUrl: '',
    activeLiveUrl: '',
    activeLiveTitle: ''
  };

  const activityWithLive = data?.activities?.find((item) => item.liveUrl);
  const liveSource = settings.activeLiveUrl || activityWithLive?.liveUrl || settings.defaultYoutubeUrl;
  const liveEmbed = toYouTubeEmbed(liveSource);
  const liveTitle = settings.activeLiveTitle || activityWithLive?.title || 'Siaran Masjid';

  const prayerDisplay = useMemo(
    () => getPrayerDisplayState(data?.prayerSchedule, data?.nextDayPrayerSchedule, now),
    [data?.prayerSchedule, data?.nextDayPrayerSchedule, now]
  );
  const nextAdhan = prayerDisplay.nextAdhan;
  const activeIqamah = prayerDisplay.activeIqamah;
  const prayers = data?.prayerSchedule?.items ?? [];

  const tickerMessages = useMemo(
    () => (data?.messages ?? []).filter((message) => message.kind === 'VERSE'),
    [data?.messages]
  );
  const tickerItems = tickerMessages.length ? [...tickerMessages, ...tickerMessages] : [];
  const tickerDuration = `${Math.max(60, tickerMessages.length * 20)}s`;

  const location = data?.prayerSchedule?.source?.location ?? {
    name: 'RS Elizabeth Situbondo',
    address: 'Patokan · Situbondo · Jawa Timur'
  };

  const time = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: DISPLAY_TIMEZONE
  }).format(now).replaceAll('.', ':');

  const date = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: DISPLAY_TIMEZONE
  }).format(now);

  return (
    <div className="public-display media-signage-shell">
      <div className="signage-pattern-layer" aria-hidden="true" />

      <header className="media-signage-header">
        <div className="signage-brand">
          <span className="signage-brand-mark"><MosqueSeal /></span>
          <strong>{settings.mosqueName.toUpperCase()}</strong>
        </div>

        <div className="signage-location">
          <MapPin size={16} />
          <div>
            <strong>{location.name}</strong>
            <span>Patokan · Situbondo · Jawa Timur</span>
          </div>
        </div>

        <time>{date}</time>
      </header>

      <main className="media-signage-main">
        <section className="prayer-focus-panel" aria-label="Waktu dan adzan berikutnya">
          <IslamicStar className="prayer-focus-star" />
          <div className="prayer-focus-clock">
            <span>Waktu sekarang</span>
            <time>{time}</time>
          </div>

          <div className="prayer-focus-next">
            <span>{nextAdhan?.label ?? 'Adzan berikutnya'}</span>
            <h1>{nextAdhan?.prayerName ?? '--'}</h1>
            <strong className="prayer-focus-adhan">{nextAdhan?.adhanTime ?? '--:--'}</strong>
            <div className="prayer-focus-countdown">
              <span>Menuju adzan</span>
              <b>{nextAdhan ? formatCountdown(nextAdhan.target - now) : '--:--:--'}</b>
            </div>
          </div>

          {activeIqamah && (
            <div className="prayer-focus-iqamah">
              <span>Iqamah {activeIqamah.prayerName}</span>
              <strong>{formatCountdown(activeIqamah.target - now)}</strong>
            </div>
          )}

        </section>

        <section className="youtube-stage" aria-label="Siaran video masjid">
          <div className="youtube-frame">
            {liveEmbed ? (
              <iframe
                src={liveEmbed}
                title={liveTitle}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="youtube-empty">
                <PlayCircle size={68} strokeWidth={1.2} />
                <strong>Siaran video belum tersedia</strong>
              </div>
            )}
          </div>
        </section>

        <aside className="finance-rail" aria-label="Keuangan masjid">
          <div className="finance-rail-heading">
            <WalletCards size={18} />
            <span>Keuangan Masjid</span>
            <small>Bulan ini</small>
          </div>

          <div className="finance-balance">
            <span>Saldo saat ini</span>
            <strong>{formatRupiah(data?.finance?.currentBalance ?? 0)}</strong>
          </div>

          <div className="finance-flow-summary">
            <div>
              <span>Kas masuk</span>
              <strong className="finance-income">+{formatRupiah(data?.finance?.totalIncome ?? 0)}</strong>
            </div>
            <div>
              <span>Kas keluar</span>
              <strong className="finance-expense">-{formatRupiah(data?.finance?.totalExpense ?? 0)}</strong>
            </div>
          </div>

          <div className="finance-carousel">
            <FinanceCarousel data={data} index={financeSlideIndex} />
          </div>
        </aside>
      </main>

      <section className="media-prayer-strip" aria-label="Jadwal salat hari ini">
        <div className="media-prayer-frieze" aria-hidden="true" />
        {prayers.map((prayer) => {
          const isNext = nextAdhan?.today && nextAdhan?.prayerName === prayer.prayerName;
          return (
            <article className={isNext ? 'media-prayer active' : 'media-prayer'} key={prayer.prayerName}>
              {isNext && <em>Berikutnya</em>}
              <span>{prayer.prayerName}</span>
              <strong>{prayer.adhanTime}</strong>
              <small>Iqamah {getIqamahTime(data?.prayerSchedule?.scheduleDate, prayer.adhanTime) || '--:--'}</small>
            </article>
          );
        })}
      </section>

      <footer className="verse-ticker" aria-label="Ayat dan hadits">
        <div className="verse-ticker-label">
          <IslamicStar />
          <span>Ayat & Hadits</span>
        </div>
        <div className="verse-ticker-viewport">
          <div className="verse-ticker-track" style={{ '--ticker-duration': tickerDuration }}>
            {tickerItems.length ? tickerItems.map((message, index) => (
              <div className="verse-ticker-item" key={`${message.id}-${index}`}>
                <strong>{message.content}</strong>
                {message.source && <span>{message.source}</span>}
                <i aria-hidden="true">◆</i>
              </div>
            )) : (
              <div className="verse-ticker-item verse-ticker-empty">
                <strong>Selamat datang di masjid.</strong>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
