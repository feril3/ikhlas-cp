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
import { formatRupiah, toInputDate } from '../lib/format.js';
import { LoadingState } from '../components/LoadingState.jsx';
import { TransactionRow } from '../components/TransactionRow.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const today = toInputDate();

  useEffect(() => {
    api.dashboard(today).then(setData).catch((err) => setError(err.message));
  }, [today]);

  if (!data && !error) return <LoadingState label="Menyiapkan dashboard..." />;

  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${today}T00:00:00`));

  return (
    <div className="page-stack">
      <header className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">{dateLabel}</p>
          <h1>Assalamu'alaikum, {user?.name?.split(' ')[0] ?? 'Pengurus'}</h1>
          <p className="page-subtitle">Ringkasan kondisi masjid dan keuangan yang tercatat saat ini.</p>
        </div>
        <div className="heading-actions">
          <Link to="/transactions/income" className="button secondary"><ArrowDownToLine size={18} /> Kas Masuk</Link>
          <Link to="/transactions/expense" className="button primary"><ArrowUpFromLine size={18} /> Kas Keluar</Link>
        </div>
      </header>

      {error ? (
        <div className="notice error"><strong>Dashboard gagal dimuat.</strong><span>{error}</span></div>
      ) : (
        <>
          <section className="financial-summary" aria-label="Ringkasan keuangan">
            <div className="balance-hero">
              <div className="summary-icon"><WalletCards size={22} /></div>
              <div>
                <span className="summary-label">Saldo saat ini</span>
                <strong className="balance-value">{formatRupiah(data.summary.currentBalance)}</strong>
                <span className="summary-caption">Saldo awal + seluruh kas masuk − seluruh kas keluar</span>
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
                <div className="panel-heading">
                  <div>
                    <p className="section-kicker">Jadwal acuan {data.prayerScheduleDate ?? '-'}</p>
                    <h2>Jadwal salat</h2>
                  </div>
                  <Clock3 size={19} className="muted-icon" />
                </div>
                <div className="prayer-list">
                  {data.prayerSchedule.map((item) => (
                    <div className="prayer-row" key={item.prayerName}>
                      <div><strong>{item.prayerName}</strong><span>{item.imam || 'Imam belum diisi'}</span></div>
                      <time>{item.adhanTime}</time>
                    </div>
                  ))}
                  {data.prayerSchedule.length === 0 && <div className="empty-state">Jadwal salat belum tersedia.</div>}
                </div>
              </section>

              <section className="panel activities-panel">
                <div className="panel-heading"><div><p className="section-kicker">Agenda</p><h2>Kegiatan terdekat</h2></div><CalendarClock size={19} className="muted-icon" /></div>
                <div className="activity-list">
                  {data.activities.map((item) => (
                    <article className="activity-row" key={item.id}>
                      <div className="date-block"><strong>{item.activityDate.slice(-2)}</strong><span>{item.activityDate.slice(5, 7)}</span></div>
                      <div><strong>{item.title}</strong><span>{item.startTime || 'Waktu fleksibel'}{item.speaker ? ` · ${item.speaker}` : ''}</span></div>
                    </article>
                  ))}
                  {data.activities.length === 0 && <div className="empty-state">Belum ada kegiatan mendatang.</div>}
                </div>
              </section>
            </div>
          </div>

          <section className="quick-actions" aria-label="Aksi cepat">
            <Link to="/transactions/income" className="quick-action"><span className="quick-icon income"><ArrowDownToLine size={20} /></span><div><strong>Catat Kas Masuk</strong><span>Cash, kotak amal, atau transfer</span></div><ArrowRight size={18} /></Link>
            <Link to="/transactions/expense" className="quick-action"><span className="quick-icon expense"><ArrowUpFromLine size={20} /></span><div><strong>Catat Kas Keluar</strong><span>Dengan bukti transaksi</span></div><ArrowRight size={18} /></Link>
            <Link to="/public-display" target="_blank" rel="noreferrer" className="quick-action"><span className="quick-icon neutral"><CircleDollarSign size={20} /></span><div><strong>Buka Public Display</strong><span>Preview tampilan TV masjid</span></div><ArrowRight size={18} /></Link>
          </section>
        </>
      )}
    </div>
  );
}
