import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, MapPin, UserRound } from 'lucide-react';
import { api } from '../lib/api.js';
import { LoadingState } from '../components/LoadingState.jsx';

export default function Schedule() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.dashboard().then(setData).catch((err) => setError(err.message)); }, []);

  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Informasi masjid</p><h1>Jadwal & Kegiatan</h1><p className="page-subtitle">Baseline untuk jadwal salat, imam, bilal, dan agenda masjid.</p></div></header>
      {error && <div className="notice error">{error}</div>}
      {!data && !error && <LoadingState />}
      {data && <div className="schedule-layout">
        <section className="panel">
          <div className="panel-heading"><div><p className="section-kicker">21 September 2026</p><h2>Jadwal salat</h2></div><Clock3 size={20} className="muted-icon" /></div>
          <div className="schedule-table">
            {data.prayerSchedule.map((item) => <div className="schedule-row" key={item.prayerName}><div><strong>{item.prayerName}</strong><span>Imam: {item.imam}</span><span>Bilal: {item.bilal}</span></div><div className="time-stack"><strong>{item.adhanTime}</strong><span>Iqamah {item.iqamahTime}</span></div></div>)}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><p className="section-kicker">Agenda</p><h2>Kegiatan mendatang</h2></div><CalendarDays size={20} className="muted-icon" /></div>
          <div className="event-cards">
            {data.activities.map((item) => <article className="event-card" key={item.id}><div className="date-block large"><strong>{item.activityDate.slice(-2)}</strong><span>SEP</span></div><div><h3>{item.title}</h3><p><Clock3 size={15} /> {item.startTime}</p><p><UserRound size={15} /> {item.speaker}</p><p><MapPin size={15} /> {item.location}</p></div></article>)}
          </div>
        </section>
      </div>}
    </div>
  );
}
