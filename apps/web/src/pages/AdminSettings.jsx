import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpenText,
  CircleDollarSign,
  Landmark,
  Megaphone,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Tag,
  Trash2,
  UserPlus,
  Users,
  X,
  Youtube
} from 'lucide-react';
import { api } from '../lib/api.js';
import { formatRupiah } from '../lib/format.js';
import { LoadingState } from '../components/LoadingState.jsx';

const emptyUser = {
  name: '',
  email: '',
  password: '',
  role: 'TREASURER'
};

const emptyCategory = {
  type: 'INCOME',
  name: '',
  sortOrder: 50,
  isActive: true
};

const emptyMessage = {
  kind: 'ANNOUNCEMENT',
  title: '',
  content: '',
  source: '',
  sortOrder: 50,
  isActive: true
};

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newUser, setNewUser] = useState(emptyUser);
  const [newCategory, setNewCategory] = useState(emptyCategory);
  const [newMessage, setNewMessage] = useState({ ...emptyMessage, kind: 'VERSE' });
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessage, setEditingMessage] = useState(emptyMessage);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  async function load() {
    try {
      const [settingsData, usersData, auditData, categoryData, messageData] = await Promise.all([
        api.settings(),
        api.users(),
        api.auditLogs(60),
        api.transactionCategories(),
        api.publicMessages()
      ]);
      setSettings(settingsData);
      setUsers(usersData.data);
      setLogs(auditData.data);
      setCategories(categoryData.data);
      setMessages(messageData.data);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  useEffect(() => {
    load();
  }, []);

  const incomeCategories = useMemo(
    () => categories.filter((item) => item.type === 'INCOME'),
    [categories]
  );
  const expenseCategories = useMemo(
    () => categories.filter((item) => item.type === 'EXPENSE'),
    [categories]
  );

  async function saveSettings(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'Menyimpan pengaturan...' });
    try {
      const saved = await api.updateSettings({
        ...settings,
        openingBalance: Number(settings.openingBalance || 0)
      });
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

  async function createCategory(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'Menambah kategori...' });
    try {
      await api.createTransactionCategory({
        ...newCategory,
        sortOrder: Number(newCategory.sortOrder || 0)
      });
      setNewCategory((current) => ({ ...emptyCategory, type: current.type }));
      setStatus({ type: 'success', message: 'Kategori transaksi berhasil ditambahkan.' });
      await load();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function toggleCategory(category) {
    try {
      await api.updateTransactionCategory(category.id, {
        type: category.type,
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: !category.isActive
      });
      await load();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function createMessage(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'Menambah konten Public Display...' });
    try {
      await api.createPublicMessage({
        ...newMessage,
        sortOrder: Number(newMessage.sortOrder || 0)
      });
      setNewMessage({ ...emptyMessage, kind: 'VERSE' });
      setStatus({ type: 'success', message: 'Running text berhasil ditambahkan.' });
      await load();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  function startEditMessage(message) {
    setEditingMessageId(message.id);
    setEditingMessage({
      kind: message.kind,
      title: message.title ?? '',
      content: message.content,
      source: message.source ?? '',
      sortOrder: message.sortOrder,
      isActive: message.isActive
    });
  }

  function cancelEditMessage() {
    setEditingMessageId(null);
    setEditingMessage(emptyMessage);
  }

  async function saveEditedMessage(event) {
    event.preventDefault();
    try {
      await api.updatePublicMessage(editingMessageId, {
        ...editingMessage,
        sortOrder: Number(editingMessage.sortOrder || 0)
      });
      setEditingMessageId(null);
      setEditingMessage(emptyMessage);
      setStatus({ type: 'success', message: 'Running text berhasil diperbarui.' });
      await load();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function toggleMessage(message) {
    try {
      await api.updatePublicMessage(message.id, {
        kind: message.kind,
        title: message.title ?? '',
        content: message.content,
        source: message.source ?? '',
        sortOrder: message.sortOrder,
        isActive: !message.isActive
      });
      await load();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function deleteMessage(id) {
    if (!window.confirm('Hapus konten Public Display ini?')) return;
    try {
      await api.deletePublicMessage(id);
      setMessages((current) => current.filter((item) => item.id !== id));
      setStatus({ type: 'success', message: 'Konten Public Display dihapus.' });
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
          <p className="page-subtitle">Identitas publik, saldo awal, kategori transaksi, konten TV, pengguna, dan audit.</p>
        </div>
      </header>

      {status.message && (
        <div className={`notice ${status.type === 'error' ? 'error' : status.type === 'success' ? 'success' : ''}`}>
          {status.message}
        </div>
      )}

      {settings && (
        <section className="panel settings-section">
          <div className="panel-heading">
            <div><p className="section-kicker">Konfigurasi utama</p><h2>Identitas, keuangan awal & informasi publik</h2></div>
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
              <div className="settings-subheading">
                <CircleDollarSign size={18} />
                <div>
                  <strong>Saldo awal sistem</strong>
                  <span>Nilai sebelum transaksi mulai dicatat di IKHLAS. Perubahan tercatat pada audit log.</span>
                </div>
              </div>

              <div className="form-grid settings-grid">
                <label className="field">
                  <span>Saldo awal</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={settings.openingBalance}
                    onChange={(e) => setSettings((current) => ({ ...current, openingBalance: e.target.value }))}
                    required
                  />
                  <small>{formatRupiah(Number(settings.openingBalance || 0))}</small>
                </label>
                <label className="field">
                  <span>Tanggal saldo awal</span>
                  <input
                    type="date"
                    value={settings.openingBalanceDate ?? ''}
                    onChange={(e) => setSettings((current) => ({ ...current, openingBalanceDate: e.target.value }))}
                  />
                </label>
                <label className="field full-field">
                  <span>Catatan saldo awal</span>
                  <textarea
                    rows="3"
                    maxLength="240"
                    value={settings.openingBalanceNote ?? ''}
                    onChange={(e) => setSettings((current) => ({ ...current, openingBalanceNote: e.target.value }))}
                    placeholder="Contoh: Saldo kas sebelum migrasi pencatatan ke IKHLAS"
                  />
                </label>
              </div>
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
            <div><p className="section-kicker">Keuangan</p><h2>Kategori transaksi</h2></div>
            <Tag size={20} className="muted-icon" />
          </div>

          <div className="category-columns">
            <CategoryList title="Kas Masuk / Sumber Dana" items={incomeCategories} onToggle={toggleCategory} />
            <CategoryList title="Kas Keluar" items={expenseCategories} onToggle={toggleCategory} />
          </div>

          <form className="create-user-form" onSubmit={createCategory}>
            <div className="settings-subheading"><Plus size={18} /><div><strong>Tambah kategori</strong><span>Kategori aktif otomatis muncul pada form Bendahara.</span></div></div>
            <div className="form-grid settings-grid">
              <label className="field">
                <span>Jenis</span>
                <select value={newCategory.type} onChange={(e) => setNewCategory((current) => ({ ...current, type: e.target.value }))}>
                  <option value="INCOME">Kas Masuk</option>
                  <option value="EXPENSE">Kas Keluar</option>
                </select>
              </label>
              <label className="field">
                <span>Urutan</span>
                <input type="number" min="0" max="999" value={newCategory.sortOrder} onChange={(e) => setNewCategory((current) => ({ ...current, sortOrder: e.target.value }))} />
              </label>
              <label className="field full-field">
                <span>Nama kategori</span>
                <input value={newCategory.name} onChange={(e) => setNewCategory((current) => ({ ...current, name: e.target.value }))} required placeholder="Contoh: Wakaf Renovasi" />
              </label>
            </div>
            <button className="button secondary"><Plus size={17} /> Tambah kategori</button>
          </form>
        </div>

        <div className="panel settings-section">
          <div className="panel-heading">
            <div><p className="section-kicker">Public Display</p><h2>Running text ayat & hadits</h2></div>
            <Megaphone size={20} className="muted-icon" />
          </div>

          <div className="public-message-list">
            {messages.map((message) => (
              <article className={`public-message-row ${message.isActive ? '' : 'inactive'}`} key={message.id}>
                <span className="public-message-icon">
                  {message.kind === 'VERSE' ? <BookOpenText size={16} /> : <Megaphone size={16} />}
                </span>
                <div>
                  <strong>{message.title || (message.kind === 'VERSE' ? 'Ayat / Hadits' : message.kind === 'ANNOUNCEMENT' ? 'Pengumuman' : 'Pesan')}</strong>
                  <p>{message.content}</p>
                  {message.source && <span>{message.source}</span>}
                </div>
                <div className="row-actions">
                  <button className="text-button" type="button" onClick={() => startEditMessage(message)}><Pencil size={13} /> Edit</button>
                  <button className="text-button" type="button" onClick={() => toggleMessage(message)}>{message.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
                  <button className="icon-button danger-icon-button" type="button" onClick={() => deleteMessage(message.id)} aria-label="Hapus konten"><Trash2 size={15} /></button>
                </div>

                {editingMessageId === message.id && (
                  <form className="edit-message-form" onSubmit={saveEditedMessage}>
                    <label className="field">
                      <span>Jenis</span>
                      <select value={editingMessage.kind} onChange={(e) => setEditingMessage((current) => ({ ...current, kind: e.target.value }))}>
                        <option value="VERSE">Ayat / Hadits</option>
                        <option value="ANNOUNCEMENT">Pengumuman</option>
                        <option value="MESSAGE">Pesan Masjid</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Urutan</span>
                      <input type="number" min="0" max="999" value={editingMessage.sortOrder} onChange={(e) => setEditingMessage((current) => ({ ...current, sortOrder: e.target.value }))} />
                    </label>
                    <label className="field full-field"><span>Judul</span><input value={editingMessage.title} onChange={(e) => setEditingMessage((current) => ({ ...current, title: e.target.value }))} /></label>
                    <label className="field full-field"><span>Isi running text</span><textarea rows="4" maxLength="400" value={editingMessage.content} onChange={(e) => setEditingMessage((current) => ({ ...current, content: e.target.value }))} required /></label>
                    <label className="field full-field"><span>Sumber / referensi</span><input value={editingMessage.source} onChange={(e) => setEditingMessage((current) => ({ ...current, source: e.target.value }))} /></label>
                    <div className="inline-actions full-field">
                      <button className="button primary"><Save size={15} /> Simpan perubahan</button>
                      <button className="button ghost" type="button" onClick={cancelEditMessage}><X size={15} /> Batal</button>
                    </div>
                  </form>
                )}
              </article>
            ))}
          </div>

          <form className="create-user-form" onSubmit={createMessage}>
            <div className="settings-subheading"><Plus size={18} /><div><strong>Tambah running text</strong><span>Ayat/hadits aktif tampil bergulir pada bagian bawah Public Display. Pastikan sumbernya terverifikasi.</span></div></div>
            <div className="form-grid settings-grid">
              <label className="field">
                <span>Jenis</span>
                <select value={newMessage.kind} onChange={(e) => setNewMessage((current) => ({ ...current, kind: e.target.value }))}>
                  <option value="VERSE">Ayat / Hadits</option>
                  <option value="ANNOUNCEMENT">Pengumuman</option>
                  <option value="MESSAGE">Pesan Masjid</option>
                </select>
              </label>
              <label className="field">
                <span>Urutan</span>
                <input type="number" min="0" max="999" value={newMessage.sortOrder} onChange={(e) => setNewMessage((current) => ({ ...current, sortOrder: e.target.value }))} />
              </label>
              <label className="field full-field"><span>Judul</span><input value={newMessage.title} onChange={(e) => setNewMessage((current) => ({ ...current, title: e.target.value }))} placeholder="Contoh: Kajian Malam Jumat" /></label>
              <label className="field full-field"><span>Isi running text</span><textarea rows="4" maxLength="400" value={newMessage.content} onChange={(e) => setNewMessage((current) => ({ ...current, content: e.target.value }))} required /></label>
              <label className="field full-field"><span>Sumber / referensi</span><input value={newMessage.source} onChange={(e) => setNewMessage((current) => ({ ...current, source: e.target.value }))} placeholder="Contoh: QS. ... / HR. ... (setelah diverifikasi)" /></label>
            </div>
            <button className="button secondary"><Plus size={17} /> Tambah running text</button>
          </form>
        </div>
      </section>

      <section className="admin-two-column">
        <div className="panel settings-section">
          <div className="panel-heading">
            <div><p className="section-kicker">Hak akses</p><h2>Pengguna</h2></div>
            <Users size={20} className="muted-icon" />
          </div>

          <div className="role-policy-note">
            <strong>Pemisahan tugas</strong>
            <span>Admin mengelola informasi, jadwal, konfigurasi, monitoring, dan dapat membantu mencatat transaksi. Bendahara mencatat transaksi dan mengelola bukti keuangan.</span>
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
                  <AuditTransactionDetails log={log} />
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

function CategoryList({ title, items, onToggle }) {
  return (
    <div className="category-list">
      <h3>{title}</h3>
      {items.map((category) => (
        <div className={`category-row ${category.isActive ? '' : 'inactive'}`} key={category.id}>
          <div><strong>{category.name}</strong><span>Urutan {category.sortOrder}</span></div>
          <button className="text-button" type="button" onClick={() => onToggle(category)}>{category.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
        </div>
      ))}
      {items.length === 0 && <div className="empty-state">Belum ada kategori.</div>}
    </div>
  );
}


function AuditTransactionDetails({ log }) {
  if (log.entityType !== 'TRANSACTION' || !log.details) return null;

  if (log.action === 'TRANSACTION_UPDATE' && log.details.before && log.details.after) {
    const labels = {
      amount: 'Nominal',
      transactionDate: 'Tanggal',
      method: 'Metode',
      category: 'Kategori',
      sourceDetail: 'Sumber',
      description: 'Keterangan'
    };

    const changes = Object.entries(labels)
      .filter(([key]) => String(log.details.before?.[key] ?? '') !== String(log.details.after?.[key] ?? ''))
      .map(([key, label]) => ({
        key,
        label,
        before: key === 'amount' ? formatRupiah(log.details.before[key]) : String(log.details.before[key] ?? '-'),
        after: key === 'amount' ? formatRupiah(log.details.after[key]) : String(log.details.after[key] ?? '-')
      }));

    if (!changes.length) return <small className="audit-detail-note">Tidak ada perubahan nilai utama.</small>;

    return (
      <details className="audit-detail">
        <summary>Lihat {changes.length} perubahan</summary>
        <div className="audit-change-list">
          {changes.map((change) => (
            <div key={change.key}>
              <strong>{change.label}</strong>
              <span>{change.before}</span>
              <b>→</b>
              <span>{change.after}</span>
            </div>
          ))}
        </div>
      </details>
    );
  }

  if (log.action === 'TRANSACTION_DELETE' && log.details.deleted) {
    const deleted = log.details.deleted;
    return (
      <details className="audit-detail">
        <summary>Lihat snapshot transaksi terhapus</summary>
        <div className="audit-delete-snapshot">
          <strong>{deleted.category} · {formatRupiah(deleted.amount)}</strong>
          <span>{deleted.transactionDate} · {deleted.method}</span>
          <span>Bukti Drive: {log.details.evidencePreservedOnGoogleDrive ? 'dipertahankan' : 'tidak ada'} · Mutasi: {log.details.mutationPreservedOnGoogleDrive ? 'dipertahankan' : 'tidak ada'}</span>
        </div>
      </details>
    );
  }

  return null;
}
