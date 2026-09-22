import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, Filter, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatRupiah } from '../lib/format.js';
import { LoadingState } from '../components/LoadingState.jsx';
import { TransactionRow } from '../components/TransactionRow.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Transactions() {
  const { user } = useAuth();
  const canCreateTransactions = ['ADMIN', 'TREASURER'].includes(user?.role);
  const [type, setType] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    api.transactions({ type: type || undefined }).then(setData).catch((err) => setError(err.message));
  }, [type]);

  const filtered = data?.data.filter((item) => `${item.category} ${item.sourceDetail ?? ''} ${item.description ?? ''}`.toLowerCase().includes(query.toLowerCase())) ?? [];

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div><p className="eyebrow">Keuangan</p><h1>Riwayat Transaksi</h1><p className="page-subtitle">Pantau kas masuk dan keluar dalam satu tempat.</p></div>
        {canCreateTransactions && (
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
        {data && <div className="transaction-list full-list">{filtered.length ? filtered.map((item) => <TransactionRow key={item.id} transaction={item} />) : <div className="empty-state">Tidak ada transaksi yang cocok.</div>}</div>}
      </section>
    </div>
  );
}
