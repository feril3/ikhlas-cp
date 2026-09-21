import { useEffect, useState } from 'react';
import { Download, FileBarChart, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatRupiah, toInputDate } from '../lib/format.js';
import { LoadingState } from '../components/LoadingState.jsx';

function firstDayOfMonth(date) {
  return `${date.slice(0, 7)}-01`;
}

export default function Reports() {
  const today = toInputDate();
  const [range, setRange] = useState({ from: firstDayOfMonth(today), to: today });
  const [data, setData] = useState(null);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  async function load() {
    setData(null);
    setStatus({ type: 'idle', message: '' });
    try {
      setData(await api.reportSummary(range.from, range.to));
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function downloadCsv() {
    setStatus({ type: 'loading', message: 'Menyiapkan CSV...' });
    try {
      await api.downloadTransactionsCsv(range.from, range.to);
      setStatus({ type: 'success', message: 'CSV berhasil diunduh.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Pelaporan</p>
          <h1>Laporan Keuangan</h1>
          <p className="page-subtitle">Rekap periode dengan saldo awal periode, arus masuk, arus keluar, dan saldo akhir.</p>
        </div>
        <button className="button secondary" onClick={downloadCsv}><Download size={18} /> Unduh CSV</button>
      </header>

      <section className="panel report-filter-panel">
        <div className="report-filters">
          <label className="field"><span>Dari tanggal</span><input type="date" value={range.from} onChange={(e) => setRange((current) => ({ ...current, from: e.target.value }))} /></label>
          <label className="field"><span>Sampai tanggal</span><input type="date" value={range.to} onChange={(e) => setRange((current) => ({ ...current, to: e.target.value }))} /></label>
          <button className="button primary" onClick={load}>Terapkan periode</button>
        </div>
      </section>

      {status.message && <div className={`notice ${status.type === 'error' ? 'error' : status.type === 'success' ? 'success' : ''}`}>{status.message}</div>}
      {!data && status.type !== 'error' && <LoadingState label="Menghitung laporan..." />}

      {data && (
        <>
          <section className="report-summary-grid">
            <article><WalletCards size={19} /><span>Saldo awal periode</span><strong>{formatRupiah(data.summary.openingBalance)}</strong></article>
            <article><TrendingUp size={19} /><span>Kas masuk</span><strong className="amount-income">+{formatRupiah(data.summary.totalIncome)}</strong></article>
            <article><TrendingDown size={19} /><span>Kas keluar</span><strong className="amount-expense">-{formatRupiah(data.summary.totalExpense)}</strong></article>
            <article className="report-closing"><FileBarChart size={19} /><span>Saldo akhir periode</span><strong>{formatRupiah(data.summary.closingBalance)}</strong></article>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div><p className="section-kicker">Analisis sederhana</p><h2>Ringkasan per kategori</h2></div>
              <span className="muted-chip">{data.summary.transactionCount} transaksi</span>
            </div>
            <div className="report-category-list">
              {data.categories.length === 0 && <div className="empty-state">Belum ada transaksi pada periode ini.</div>}
              {data.categories.map((item) => (
                <div className="report-category-row" key={`${item.type}-${item.category}`}>
                  <div>
                    <strong>{item.category}</strong>
                    <span>{item.type === 'INCOME' ? 'Kas Masuk' : 'Kas Keluar'} · {item.transactionCount} transaksi</span>
                  </div>
                  <strong className={item.type === 'INCOME' ? 'amount-income' : 'amount-expense'}>{formatRupiah(item.total)}</strong>
                </div>
              ))}
            </div>
          </section>

          <div className="report-standard-note">
            <strong>Catatan penyajian</strong>
            <p>Rekap ini membantu monitoring kas operasional. Untuk laporan keuangan formal entitas nonlaba, struktur penyajian perlu disesuaikan dengan kebijakan akuntansi organisasi dan standar yang berlaku.</p>
          </div>
        </>
      )}
    </div>
  );
}
