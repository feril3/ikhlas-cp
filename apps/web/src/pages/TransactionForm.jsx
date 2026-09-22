import { useEffect, useMemo, useState } from 'react';
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
import { LoadingState } from '../components/LoadingState.jsx';

export default function TransactionForm({ type }) {
  const income = type === 'INCOME';
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [amountInput, setAmountInput] = useState('');
  const [form, setForm] = useState({
    transactionDate: toInputDate(),
    method: income ? 'CASH' : 'TRANSFER',
    categoryId: '',
    sourceDetail: '',
    description: ''
  });
  const [evidence, setEvidence] = useState(null);
  const [mutation, setMutation] = useState(null);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    setLoadingCategories(true);
    api.transactionCategories(type)
      .then((result) => {
        const active = result.data.filter((item) => item.isActive);
        setCategories(active);
        setForm((current) => ({
          ...current,
          categoryId: active[0]?.id ? String(active[0].id) : ''
        }));
      })
      .catch((error) => setStatus({ type: 'error', message: error.message }))
      .finally(() => setLoadingCategories(false));
  }, [type]);

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

    if (!form.categoryId) {
      setStatus({ type: 'error', message: 'Pilih kategori transaksi terlebih dahulu.' });
      return;
    }

    if (!income && !evidence) {
      setStatus({ type: 'error', message: 'Bukti transaksi wajib dilampirkan untuk kas keluar.' });
      return;
    }

    setStatus({
      type: 'loading',
      message: evidence || mutation
        ? 'Menyimpan transaksi dan mengunggah bukti ke Google Drive...'
        : 'Menyimpan transaksi...'
    });

    try {
      const created = await api.createTransaction(
        {
          type,
          amount,
          ...form,
          categoryId: Number(form.categoryId),
          sourceDetail: income ? form.sourceDetail : ''
        },
        { evidence, mutation }
      );

      const telegramNote = created.notification?.status === 'failed'
        ? ' Transaksi tersimpan, tetapi notifikasi Telegram gagal dikirim.'
        : '';

      setStatus({
        type: created.notification?.status === 'failed' ? 'warning' : 'success',
        message: `${income ? 'Kas masuk' : 'Kas keluar'} berhasil dicatat.${telegramNote}`
      });

      setTimeout(() => navigate('/transactions'), 900);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  const TypeIcon = income ? ArrowDownToLine : ArrowUpFromLine;

  if (loadingCategories) return <LoadingState label="Memuat kategori transaksi..." />;

  return (
    <div className="form-page">
      <button className="back-link" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Kembali</button>

      <header className="page-heading compact-heading">
        <div className={`title-icon ${income ? 'income' : 'expense'}`}><TypeIcon size={22} /></div>
        <div>
          <p className="eyebrow">Pencatatan transaksi</p>
          <h1>{income ? 'Kas Masuk' : 'Kas Keluar'}</h1>
          <p className="page-subtitle">Catat transaksi dengan sumber, kategori, dan bukti yang mudah diverifikasi.</p>
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
              <span>{income ? 'Sumber dana' : 'Kategori pengeluaran'} <b>*</b></span>
              <select value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)} required>
                {categories.length === 0 && <option value="">Belum ada kategori aktif</option>}
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <small>Kategori dikelola Admin dari Pengaturan Sistem.</small>
            </label>

            {income && (
              <label className="field full-field">
                <span>Detail sumber dana</span>
                <input
                  value={form.sourceDetail}
                  onChange={(e) => update('sourceDetail', e.target.value)}
                  maxLength="120"
                  placeholder="Contoh: Donatur tetap, Kotak Amal Lt. 1, Hamba Allah"
                />
                <small>Opsional. Tidak ditampilkan pada Public Display agar informasi sensitif tidak bocor.</small>
              </label>
            )}

            <label className="field full-field">
              <span>Keterangan</span>
              <textarea
                rows="4"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder={income ? 'Contoh: Donasi setelah kajian Ahad' : 'Contoh: Pembelian perlengkapan kebersihan'}
                maxLength="300"
              />
              <small>{form.description.length}/300 karakter</small>
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="section-title">
            <div><p className="section-kicker">Dokumentasi</p><h2>Bukti pendukung</h2></div>
            {income && <span className="optional-badge">Bukti opsional</span>}
          </div>

          <div className="upload-grid">
            <label className="upload-card">
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={(e) => setEvidence(e.target.files?.[0] ?? null)} />
              <span className="upload-icon"><Camera size={21} /></span>
              <span>
                <strong>{evidence ? evidence.name : `Bukti transaksi${income ? '' : ' *'}`}</strong>
                <small>{evidence ? 'Ketuk untuk mengganti file' : 'JPG, PNG, WEBP, atau PDF · maks. 5 MB'}</small>
              </span>
              {evidence && <CheckCircle2 size={20} className="success-icon" />}
            </label>

            {form.method === 'TRANSFER' && (
              <label className="upload-card">
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setMutation(e.target.files?.[0] ?? null)} />
                <span className="upload-icon"><FileImage size={21} /></span>
                <span>
                  <strong>{mutation ? mutation.name : 'Mutasi rekening'}</strong>
                  <small>{mutation ? 'Ketuk untuk mengganti file' : 'Lampirkan mutasi jika tersedia'}</small>
                </span>
                {mutation && <CheckCircle2 size={20} className="success-icon" />}
              </label>
            )}
          </div>
          <p className="field-help upload-note">Dokumen disimpan privat di Google Drive. Aplikasi hanya menyimpan referensi file untuk mengaitkannya dengan transaksi.</p>
        </section>

        {status.type !== 'idle' && <div className={`notice ${status.type}`}>{status.message}</div>}

        <div className="form-actions">
          <button type="button" className="button secondary" onClick={() => navigate(-1)}>Batal</button>
          <button type="submit" className="button primary" disabled={status.type === 'loading' || categories.length === 0}>
            {status.type === 'loading' ? 'Memproses...' : `Simpan ${income ? 'Kas Masuk' : 'Kas Keluar'}`}
          </button>
        </div>
      </form>
    </div>
  );
}
