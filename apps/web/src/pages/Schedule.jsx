import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, MapPin, Plus, Save, Trash2, UserRound, Video } from 'lucide-react';
import { api } from '../lib/api.js';
import { toInputDate } from '../lib/format.js';
import { LoadingState } from '../components/LoadingState.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const prayerNames = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];

function blankPrayer(name) {
  return { prayerName: name, adhanTime: '', iqamahTime: '', imam: '', bilal: '' };
}

function normalizeSchedule(items = []) {
  return prayerNames.map((name) => items.find((item) => item.prayerName === name) ?? blankPrayer(name));
}

const emptyActivity = {
  title: '',
  activityDate: toInputDate(),
  startTime: '',
  location: '',
  speaker: '',
  liveUrl: '',
  isPublished: true
};

export default function Schedule() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [date, setDate] = useState(toInputDate());
  const [schedule, setSchedule] = useState(null);
  const [scheduleSource, setScheduleSource] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activityForm, setActivityForm] = useState(emptyActivity);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  async function load() {
    setSchedule(null);
    setStatus({ type: 'idle', message: '' });

    try {
      const [scheduleData, activityData] = await Promise.all([
        api.prayerSchedule(date),
        api.activities(date)
      ]);
      setSchedule(normalizeSchedule(scheduleData.items));
      setScheduleSource(scheduleData.source ?? null);
      setActivities(activityData.data);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  useEffect(() => {
    load();
  }, [date]);

  function updatePrayer(index, field, value) {
    setSchedule((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  async function saveSchedule() {
    setStatus({ type: 'loading', message: 'Menyimpan jadwal salat...' });
    try {
      const result = await api.updatePrayerSchedule(date, schedule);
      setSchedule(normalizeSchedule(result.items));
      setScheduleSource(result.source ?? scheduleSource);
      setStatus({ type: 'success', message: 'Iqamah, imam, dan bilal berhasil diperbarui.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function createActivity(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'Menyimpan kegiatan...' });
    try {
      await api.createActivity(activityForm);
      setActivityForm({ ...emptyActivity, activityDate: date });
      setStatus({ type: 'success', message: 'Kegiatan berhasil ditambahkan.' });
      await load();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function deleteActivity(id) {
    if (!window.confirm('Hapus kegiatan ini?')) return;
    try {
      await api.deleteActivity(id);
      setActivities((current) => current.filter((item) => item.id !== id));
      setStatus({ type: 'success', message: 'Kegiatan berhasil dihapus.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  const dateLabel = useMemo(() => new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${date}T00:00:00`)), [date]);

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Informasi masjid</p>
          <h1>Jadwal & Kegiatan</h1>
          <p className="page-subtitle">Waktu adzan otomatis dari API publik. Admin mengelola iqamah, imam, bilal, dan agenda masjid.</p>
        </div>
        <label className="compact-date-picker">
          <span>Tanggal</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </header>

      {status.message && <div className={`notice ${status.type}`}>{status.message}</div>}
      {!schedule && status.type !== 'error' && <LoadingState />}

      {schedule && (
        <>
          <section className="panel schedule-editor-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">{dateLabel}</p>
                <h2>Jadwal salat</h2>
                {scheduleSource && (
                  <p className="schedule-source-copy">
                    Adzan: {scheduleSource.calculationMethodName} · {scheduleSource.location?.name}
                    {scheduleSource.status === 'fallback' ? ' · fallback lokal' : ''}
                  </p>
                )}
              </div>
              <Clock3 size={20} className="muted-icon" />
            </div>

            <div className="schedule-editor-list">
              {schedule.map((item, index) => (
                <article className="schedule-editor-row" key={item.prayerName}>
                  <strong>{item.prayerName}</strong>
                  <label className="mini-field"><span>Adzan · API</span><input type="time" value={item.adhanTime} disabled title="Waktu adzan otomatis dari API jadwal salat" /></label>
                  <label className="mini-field"><span>Iqamah</span><input type="time" value={item.iqamahTime ?? ''} disabled={!isAdmin} onChange={(e) => updatePrayer(index, 'iqamahTime', e.target.value)} /></label>
                  <label className="mini-field wide"><span>Imam</span><input value={item.imam ?? ''} disabled={!isAdmin} onChange={(e) => updatePrayer(index, 'imam', e.target.value)} placeholder="Nama imam" /></label>
                  <label className="mini-field wide"><span>Bilal</span><input value={item.bilal ?? ''} disabled={!isAdmin} onChange={(e) => updatePrayer(index, 'bilal', e.target.value)} placeholder="Nama bilal" /></label>
                </article>
              ))}
            </div>

            {isAdmin && (
              <div className="panel-actions">
                <button className="button primary" onClick={saveSchedule}><Save size={17} /> Simpan iqamah & petugas {date}</button>
              </div>
            )}
          </section>

          <div className="schedule-layout">
            <section className="panel">
              <div className="panel-heading"><div><p className="section-kicker">Agenda publik</p><h2>Kegiatan mendatang</h2></div><CalendarDays size={20} className="muted-icon" /></div>
              <div className="event-cards">
                {activities.map((item) => (
                  <article className="event-card" key={item.id}>
                    <div className="date-block large"><strong>{item.activityDate.slice(-2)}</strong><span>{item.activityDate.slice(5, 7)}</span></div>
                    <div className="event-copy">
                      <h3>{item.title}</h3>
                      <p><Clock3 size={15} /> {item.startTime || 'Waktu fleksibel'}</p>
                      {item.speaker && <p><UserRound size={15} /> {item.speaker}</p>}
                      {item.location && <p><MapPin size={15} /> {item.location}</p>}
                      {item.liveUrl && <p><Video size={15} /> Live streaming tersedia</p>}
                    </div>
                    {isAdmin && <button className="icon-button danger-icon-button" onClick={() => deleteActivity(item.id)} aria-label={`Hapus ${item.title}`}><Trash2 size={16} /></button>}
                  </article>
                ))}
                {activities.length === 0 && <div className="empty-state">Belum ada kegiatan mendatang.</div>}
              </div>
            </section>

            {isAdmin && (
              <section className="panel settings-section">
                <div className="panel-heading"><div><p className="section-kicker">Tambah agenda</p><h2>Kegiatan baru</h2></div><Plus size={20} className="muted-icon" /></div>
                <form className="activity-form" onSubmit={createActivity}>
                  <label className="field"><span>Nama kegiatan</span><input value={activityForm.title} onChange={(e) => setActivityForm((current) => ({ ...current, title: e.target.value }))} required placeholder="Kajian Ba'da Maghrib" /></label>
                  <div className="form-grid two-columns">
                    <label className="field"><span>Tanggal</span><input type="date" value={activityForm.activityDate} onChange={(e) => setActivityForm((current) => ({ ...current, activityDate: e.target.value }))} required /></label>
                    <label className="field"><span>Jam mulai</span><input type="time" value={activityForm.startTime} onChange={(e) => setActivityForm((current) => ({ ...current, startTime: e.target.value }))} /></label>
                    <label className="field"><span>Pemateri</span><input value={activityForm.speaker} onChange={(e) => setActivityForm((current) => ({ ...current, speaker: e.target.value }))} /></label>
                    <label className="field"><span>Lokasi</span><input value={activityForm.location} onChange={(e) => setActivityForm((current) => ({ ...current, location: e.target.value }))} /></label>
                    <label className="field full-field"><span>URL live YouTube (opsional)</span><input type="url" value={activityForm.liveUrl} onChange={(e) => setActivityForm((current) => ({ ...current, liveUrl: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." /></label>
                  </div>
                  <label className="checkbox-field"><input type="checkbox" checked={activityForm.isPublished} onChange={(e) => setActivityForm((current) => ({ ...current, isPublished: e.target.checked }))} /><span>Tampilkan kegiatan pada Public Display</span></label>
                  <button className="button primary"><Plus size={17} /> Tambah kegiatan</button>
                </form>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
