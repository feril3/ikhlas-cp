import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  WalletCards
} from 'lucide-react';
import { api } from '../lib/api.js';
import { formatRupiah } from '../lib/format.js';
import { LoadingState } from '../components/LoadingState.jsx';
import { TransactionRow } from '../components/TransactionRow.jsx';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch((err) => setError(err.message));
  }, []);

  if (!data && !error) return <LoadingState label="Menyiapkan dashboard..." />;

  return (
    <div className="page-stack">
      <header className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">Senin, 21 September 2026</p>
          <h1>Assalamu'alaikum, Feril</h1>
          <p className="page-subtitle">Ringkasan kondisi masjid hari ini.</p>
        </div>
        <div className="heading-actions">
          <Link to="/transactions/income" className="button secondary"><ArrowDownToLine size={18} /> Kas Masuk</Link>
          <Link to="/transactions/expense" className="button primary"><ArrowUpFromLine size={18} /> Kas Keluar</Link>
        </div>
      </header>

      {error ? (
        <div className="notice error"><strong>API belum terhubung.</strong><span>{error}. Jalankan `npm run dev` dari root project.</span></div>
      ) : (
        <>
          <section className="financial-summary" aria-label="Ringkasan keuangan">
            <div className="balance-hero">
              <div className="summary-icon"><WalletCards size={22} /></div>
              <div>
                <span className="summary-label">Saldo saat ini</span>
                <strong className="balance-value">{formatRupiah(data.summary.currentBalance)}</strong>
                <span className="summary-caption">Terhitung dari seluruh transaksi tercatat</span>
              </div>
            </div>
            <div className="summary-grid">
              <div className="summary-item"><span>Saldo awal</span><strong>{formatRupiah(data.summary.openingBalance)}</strong></div>
              <div className="summary-item"><span>Kas masuk</span><strong className="amount-income">+{formatRupiah(data.summary.totalIncome)}</strong></div>
              <div className="summary-item"><span>Kas keluar</span><strong className="amount-expense">-{formatRupiah(data.summary.totalExpense)}</strong></div>
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="panel transactions-panel">
              <div className="panel-heading">
                <div><p className="section-kicker">Keuangan</p><h2>Transaksi terbaru</h2></div>
                <Link to="/transactions" className="text-link">Lihat semua <ArrowRight size={16} /></Link>
              </div>
              <div className="transaction-list">
                {data.recentTransactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} compact />)}
              </div>
            </section>

            <div className="side-stack">
              <section className="panel prayer-panel">
                <div className="panel-heading"><div><p className="section-kicker">Hari ini</p><h2>Jadwal salat</h2></div><Clock3 size={19} className="muted-icon" /></div>
                <div className="prayer-list">
                  {data.prayerSchedule.map((item) => (
                    <div className="prayer-row" key={item.prayerName}>
                      <div><strong>{item.prayerName}</strong><span>{item.imam}</span></div>
                      <time>{item.adhanTime}</time>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel activities-panel">
                <div className="panel-heading"><div><p className="section-kicker">Agenda</p><h2>Kegiatan terdekat</h2></div><CalendarClock size={19} className="muted-icon" /></div>
                <div className="activity-list">
                  {data.activities.map((item) => (
                    <article className="activity-row" key={item.id}>
                      <div className="date-block"><strong>{item.activityDate.slice(-2)}</strong><span>SEP</span></div>
                      <div><strong>{item.title}</strong><span>{item.startTime} · {item.speaker}</span></div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <section className="quick-actions" aria-label="Aksi cepat">
            <Link to="/transactions/income" className="quick-action"><span className="quick-icon income"><ArrowDownToLine size={20} /></span><div><strong>Catat Kas Masuk</strong><span>Cash, kotak amal, atau transfer</span></div><ArrowRight size={18} /></Link>
            <Link to="/transactions/expense" className="quick-action"><span className="quick-icon expense"><ArrowUpFromLine size={20} /></span><div><strong>Catat Kas Keluar</strong><span>Operasional dan pengeluaran lain</span></div><ArrowRight size={18} /></Link>
            <Link to="/public-display" className="quick-action"><span className="quick-icon neutral"><CircleDollarSign size={20} /></span><div><strong>Buka Public Display</strong><span>Preview tampilan TV masjid</span></div><ArrowRight size={18} /></Link>
          </section>
        </>
      )}
    </div>
  );
}
