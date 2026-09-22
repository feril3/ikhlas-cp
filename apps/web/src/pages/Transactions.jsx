import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, Filter, Save, Search, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatRupiah } from '../lib/format.js';
import { LoadingState } from '../components/LoadingState.jsx';
import { TransactionRow } from '../components/TransactionRow.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

function TransactionEditPanel({ transaction, onClose, onSaved }) {
  const income = transaction.type === 'INCOME';
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    amount: transaction.amount,
    transactionDate: transaction.transactionDate,
    method: transaction.method,
    categoryId: String(transaction.categoryId ?? ''),
    sourceDetail: transaction.sourceDetail ?? '',
    description: transaction.description ?? ''
  });
  const [status, setStatus] = useState({ type: 'loading', message: 'Memuat kategori...' });

  useEffect(() => {
    let cancelled = false;
    api.transactionCategories(transaction.type)
      .then((result) => {
        if (cancelled) return;
        const available = result.data.filter(
          (item) => item.isActive || Number(item.id) === Number(transaction.categoryId)
        );
        setCategories(available);
        setForm((current) => ({
          ...current,
          categoryId: current.categoryId || String(available.find((item) => item.name === transaction.category)?.id ?? '')
        }));
        setStatus({ type: 'idle', message: '' });
      })
      .catch((error) => {
        if (!cancelled) setStatus({ type: 'error', message: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [transaction]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'Menyimpan perubahan...' });
    try {
      await api.updateTransaction(transaction.id, {
        amount: Number(form.amount),
        transactionDate: form.transactionDate,
        method: form.method,
        categoryId: Number(form.categoryId),
        sourceDetail: income ? form.sourceDetail : '',
        description: form.description
      });
      setStatus({ type: 'success', message: 'Transaksi berhasil diperbarui.' });
      await onSaved();
      onClose();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="transaction-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-transaction-title">
        <header className="modal-heading">
          <div>
            <p className="section-kicker">Audit perubahan aktif</p>
            <h2 id="edit-transaction-title">Edit {income ? 'Kas Masuk' : 'Kas Keluar'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Tutup"><X size={18} /></button>
        </header>

        <form className="transaction-edit-form" onSubmit={submit}>
          <label className="field">
            <span>Nominal</span>
            <input type="number" min="1" max="9999999999" inputMode="numeric" value={form.amount} onChange={(event) => update('amount', event.target.value)} required />
          </label>
          <label className="field">
            <span>Tanggal transaksi</span>
            <input type="date" value={form.transactionDate} onChange={(event) => update('transactionDate', event.target.value)} required />
          </label>
          <label className="field">
            <span>Metode</span>
            <select value={form.method} onChange={(event) => update('method', event.target.value)}>
              <option value="CASH">Cash / Tunai</option>
              <option value="TRANSFER">Transfer Bank</option>
            </select>
          </label>
          <label className="field">
            <span>Kategori</span>
            <select value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)} required>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          {income && (
            <label className="field full-field">
              <span>Detail sumber dana</span>
              <input maxLength="120" value={form.sourceDetail} onChange={(event) => update('sourceDetail', event.target.value)} />
            </label>
          )}
          <label className="field full-field">
            <span>Keterangan</span>
            <textarea rows="4" maxLength="300" value={form.description} onChange={(event) => update('description', event.target.value)} />
          </label>

          {status.message && <div className={`notice ${status.type} full-field`}>{status.message}</div>}
          <p className="audit-edit-note full-field">Nilai sebelum dan sesudah perubahan dicatat ke audit trail. Jenis kas masuk/keluar tidak dapat diubah.</p>

          <div className="inline-actions full-field">
            <button type="button" className="button secondary" onClick={onClose}>Batal</button>
            <button className="button primary" disabled={status.type === 'loading' || !form.categoryId}>
              <Save size={16} /> Simpan perubahan
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function Transactions() {
  const { user } = useAuth();
  const canManageTransactions = ['ADMIN', 'TREASURER'].includes(user?.role);
  const [type, setType] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function loadTransactions() {
    setError('');
    try {
      const result = await api.transactions({ type: type || undefined });
      setData(result);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    setData(null);
    loadTransactions();
  }, [type]);

  async function deleteTransaction(transaction) {
    const attachmentNote = transaction.evidenceFileId || transaction.bankMutationFileId
      ? '\n\nFile bukti di Google Drive akan dipertahankan untuk audit.'
      : '';
    if (!window.confirm(`Hapus transaksi ${transaction.category} sebesar ${formatRupiah(transaction.amount)}?${attachmentNote}`)) return;

    setBusyId(transaction.id);
    try {
      await api.deleteTransaction(transaction.id);
      await loadTransactions();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = data?.data.filter((item) => `${item.category} ${item.sourceDetail ?? ''} ${item.description ?? ''}`.toLowerCase().includes(query.toLowerCase())) ?? [];

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div><p className="eyebrow">Keuangan</p><h1>Riwayat Transaksi</h1><p className="page-subtitle">Pantau, koreksi, dan audit kas masuk maupun keluar dalam satu tempat.</p></div>
        {canManageTransactions && (
          <div className="heading-actions"><Link to="/transactions/income" className="button secondary"><ArrowDownToLine size={18} /> Kas Masuk</Link><Link to="/transactions/expense" className="button primary"><ArrowUpFromLine size={18} /> Kas Keluar</Link></div>
        )}
      </header>

      {data && (
        <section className="mini-summary">
          <div><span>Saldo saat ini</span><strong>{formatRupiah(data.summary.currentBalance)}</strong></div>
          <div><span>Total masuk</span><strong className="amount-income">+{formatRupiah(data.summary.totalIncome)}</strong></div>
          <div><span>Total keluar</span><strong className="amount-expense">-{formatRupiah(data.summary.totalExpense)}</strong></div>
        </section>
      )}

      <section className="panel history-panel">
        <div className="toolbar">
          <div className="search-box"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari transaksi..." /></div>
          <div className="filter-group"><Filter size={17} /><button className={!type ? 'active' : ''} onClick={() => setType('')}>Semua</button><button className={type === 'INCOME' ? 'active' : ''} onClick={() => setType('INCOME')}>Masuk</button><button className={type === 'EXPENSE' ? 'active' : ''} onClick={() => setType('EXPENSE')}>Keluar</button></div>
        </div>
        {error && <div className="notice error">{error}</div>}
        {!data && !error && <LoadingState />}
        {data && (
          <div className="transaction-list full-list">
            {filtered.length ? filtered.map((item) => (
              <TransactionRow
                key={item.id}
                transaction={item}
                busy={busyId === item.id}
                onEdit={canManageTransactions ? setEditing : undefined}
                onDelete={canManageTransactions ? deleteTransaction : undefined}
              />
            )) : <div className="empty-state">Tidak ada transaksi yang cocok.</div>}
          </div>
        )}
      </section>

      {editing && (
        <TransactionEditPanel
          transaction={editing}
          onClose={() => setEditing(null)}
          onSaved={loadTransactions}
        />
      )}
    </div>
  );
}
