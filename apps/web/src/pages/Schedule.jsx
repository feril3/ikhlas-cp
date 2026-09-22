import { useEffect, useState } from 'react';
import {
  CalendarDays,
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
import { LoadingState } from '../components/LoadingState.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

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

function formatFridayDate(date) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${date}T12:00:00+07:00`));
}

export default function Schedule() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const today = toInputDate();

  const [fridays, setFridays] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activityForm, setActivityForm] = useState(() => newActivity(today));
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [editingActivity, setEditingActivity] = useState(() => newActivity(today));
  const [savingFridayDate, setSavingFridayDate] = useState('');
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  async function load() {
    setStatus({ type: 'idle', message: '' });
    try {
      const [fridayData, activityData] = await Promise.all([
        api.fridaySchedules(today, 8),
        api.activities(today)
      ]);
      setFridays(fridayData.data);
      setActivities(activityData.data);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateFriday(scheduleDate, field, value) {
    setFridays((current) => current.map((item) => (
      item.scheduleDate === scheduleDate ? { ...item, [field]: value } : item
    )));
  }

  async function saveFriday(row) {
    setSavingFridayDate(row.scheduleDate);
    setStatus({ type: 'loading', message: `Menyimpan petugas Jumat ${formatFridayDate(row.scheduleDate)}...` });
    try {
      const result = await api.updateFridaySchedule(row.scheduleDate, {
        imam: row.imam,
        khatib: row.khatib,
        bilal: row.bilal
      });
      setFridays((current) => current.map((item) => (
        item.scheduleDate === row.scheduleDate ? result.schedule : item
      )));
      setStatus({ type: 'success', message: 'Jadwal petugas Jumat berhasil disimpan.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSavingFridayDate('');
    }
  }

  async function createActivity(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'Menyimpan kegiatan...' });
    try {
      await api.createActivity(activityForm);
      setActivityForm(newActivity(today));
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
    setEditingActivity(newActivity(today));
  }

  async function saveActivityEdit(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'Menyimpan perubahan agenda...' });
    try {
      await api.updateActivity(editingActivityId, editingActivity);
      setEditingActivityId(null);
      setEditingActivity(newActivity(today));
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

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Informasi masjid</p>
          <h1>Jadwal Jumat & Agenda</h1>
          <p className="page-subtitle">Kelola petugas Jumat mendatang dan agenda publik. Waktu salat harian tetap otomatis dari provider jadwal salat.</p>
        </div>
      </header>

      {status.message && <div className={`notice ${status.type}`}>{status.message}</div>}

      <section className="panel friday-upcoming-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Jumat mendatang</p>
            <h2>Imam, Khatib & Bilal</h2>
            <p className="schedule-source-copy">Hanya tanggal Jumat yang belum lewat yang ditampilkan. Jadwal lama tetap tersimpan sebagai riwayat.</p>
          </div>
          <UserRound size={20} className="muted-icon" />
        </div>

        {!fridays && status.type !== 'error' && <LoadingState />}

        {fridays && (
          <div className="friday-upcoming-list">
            {fridays.map((row) => {
              const complete = row.imam.trim() && row.khatib.trim() && row.bilal.trim();
              return (
                <article className="friday-upcoming-row" key={row.scheduleDate}>
                  <div className="friday-date-cell">
                    <strong>{formatFridayDate(row.scheduleDate)}</strong>
                    <span>{row.updatedAt ? 'Sudah diisi' : 'Belum diisi'}</span>
                  </div>

                  <label className="mini-field">
                    <span>Imam</span>
                    <input
                      value={row.imam}
                      disabled={!isAdmin}
                      onChange={(event) => updateFriday(row.scheduleDate, 'imam', event.target.value)}
                      placeholder="Nama imam"
                    />
                  </label>

                  <label className="mini-field">
                    <span>Khatib</span>
                    <input
                      value={row.khatib}
                      disabled={!isAdmin}
                      onChange={(event) => updateFriday(row.scheduleDate, 'khatib', event.target.value)}
                      placeholder="Nama khatib"
                    />
                  </label>

                  <label className="mini-field">
                    <span>Bilal</span>
                    <input
                      value={row.bilal}
                      disabled={!isAdmin}
                      onChange={(event) => updateFriday(row.scheduleDate, 'bilal', event.target.value)}
                      placeholder="Nama bilal"
                    />
                  </label>

                  {isAdmin && (
                    <button
                      type="button"
                      className="button primary friday-save-button"
                      disabled={!complete || savingFridayDate === row.scheduleDate}
                      onClick={() => saveFriday(row)}
                    >
                      <Save size={16} />
                      {savingFridayDate === row.scheduleDate ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="schedule-layout">
        <section className="panel">
          <div className="panel-heading">
            <div><p className="section-kicker">Agenda publik</p><h2>Kegiatan mendatang</h2></div>
            <CalendarDays size={20} className="muted-icon" />
          </div>
          <div className="event-cards">
            {activities.map((item) => (
              <article className="event-card activity-editable-card" key={item.id}>
                <div className="date-block large"><strong>{item.activityDate.slice(-2)}</strong><span>{item.activityDate.slice(5, 7)}</span></div>
                <div className="event-copy">
                  <h3>{item.title}</h3>
                  <p>{item.startTime || 'Waktu fleksibel'}</p>
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
                    <label className="field"><span>Tanggal</span><input type="date" min={today} value={editingActivity.activityDate} onChange={(e) => setEditingActivity((current) => ({ ...current, activityDate: e.target.value }))} required /></label>
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
                <label className="field"><span>Tanggal</span><input type="date" min={today} value={activityForm.activityDate} onChange={(e) => setActivityForm((current) => ({ ...current, activityDate: e.target.value }))} required /></label>
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
    </div>
  );
}
