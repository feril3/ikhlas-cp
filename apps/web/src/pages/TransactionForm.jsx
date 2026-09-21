import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Camera,
  CheckCircle2,
  FileImage,
  Landmark,
  Wallet
} from 'lucide-react';
import { api } from '../lib/api.js';
import { formatRupiah, toInputDate } from '../lib/format.js';

const incomeCategories = ['Kotak Amal', 'Donasi Jamaah', 'Infaq Jumat', 'Donatur Tetap', 'Lainnya'];
const expenseCategories = ['Operasional', 'Kebersihan', 'Listrik & Air', 'Kegiatan Masjid', 'Perawatan', 'Lainnya'];

export default function TransactionForm({ type }) {
  const income = type === 'INCOME';
  const navigate = useNavigate();
  const categories = income ? incomeCategories : expenseCategories;
  const [amountInput, setAmountInput] = useState('');
  const [form, setForm] = useState({
    transactionDate: toInputDate(),
    method: income ? 'CASH' : 'TRANSFER',
    category: categories[0],
    description: ''
  });
  const [evidence, setEvidence] = useState(null);
  const [mutation, setMutation] = useState(null);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const amount = useMemo(() => Number(amountInput.replace(/\D/g, '') || 0), [amountInput]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleAmount(event) {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 10);
    setAmountInput(digits ? new Intl.NumberFormat('id-ID').format(Number(digits)) : '');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!amount) {
      setStatus({ type: 'error', message: 'Nominal transaksi wajib diisi.' });
      return;
    }

    setStatus({ type: 'loading', message: 'Menyimpan transaksi...' });
    try {
      await api.createTransaction({ type, amount, ...form });
      setStatus({ type: 'success', message: `${income ? 'Kas masuk' : 'Kas keluar'} berhasil dicatat.` });
      setTimeout(() => navigate('/transactions'), 650);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  const TypeIcon = income ? ArrowDownToLine : ArrowUpFromLine;

  return (
    <div className="form-page">
      <button className="back-link" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Kembali</button>

      <header className="page-heading compact-heading">
        <div className={`title-icon ${income ? 'income' : 'expense'}`}><TypeIcon size={22} /></div>
        <div>
          <p className="eyebrow">Pencatatan transaksi</p>
          <h1>{income ? 'Kas Masuk' : 'Kas Keluar'}</h1>
          <p className="page-subtitle">Catat transaksi dengan data yang mudah diverifikasi.</p>
        </div>
      </header>

      <form className="transaction-form" onSubmit={handleSubmit}>
        <section className="form-section amount-section">
          <label htmlFor="amount">Nominal <span aria-hidden="true">*</span></label>
          <div className="amount-field-wrap">
            <span>Rp</span>
            <input
              id="amount"
              value={amountInput}
              onChange={handleAmount}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              aria-describedby="amount-preview"
            />
          </div>
          <span id="amount-preview" className="field-help">{amount ? formatRupiah(amount) : 'Masukkan nominal tanpa pecahan desimal.'}</span>
        </section>

        <section className="form-section">
          <div className="section-title"><div><p className="section-kicker">Detail</p><h2>Informasi transaksi</h2></div></div>

          <div className="form-grid">
            <label className="field">
              <span>Tanggal transaksi <b>*</b></span>
              <input type="date" value={form.transactionDate} onChange={(e) => update('transactionDate', e.target.value)} required />
            </label>

            <fieldset className="field full-field">
              <legend>Metode {income ? 'penerimaan' : 'pembayaran'} <b>*</b></legend>
              <div className="segmented-control">
                <button type="button" className={form.method === 'CASH' ? 'selected' : ''} onClick={() => update('method', 'CASH')}><Wallet size={18} /> Cash / Tunai</button>
                <button type="button" className={form.method === 'TRANSFER' ? 'selected' : ''} onClick={() => update('method', 'TRANSFER')}><Landmark size={18} /> Transfer Bank</button>
              </div>
            </fieldset>

            <label className="field full-field">
              <span>{income ? 'Sumber pemasukan' : 'Kategori pengeluaran'} <b>*</b></span>
              <select value={form.category} onChange={(e) => update('category', e.target.value)}>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>

            <label className="field full-field">
              <span>Keterangan</span>
              <textarea rows="4" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder={income ? 'Contoh: Donasi jamaah setelah kajian' : 'Contoh: Pembelian perlengkapan kebersihan'} maxLength="300" />
              <small>{form.description.length}/300 karakter</small>
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="section-title"><div><p className="section-kicker">Dokumentasi</p><h2>Bukti pendukung</h2></div><span className="optional-badge">Opsional</span></div>
          <div className="upload-grid">
            <label className="upload-card">
              <input type="file" accept="image/*,.pdf" capture="environment" onChange={(e) => setEvidence(e.target.files?.[0] ?? null)} />
              <span className="upload-icon"><Camera size={21} /></span>
              <span><strong>{evidence ? evidence.name : 'Bukti transaksi'}</strong><small>{evidence ? 'Ketuk untuk mengganti file' : 'Ambil foto atau pilih file'}</small></span>
              {evidence && <CheckCircle2 size={20} className="success-icon" />}
            </label>

            {form.method === 'TRANSFER' && (
              <label className="upload-card">
                <input type="file" accept="image/*,.pdf" onChange={(e) => setMutation(e.target.files?.[0] ?? null)} />
                <span className="upload-icon"><FileImage size={21} /></span>
                <span><strong>{mutation ? mutation.name : 'Mutasi rekening'}</strong><small>{mutation ? 'Ketuk untuk mengganti file' : 'Lampirkan mutasi bila tersedia'}</small></span>
                {mutation && <CheckCircle2 size={20} className="success-icon" />}
              </label>
            )}
          </div>
          <p className="field-help upload-note">Baseline UI sudah menyiapkan pemilihan file. Penyimpanan file permanen akan diaktifkan pada milestone upload backend.</p>
        </section>

        {status.type !== 'idle' && <div className={`notice ${status.type === 'error' ? 'error' : status.type === 'success' ? 'success' : ''}`}>{status.message}</div>}

        <div className="form-actions">
          <button type="button" className="button secondary" onClick={() => navigate(-1)}>Batal</button>
          <button type="submit" className="button primary" disabled={status.type === 'loading'}>{status.type === 'loading' ? 'Menyimpan...' : `Simpan ${income ? 'Kas Masuk' : 'Kas Keluar'}`}</button>
        </div>
      </form>
    </div>
  );
}
