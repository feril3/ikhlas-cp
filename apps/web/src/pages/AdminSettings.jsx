import { useEffect, useState } from 'react';
import { Activity, Landmark, Save, ShieldCheck, UserPlus, Users, Youtube } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/format.js';
import { LoadingState } from '../components/LoadingState.jsx';

const emptyUser = {
  name: '',
  email: '',
  password: '',
  role: 'TREASURER'
};

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [newUser, setNewUser] = useState(emptyUser);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  async function load() {
    try {
      const [settingsData, usersData, auditData] = await Promise.all([
        api.settings(),
        api.users(),
        api.auditLogs(60)
      ]);
      setSettings(settingsData);
      setUsers(usersData.data);
      setLogs(auditData.data);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'Menyimpan pengaturan...' });
    try {
      const saved = await api.updateSettings(settings);
      setSettings(saved);
      setStatus({ type: 'success', message: 'Pengaturan masjid berhasil disimpan.' });
      await load();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function createUser(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'Membuat akun...' });
    try {
      await api.createUser(newUser);
      setNewUser(emptyUser);
      setStatus({ type: 'success', message: 'Akun pengguna berhasil dibuat.' });
      await load();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  if (!settings && status.type !== 'error') return <LoadingState label="Memuat pengaturan..." />;

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Administrasi</p>
          <h1>Pengaturan Sistem</h1>
          <p className="page-subtitle">Identitas publik, rekening donasi, Live Masjid, pengguna, dan jejak audit.</p>
        </div>
      </header>

      {status.message && <div className={`notice ${status.type === 'error' ? 'error' : status.type === 'success' ? 'success' : ''}`}>{status.message}</div>}

      {settings && (
        <section className="panel settings-section">
          <div className="panel-heading">
            <div><p className="section-kicker">Public Display</p><h2>Identitas & informasi publik</h2></div>
            <Landmark size={20} className="muted-icon" />
          </div>
          <form className="settings-form" onSubmit={saveSettings}>
            <div className="form-grid settings-grid">
              <label className="field"><span>Nama masjid</span><input value={settings.mosqueName} onChange={(e) => setSettings((current) => ({ ...current, mosqueName: e.target.value }))} required /></label>
              <label className="field"><span>Tagline</span><input value={settings.mosqueTagline} onChange={(e) => setSettings((current) => ({ ...current, mosqueTagline: e.target.value }))} /></label>
              <label className="field"><span>Nama bank</span><input value={settings.bankName} onChange={(e) => setSettings((current) => ({ ...current, bankName: e.target.value }))} /></label>
              <label className="field"><span>Nomor rekening donasi</span><input inputMode="numeric" value={settings.bankAccountNumber} onChange={(e) => setSettings((current) => ({ ...current, bankAccountNumber: e.target.value }))} /></label>
              <label className="field full-field"><span>Nama pemilik rekening</span><input value={settings.bankAccountHolder} onChange={(e) => setSettings((current) => ({ ...current, bankAccountHolder: e.target.value }))} /></label>
            </div>

            <div className="settings-subsection">
              <div className="settings-subheading"><Youtube size={18} /><div><strong>Live Masjid</strong><span>Gunakan URL YouTube watch, youtu.be, embed, atau live stream channel.</span></div></div>
              <div className="form-grid settings-grid">
                <label className="field full-field"><span>Streaming default</span><input type="url" value={settings.defaultYoutubeUrl} onChange={(e) => setSettings((current) => ({ ...current, defaultYoutubeUrl: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." /></label>
                <label className="field"><span>Judul live aktif</span><input value={settings.activeLiveTitle} onChange={(e) => setSettings((current) => ({ ...current, activeLiveTitle: e.target.value }))} placeholder="Kajian Ba'da Maghrib" /></label>
                <label className="field"><span>URL live aktif</span><input type="url" value={settings.activeLiveUrl} onChange={(e) => setSettings((current) => ({ ...current, activeLiveUrl: e.target.value }))} placeholder="Kosongkan jika tidak ada live" /></label>
              </div>
            </div>

            <div className="inline-actions"><button className="button primary"><Save size={17} /> Simpan pengaturan</button></div>
          </form>
        </section>
      )}

      <section className="admin-two-column">
        <div className="panel settings-section">
          <div className="panel-heading">
            <div><p className="section-kicker">Hak akses</p><h2>Pengguna</h2></div>
            <Users size={20} className="muted-icon" />
          </div>
          <div className="user-list">
            {users.map((user) => (
              <div className="user-row" key={user.id}>
                <span className="avatar small">{user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                <div><strong>{user.name}</strong><span>{user.email}</span></div>
                <span className="role-chip">{user.role === 'ADMIN' ? 'Admin' : 'Bendahara'}</span>
              </div>
            ))}
          </div>

          <form className="create-user-form" onSubmit={createUser}>
            <div className="settings-subheading"><UserPlus size={18} /><div><strong>Tambah pengguna</strong><span>Password minimal 10 karakter.</span></div></div>
            <div className="form-grid">
              <label className="field"><span>Nama</span><input value={newUser.name} onChange={(e) => setNewUser((current) => ({ ...current, name: e.target.value }))} required /></label>
              <label className="field"><span>Email</span><input type="email" value={newUser.email} onChange={(e) => setNewUser((current) => ({ ...current, email: e.target.value }))} required /></label>
              <label className="field"><span>Role</span><select value={newUser.role} onChange={(e) => setNewUser((current) => ({ ...current, role: e.target.value }))}><option value="TREASURER">Bendahara</option><option value="ADMIN">Admin / Pengurus</option></select></label>
              <label className="field"><span>Password awal</span><input type="password" minLength="10" value={newUser.password} onChange={(e) => setNewUser((current) => ({ ...current, password: e.target.value }))} required /></label>
            </div>
            <button className="button secondary"><UserPlus size={17} /> Tambah akun</button>
          </form>
        </div>

        <div className="panel settings-section">
          <div className="panel-heading">
            <div><p className="section-kicker">Akuntabilitas</p><h2>Audit log</h2></div>
            <ShieldCheck size={20} className="muted-icon" />
          </div>
          <div className="audit-list">
            {logs.map((log) => (
              <div className="audit-row" key={log.id}>
                <span className="audit-icon"><Activity size={15} /></span>
                <div>
                  <strong>{log.action.replaceAll('_', ' ')}</strong>
                  <span>{log.userName ?? 'Sistem / anonim'} · {log.entityType}{log.entityId ? ` #${log.entityId}` : ''}</span>
                </div>
                <time>{new Date(log.createdAt.replace(' ', 'T') + 'Z').toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</time>
              </div>
            ))}
            {logs.length === 0 && <div className="empty-state">Belum ada audit log.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
