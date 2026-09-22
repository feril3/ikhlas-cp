import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Landmark,
  MapPin,
  Megaphone,
  Radio,
  ReceiptText,
  WalletCards
} from 'lucide-react';
import { api } from '../lib/api.js';
import { formatDate, formatRupiah } from '../lib/format.js';

const CAROUSEL_INTERVAL_MS = 9000;
const MESSAGE_INTERVAL_MS = 12000;
const TRANSACTION_LIMIT = 4;
const DISPLAY_TIMEZONE = 'Asia/Jakarta';

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

function makePrayerDateTime(date, time) {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}:00+07:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function getPrayerState(todaySchedule, nextDaySchedule, now) {
  const todayItems = todaySchedule?.items ?? [];
  const tomorrowItems = nextDaySchedule?.items ?? [];

  for (const prayer of todayItems) {
    const iqamah = makePrayerDateTime(todaySchedule?.scheduleDate, prayer.iqamahTime);
    if (!iqamah) continue;
    const diff = iqamah - now;
    if (diff > 0 && diff <= 5 * 60_000) {
      return {
        kind: 'iqamah',
        label: `Menuju iqamah ${prayer.prayerName}`,
        prayerName: prayer.prayerName,
        target: iqamah,
        adhanTime: prayer.adhanTime,
        iqamahTime: prayer.iqamahTime,
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
    label: next.today ? 'Salat berikutnya' : 'Salat berikutnya · besok',
    prayerName: next.prayer.prayerName,
    target: next.target,
    adhanTime: next.prayer.adhanTime,
    iqamahTime: next.prayer.iqamahTime,
    date: next.date,
    today: next.today
  };
}

function formatCountdown(milliseconds) {
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

function MihrabFrame() {
  return (
    <svg className="signage-mihrab-frame" viewBox="0 0 500 650" preserveAspectRatio="none" aria-hidden="true">
      <path className="mihrab-line mihrab-line-outer" d="M38 625V255Q38 112 250 24Q462 112 462 255V625" />
      <path className="mihrab-line mihrab-line-middle" d="M58 625V266Q58 132 250 48Q442 132 442 266V625" />
      <path className="mihrab-line mihrab-line-inner" d="M78 625V278Q78 153 250 76Q422 153 422 278V625" />
      <path className="mihrab-base" d="M28 625H472M52 606H448" />
      <path className="mihrab-column" d="M64 328V605M436 328V605" />
      <path className="mihrab-capital" d="M52 328H77M423 328H448" />
      <path className="mihrab-diamond" d="m250 16 11 20-11 20-11-20 11-20Z" />
    </svg>
  );
}

function CornerOrnament({ position }) {
  return (
    <svg className={`signage-corner-ornament ${position}`} viewBox="0 0 140 140" aria-hidden="true">
      <path d="M9 129V69C9 36 36 9 69 9h60" />
      <path d="M20 129V73c0-29 24-53 53-53h56" />
      <path d="M35 129V79c0-24 20-44 44-44h50" />
      <path d="M10 93c20 0 36-16 36-36M10 111c30 0 55-25 55-55" />
      <path d="m76 18 7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2 7-15Z" />
    </svg>
  );
}

function GeometricDivider() {
  return (
    <div className="signage-geometric-divider" aria-hidden="true">
      <span />
      <IslamicStar />
      <span />
    </div>
  );
}

function buildSlides({ data, liveEmbed, liveTitle }) {
  if (!data) return [];

  const slides = [];
  const activities = data.activities ?? [];
  const transactions = data.recentTransactions ?? [];
  const messages = data.messages ?? [];

  if (liveEmbed) {
    slides.push({
      id: 'live',
      kind: 'live',
      eyebrow: 'Live Masjid',
      title: liveTitle,
      icon: Radio,
      liveEmbed
    });
  }

  if (activities.length) {
    slides.push({
      id: 'activities',
      kind: 'activities',
      eyebrow: 'Agenda Jamaah',
      title: 'Kegiatan Masjid',
      icon: CalendarDays,
      activities: activities.slice(0, 3)
    });
  }

  slides.push({
    id: 'finance',
    kind: 'finance',
    eyebrow: 'Amanah yang Terlihat',
    title: 'Transparansi Keuangan',
    icon: WalletCards,
    finance: data.finance
  });

  if (transactions.length) {
    slides.push({
      id: 'transactions',
      kind: 'transactions',
      eyebrow: 'Aktivitas Kas',
      title: 'Transaksi Terbaru',
      icon: ReceiptText,
      transactions: transactions.slice(0, TRANSACTION_LIMIT)
    });
  }

  if (messages.length) {
    slides.push({
      id: 'announcement',
      kind: 'announcement',
      eyebrow: 'Informasi Jamaah',
      title: messages[0].title || 'Pengumuman Masjid',
      icon: Megaphone,
      message: messages[0]
    });
  }

  slides.push({
    id: 'donation',
    kind: 'donation',
    eyebrow: 'Salurkan Infaq & Donasi',
    title: 'Rekening Masjid',
    icon: Landmark,
    settings: data.settings
  });

  return slides;
}

function CarouselSlide({ slide }) {
  const Icon = slide.icon;

  return (
    <article className={`signage-slide signage-slide-${slide.kind}`}>
      <header className="signage-slide-header">
        <span className="signage-slide-icon"><Icon size={21} strokeWidth={1.7} /></span>
        <div>
          <span>{slide.eyebrow}</span>
          <h2>{slide.title}</h2>
        </div>
        <IslamicStar className="signage-slide-star" />
      </header>

      <GeometricDivider />

      <div className="signage-slide-body">
        {slide.kind === 'live' && (
          <div className="signage-live">
            <iframe
              src={slide.liveEmbed}
              title={slide.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {slide.kind === 'activities' && (
          <div className="signage-activity-list">
            {slide.activities.map((activity) => (
              <div className="signage-activity" key={activity.id}>
                <div className="signage-activity-date">
                  <strong>{activity.activityDate.slice(-2)}</strong>
                  <span>{new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(`${activity.activityDate}T00:00:00`))}</span>
                </div>
                <div>
                  <strong>{activity.title}</strong>
                  <span>
                    {activity.startTime || 'Waktu fleksibel'}
                    {activity.speaker ? ` · ${activity.speaker}` : ''}
                  </span>
                  {activity.location && <small><MapPin size={13} /> {activity.location}</small>}
                </div>
              </div>
            ))}
          </div>
        )}

        {slide.kind === 'finance' && (
          <div className="signage-finance">
            <div className="signage-balance">
              <span>Saldo kas saat ini</span>
              <strong>{formatRupiah(slide.finance?.currentBalance ?? 0)}</strong>
            </div>
            <div className="signage-finance-flow">
              <div>
                <span>Kas masuk bulan ini</span>
                <strong className="signage-income">+{formatRupiah(slide.finance?.totalIncome ?? 0)}</strong>
              </div>
              <div>
                <span>Kas keluar bulan ini</span>
                <strong className="signage-expense">-{formatRupiah(slide.finance?.totalExpense ?? 0)}</strong>
              </div>
            </div>
          </div>
        )}

        {slide.kind === 'transactions' && (
          <div className="signage-transaction-list">
            {slide.transactions.map((transaction) => {
              const income = transaction.type === 'INCOME';
              const IconTransaction = income ? ArrowDownLeft : ArrowUpRight;
              return (
                <div className="signage-transaction" key={transaction.id}>
                  <span className={`signage-transaction-icon ${income ? 'income' : 'expense'}`}>
                    <IconTransaction size={18} />
                  </span>
                  <div>
                    <strong>{transaction.category}</strong>
                    <span>{formatDate(transaction.transactionDate)}</span>
                  </div>
                  <b className={income ? 'signage-income' : 'signage-expense'}>
                    {income ? '+' : '-'}{formatRupiah(transaction.amount)}
                  </b>
                </div>
              );
            })}
          </div>
        )}

        {slide.kind === 'announcement' && (
          <div className="signage-announcement">
            <IslamicStar className="signage-announcement-star" />
            <blockquote>{slide.message.content}</blockquote>
            {slide.message.source && <span>{slide.message.source}</span>}
          </div>
        )}

        {slide.kind === 'donation' && (
          <div className="signage-donation">
            <div className="signage-donation-emblem" aria-hidden="true">
              <IslamicStar className="signage-donation-star" />
              <Landmark size={52} strokeWidth={1.25} />
            </div>

            <div className="signage-donation-content">
              <span className="signage-donation-lead">Rekening resmi masjid</span>
              <strong className="signage-donation-number">{slide.settings.bankAccountNumber || '-'}</strong>

              <div className="signage-donation-meta">
                <div>
                  <span>Bank</span>
                  <b>{slide.settings.bankName || 'Belum diatur'}</b>
                </div>
                <div>
                  <span>Atas nama</span>
                  <b>{slide.settings.bankAccountHolder || '-'}</b>
                </div>
              </div>

              <p>Salurkan infaq dan donasi melalui rekening resmi masjid.</p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default function PublicDisplay() {
  const [now, setNow] = useState(new Date());
  const [data, setData] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  async function load() {
    try {
      setData(await api.publicDisplay(displayDateIso()));
    } catch {
      // Pertahankan last-known-good payload di TV ketika jaringan sementara putus.
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

  const settings = data?.settings ?? {
    mosqueName: 'Masjid Al-Ikhlas',
    mosqueTagline: 'Pusat Informasi Jamaah',
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
  const liveTitle = settings.activeLiveTitle || activityWithLive?.title || 'Live Masjid';

  const slides = useMemo(
    () => buildSlides({ data, liveEmbed, liveTitle }),
    [data, liveEmbed, liveTitle]
  );

  useEffect(() => {
    setSlideIndex(0);
    if (slides.length <= 1) return undefined;

    const timer = setInterval(() => {
      setSlideIndex((current) => (current + 1) % slides.length);
    }, CAROUSEL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [slides.length]);

  const messages = data?.messages ?? [];
  useEffect(() => {
    setMessageIndex(0);
    if (messages.length <= 1) return undefined;

    const timer = setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, MESSAGE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [messages.length]);

  const prayers = data?.prayerSchedule?.items ?? [];
  const prayerState = useMemo(
    () => getPrayerState(data?.prayerSchedule, data?.nextDayPrayerSchedule, now),
    [data?.prayerSchedule, data?.nextDayPrayerSchedule, now]
  );

  const activeSlide = slides[slideIndex] ?? slides[0];
  const activeMessage = messages[messageIndex] ?? null;
  const location = data?.prayerSchedule?.source?.location ?? {
    name: 'RS Elizabeth Situbondo',
    address: 'Jl. WR. Supratman No.2, Situbondo, Jawa Timur'
  };
  const locationSummary = 'Patokan · Situbondo · Jawa Timur';

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
    <div className="public-display signage-shell">
      <div className="signage-pattern-layer" aria-hidden="true" />
      <div className="signage-light-layer" aria-hidden="true" />

      <header className="signage-header">
        <div className="signage-brand">
          <span className="signage-brand-mark"><MosqueSeal /></span>
          <div>
            <strong>{settings.mosqueName.toUpperCase()}</strong>
            <span>{settings.mosqueTagline}</span>
          </div>
        </div>

        <div className="signage-header-center" aria-hidden="true">
          <span />
          <IslamicStar />
          <span />
        </div>

        <div className="signage-location">
          <MapPin size={17} />
          <div>
            <strong>{location.name}</strong>
            <span title={location.address}>{locationSummary}</span>
          </div>
        </div>

        <div className="signage-date">{date}</div>
      </header>

      <main className="signage-main">
        <section className="signage-primary" aria-label="Waktu dan salat berikutnya">
          <div className="signage-primary-ornament" aria-hidden="true"><MihrabFrame /></div>
          <IslamicStar className="signage-primary-star" />

          <div className="signage-clock">
            <span>Waktu sekarang</span>
            <time>{time}</time>
          </div>

          <div className="signage-next-prayer">
            <span>{prayerState?.label ?? 'Jadwal salat'}</span>
            <h1>{prayerState?.prayerName ?? 'Memuat...'}</h1>
            <div className="signage-next-meta">
              <div>
                <span>Adzan</span>
                <strong>{prayerState?.adhanTime ?? '--:--'}</strong>
              </div>
              <div>
                <span>{prayerState?.kind === 'iqamah' ? 'Iqamah' : 'Menuju adzan'}</span>
                <strong>{prayerState ? formatCountdown(prayerState.target - now) : '--:--:--'}</strong>
              </div>
            </div>
          </div>

          <div className="signage-prayer-source">
            <span>{data?.prayerSchedule?.source?.calculationMethodName || 'Kementerian Agama Republik Indonesia'}</span>
            <small>
              {data?.prayerSchedule?.source?.status === 'fallback'
                ? 'Fallback jadwal lokal'
                : 'Jadwal otomatis · cache aman saat koneksi putus'}
            </small>
          </div>
        </section>

        <section className="signage-carousel" aria-label="Informasi masjid bergantian">
          <CornerOrnament position="top-left" />
          <CornerOrnament position="top-right" />
          <CornerOrnament position="bottom-left" />
          <CornerOrnament position="bottom-right" />

          <div className="signage-carousel-inner">
            {activeSlide && <CarouselSlide key={activeSlide.id} slide={activeSlide} />}
          </div>

          <div className="signage-carousel-progress" aria-hidden="true">
            <b>{String(slideIndex + 1).padStart(2, '0')}</b>
            <div className="signage-carousel-dots">
              {slides.map((slide, index) => (
                <span
                  key={slide.id}
                  className={index === slideIndex ? 'active' : ''}
                />
              ))}
            </div>
            <b>{String(slides.length).padStart(2, '0')}</b>
          </div>
        </section>
      </main>

      <section className="signage-prayer-strip" aria-label="Lima waktu salat">
        <div className="signage-prayer-frieze" aria-hidden="true" />
        {prayers.map((prayer) => {
          const isNext = prayerState?.today && prayerState?.prayerName === prayer.prayerName;
          return (
            <article className={isNext ? 'signage-prayer active' : 'signage-prayer'} key={prayer.prayerName}>
              {isNext && <em className="signage-prayer-next">Berikutnya</em>}
              <IslamicStar className="signage-prayer-star" />
              <span>{prayer.prayerName}</span>
              <strong>{prayer.adhanTime}</strong>
              <small>Iqamah {prayer.iqamahTime || 'belum diatur'}</small>
            </article>
          );
        })}
      </section>

      <footer className="signage-footer">
        <div className="signage-footer-ornament" aria-hidden="true"><IslamicStar /></div>
        <div className="signage-ticker">
          <span className="signage-ticker-label">
            {activeMessage
              ? activeMessage.kind === 'VERSE'
                ? 'Ayat / Hadits'
                : activeMessage.kind === 'ANNOUNCEMENT'
                  ? 'Pengumuman'
                  : 'Pesan Masjid'
              : 'Informasi'}
          </span>
          <div>
            <strong>{activeMessage?.title || activeMessage?.content || 'Selamat datang di masjid.'}</strong>
            {activeMessage?.title && <span>{activeMessage.content}</span>}
            {activeMessage?.source && <small>{activeMessage.source}</small>}
          </div>
        </div>

        <div className="signage-footer-donation">
          <Landmark size={15} />
          <span>{settings.bankName || 'Donasi'} · {settings.bankAccountNumber || '-'}</span>
        </div>
      </footer>
    </div>
  );
}
