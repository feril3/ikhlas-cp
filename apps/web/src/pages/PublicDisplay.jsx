import { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, Clock3, ExternalLink, Landmark, Radio, Wifi } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatRupiah } from '../lib/format.js';

const fallbackPrayers = [
  { prayerName: 'Subuh', adhanTime: '04:28' },
  { prayerName: 'Dzuhur', adhanTime: '11:51' },
  { prayerName: 'Ashar', adhanTime: '15:05' },
  { prayerName: 'Maghrib', adhanTime: '17:53' },
  { prayerName: 'Isya', adhanTime: '19:01' }
];

export default function PublicDisplay() {
  const [now, setNow] = useState(new Date());
  const [data, setData] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    api.dashboard().then(setData).catch(() => {});
    return () => clearInterval(timer);
  }, []);

  const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now).replaceAll('.', ':');
  const date = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  const prayers = data?.prayerSchedule ?? fallbackPrayers;
  const currentBalance = data?.summary.currentBalance ?? 15075000;
  const activity = data?.activities?.[0];
  const nextPrayer = useMemo(() => prayers.find((item) => item.prayerName === 'Maghrib') ?? prayers[0], [prayers]);

  return (
    <div className="public-display">
      <header className="display-header">
        <div className="display-brand"><span className="display-mark"><CircleDollarSign size={29} /></span><div><strong>MASJID AL-IKHLAS</strong><span>Pusat Informasi Jamaah</span></div></div>
        <div className="display-status"><Wifi size={18} /><span>Terhubung</span></div>
      </header>

      <main className="display-grid">
        <section className="display-clock-card">
          <p>{date}</p>
          <time>{time}</time>
          <div className="next-prayer"><span>Salat berikutnya</span><strong>{nextPrayer.prayerName}</strong><b>{nextPrayer.adhanTime}</b></div>
        </section>

        <section className="display-prayer-card">
          <div className="display-section-title"><Clock3 size={22} /><span>Jadwal Salat</span></div>
          <div className="display-prayers">{prayers.map((item) => <div key={item.prayerName}><span>{item.prayerName}</span><strong>{item.adhanTime}</strong></div>)}</div>
        </section>

        <section className="display-activity-card">
          <div className="display-section-title"><Radio size={22} /><span>Kegiatan Masjid</span></div>
          <div className="display-activity-copy"><span>Agenda terdekat</span><h2>{activity?.title ?? "Kajian Ba'da Maghrib"}</h2><p>{activity ? `${activity.startTime} · ${activity.speaker}` : '18:15 · Ust. Hakim Pratama'}</p></div>
          <div className="live-strip"><span className="live-dot" /> Live Masjid siap ditampilkan saat kajian berlangsung</div>
        </section>

        <section className="display-finance-card">
          <div className="display-section-title"><Landmark size={22} /><span>Transparansi Keuangan</span></div>
          <span>Saldo kas saat ini</span>
          <strong>{formatRupiah(currentBalance)}</strong>
          <p>Ringkasan diperbarui dari transaksi yang telah dicatat pengurus.</p>
        </section>
      </main>

      <footer className="display-footer"><span>Informasi donasi · Bank Syariah Indonesia · 7123 4567 890 a.n. Masjid Al-Ikhlas</span><a href="/" target="_blank" rel="noreferrer">Dashboard Admin <ExternalLink size={15} /></a></footer>
    </div>
  );
}
