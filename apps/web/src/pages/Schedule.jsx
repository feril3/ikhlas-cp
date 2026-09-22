import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserRound,
  Video,
  X
} from 'lucide-react';
import { api } from '../lib/api.js';
import { toInputDate } from '../lib/format.js';
import { getIqamahTime } from '../lib/prayerDisplay.js';
import { LoadingState } from '../components/LoadingState.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const prayerNames = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];

function blankPrayer(name) {
  return { prayerName: name, adhanTime: '', iqamahTime: '', imam: '', bilal: '' };
}

function normalizeSchedule(items = []) {
  return prayerNames.map((name) => items.find((item) => item.prayerName === name) ?? blankPrayer(name));
}

function isFriday(date) {
  return new Date(`${date}T12:00:00+07:00`).getUTCDay() === 5;
}

function newActivity(date = toInputDate()) {
  return {
    title: '',
    activityDate: date,
    startTime: '',
    location: '',
    speaker: '',
    liveUrl: '',
    isPublished: true
  };
}

function activityToForm(activity) {
  return {
    title: activity.title ?? '',
    activityDate: activity.activityDate,
    startTime: activity.startTime ?? '',
    location: activity.location ?? '',
    speaker: activity.speaker ?? '',
    liveUrl: activity.liveUrl ?? '',
    isPublished: Boolean(activity.isPublished)
  };
}

const emptyFriday = { imam: '', khatib: '', bilal: '' };

export default function Schedule() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [date, setDate] = useState(toInputDate());
  const [schedule, setSchedule] = useState(null);
  const [scheduleSource, setScheduleSource] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activityForm, setActivityForm] = useState(() => newActivity());
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [editingActivity, setEditingActivity] = useState(() => newActivity());
  const [fridayForm, setFridayForm] = useState(emptyFriday);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const selectedIsFriday = isFriday(date);

  async function load() {
    setSchedule(null);
    setStatus({ type: 'idle', message: '' });

    try {
      const requests = [
        api.prayerSchedule(date),
        api.activities(date)
      ];
      if (selectedIsFriday) requests.push(api.fridaySchedule(date));

      const [scheduleData, activityData, fridayData] = await Promise.all(requests);
      setSchedule(normalizeSchedule(scheduleData.items));
      setScheduleSource(scheduleData.source ?? null);
      setActivities(activityData.data);
      setFridayForm(fridayData?.schedule
        ? {
            imam: fridayData.schedule.imam ?? '',
            khatib: fridayData.schedule.khatib ?? '',
            bilal: fridayData.schedule.bilal ?? ''
          }
        : emptyFriday);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  useEffect(() => {
    setActivityForm(newActivity(date));
    setEditingActivityId(null);
    load();
  }, [date]);

  function updatePrayer(index, field, value) {
    setSchedule((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  async function saveSchedule() {
    setStatus({ type: 'loading', message: 'Menyimpan petugas salat...' });
    try {
      const normalized = schedule.map((item) => ({
        ...item,
        iqamahTime: getIqamahTime(date, item.adhanTime)
      }));
      const result = await api.updatePrayerSchedule(date, normalized);
      setSchedule(normalizeSchedule(result.items));
      setScheduleSource(result.source ?? scheduleSource);
      setStatus({ type: 'success', message: 'Imam dan bilal berhasil diperbarui.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function saveFridaySchedule(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'Menyimpan jadwal petugas Jumat...' });
    try {
      const result = await api.updateFridaySchedule(date, fridayForm);
      setFridayForm({
        imam: result.schedule.imam,
        khatib: result.schedule.khatib,
        bilal: result.schedule.bilal
      });
      setStatus({ type: 'success', message: 'Jadwal imam, khatib, dan bilal Jumat berhasil disimpan.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function createActivity(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'Menyimpan kegiatan...' });
    try {
      await api.createActivity(activityForm);
      setActivityForm(newActivity(date));
      setStatus({ type: 'success', message: 'Kegiatan berhasil ditambahkan.' });
      await load();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  function startEditActivity(activity) {
    setEditingActivityId(activity.id);
    setEditingActivity(activityToForm(activity));
  }

  function cancelEditActivity() {
    setEditingActivityId(null);
    setEditingActivity(newActivity(date));
  }

  async function saveActivityEdit(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'Menyimpan perubahan agenda...' });
    try {
      await api.updateActivity(editingActivityId, editingActivity);
      setEditingActivityId(null);
      setEditingActivity(newActivity(date));
      setStatus({ type: 'success', message: 'Agenda publik berhasil diperbarui.' });
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
      if (editingActivityId === id) cancelEditActivity();
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
          <p className="page-subtitle">Kelola petugas salat, jadwal Jumat, dan agenda yang ditampilkan untuk jamaah.</p>
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
                    Waktu adzan otomatis · {scheduleSource.location?.name}
                  </p>
                )}
              </div>
              <Clock3 size={20} className="muted-icon" />
            </div>

            <div className="schedule-editor-list">
              {schedule.map((item, index) => (
                <article className="schedule-editor-row" key={item.prayerName}>
                  <strong>{item.prayerName}</strong>
                  <label className="mini-field"><span>Adzan</span><input type="time" value={item.adhanTime} disabled /></label>
                  <label className="mini-field"><span>Iqamah +5m</span><input type="time" value={getIqamahTime(date, item.adhanTime)} disabled /></label>
                  <label className="mini-field wide"><span>Imam</span><input value={item.imam ?? ''} disabled={!isAdmin} onChange={(e) => updatePrayer(index, 'imam', e.target.value)} placeholder="Nama imam" /></label>
                  <label className="mini-field wide"><span>Bilal</span><input value={item.bilal ?? ''} disabled={!isAdmin} onChange={(e) => updatePrayer(index, 'bilal', e.target.value)} placeholder="Nama bilal" /></label>
                </article>
              ))}
            </div>

            {isAdmin && (
              <div className="panel-actions">
                <button className="button primary" onClick={saveSchedule}><Save size={17} /> Simpan petugas salat</button>
              </div>
            )}
          </section>

          {selectedIsFriday && (
            <section className="panel friday-schedule-panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Salat Jumat · {dateLabel}</p>
                  <h2>Petugas Jumat</h2>
                  <p className="schedule-source-copy">Informasi ini muncul sebagai section tambahan pada Public Display khusus hari Jumat.</p>
                </div>
                <UserRound size={20} className="muted-icon" />
              </div>

              <form className="friday-schedule-form" onSubmit={saveFridaySchedule}>
                <label className="field">
                  <span>Imam Jumat</span>
                  <input value={fridayForm.imam} onChange={(event) => setFridayForm((current) => ({ ...current, imam: event.target.value }))} disabled={!isAdmin} required placeholder="Nama imam" />
                </label>
                <label className="field">
                  <span>Khatib</span>
                  <input value={fridayForm.khatib} onChange={(event) => setFridayForm((current) => ({ ...current, khatib: event.target.value }))} disabled={!isAdmin} required placeholder="Nama khatib" />
                </label>
                <label className="field">
                  <span>Bilal</span>
                  <input value={fridayForm.bilal} onChange={(event) => setFridayForm((current) => ({ ...current, bilal: event.target.value }))} disabled={!isAdmin} required placeholder="Nama bilal" />
                </label>
                {isAdmin && <button className="button primary"><Save size={17} /> Simpan jadwal Jumat</button>}
              </form>
            </section>
          )}

          <div className="schedule-layout">
            <section className="panel">
              <div className="panel-heading"><div><p className="section-kicker">Agenda publik</p><h2>Kegiatan mendatang</h2></div><CalendarDays size={20} className="muted-icon" /></div>
              <div className="event-cards">
                {activities.map((item) => (
                  <article className="event-card activity-editable-card" key={item.id}>
                    <div className="date-block large"><strong>{item.activityDate.slice(-2)}</strong><span>{item.activityDate.slice(5, 7)}</span></div>
                    <div className="event-copy">
                      <h3>{item.title}</h3>
                      <p><Clock3 size={15} /> {item.startTime || 'Waktu fleksibel'}</p>
                      {item.speaker && <p><UserRound size={15} /> {item.speaker}</p>}
                      {item.location && <p><MapPin size={15} /> {item.location}</p>}
                      {item.liveUrl && <p><Video size={15} /> Live streaming tersedia</p>}
                      <span className={item.isPublished ? 'publish-state' : 'publish-state unpublished'}>
                        {item.isPublished ? 'Tampil di Public Display' : 'Tidak dipublikasikan'}
                      </span>
                    </div>

                    {isAdmin && (
                      <div className="event-actions">
                        <button className="icon-button" onClick={() => startEditActivity(item)} aria-label={`Edit ${item.title}`}><Pencil size={16} /></button>
                        <button className="icon-button danger-icon-button" onClick={() => deleteActivity(item.id)} aria-label={`Hapus ${item.title}`}><Trash2 size={16} /></button>
                      </div>
                    )}

                    {editingActivityId === item.id && (
                      <form className="activity-edit-form" onSubmit={saveActivityEdit}>
                        <label className="field full-field"><span>Nama kegiatan</span><input value={editingActivity.title} onChange={(e) => setEditingActivity((current) => ({ ...current, title: e.target.value }))} required /></label>
                        <label className="field"><span>Tanggal</span><input type="date" value={editingActivity.activityDate} onChange={(e) => setEditingActivity((current) => ({ ...current, activityDate: e.target.value }))} required /></label>
                        <label className="field"><span>Jam mulai</span><input type="time" value={editingActivity.startTime} onChange={(e) => setEditingActivity((current) => ({ ...current, startTime: e.target.value }))} /></label>
                        <label className="field"><span>Pemateri</span><input value={editingActivity.speaker} onChange={(e) => setEditingActivity((current) => ({ ...current, speaker: e.target.value }))} /></label>
                        <label className="field"><span>Lokasi</span><input value={editingActivity.location} onChange={(e) => setEditingActivity((current) => ({ ...current, location: e.target.value }))} /></label>
                        <label className="field full-field"><span>URL live YouTube</span><input type="url" value={editingActivity.liveUrl} onChange={(e) => setEditingActivity((current) => ({ ...current, liveUrl: e.target.value }))} /></label>
                        <label className="checkbox-field full-field"><input type="checkbox" checked={editingActivity.isPublished} onChange={(e) => setEditingActivity((current) => ({ ...current, isPublished: e.target.checked }))} /><span>Tampilkan pada Public Display</span></label>
                        <div className="inline-actions full-field">
                          <button className="button primary"><Save size={16} /> Simpan perubahan</button>
                          <button type="button" className="button ghost" onClick={cancelEditActivity}><X size={16} /> Batal</button>
                        </div>
                      </form>
                    )}
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
