import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconArrowDown,
  IconArrowUp,
  IconSearch,
  IconX
} from '@tabler/icons-react';
import { api } from '@/lib/api.js';
import { formatRupiah } from '@/lib/format.js';
import { useAuth } from '@/auth/AuthContext.jsx';
import { PageHeader } from '@/components/app/PageHeader.jsx';
import { TransactionDeleteDialog } from '@/components/finance/TransactionDeleteDialog.jsx';
import { TransactionEditSheet } from '@/components/finance/TransactionEditSheet.jsx';
import { TransactionMobileList } from '@/components/finance/TransactionMobileList.jsx';
import { TransactionTable } from '@/components/finance/TransactionTable.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

function SummaryMetric({ label, value, tone }) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <strong className={`mt-1.5 block truncate text-lg font-semibold tabular-nums sm:text-xl ${tone === 'income' ? 'text-primary' : tone === 'expense' ? 'text-destructive' : ''}`}>{value}</strong>
    </div>
  );
}

export default function Transactions() {
  const { user } = useAuth();
  const canManage = ['ADMIN', 'TREASURER'].includes(user?.role);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    query: '',
    type: 'ALL',
    method: 'ALL',
    from: '',
    to: ''
  });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function loadTransactions() {
    setError('');
    try {
      setData(await api.transactions());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return (data?.data ?? []).filter((item) => {
      if (filters.type !== 'ALL' && item.type !== filters.type) return false;
      if (filters.method !== 'ALL' && item.method !== filters.method) return false;
      if (filters.from && item.transactionDate < filters.from) return false;
      if (filters.to && item.transactionDate > filters.to) return false;
      if (!query) return true;
      return `${item.category} ${item.sourceDetail ?? ''} ${item.description ?? ''}`.toLowerCase().includes(query);
    });
  }, [data, filters]);

  function setFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetFilters() {
    setFilters({ query: '', type: 'ALL', method: 'ALL', from: '', to: '' });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Transaksi"
        description="Cari, filter, koreksi, dan audit seluruh pencatatan kas dalam satu ledger operasional."
        actions={canManage ? (
          <>
            <Button variant="outline" asChild><Link to="/transactions/income"><IconArrowDown data-icon="inline-start" /> Kas Masuk</Link></Button>
            <Button asChild><Link to="/transactions/expense"><IconArrowUp data-icon="inline-start" /> Kas Keluar</Link></Button>
          </>
        ) : null}
      />

      {data ? (
        <Card className="overflow-hidden">
          <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <SummaryMetric label="Saldo saat ini" value={formatRupiah(data.summary.currentBalance)} />
            <SummaryMetric label="Total kas masuk" value={`+${formatRupiah(data.summary.totalIncome)}`} tone="income" />
            <SummaryMetric label="Total kas keluar" value={`-${formatRupiah(data.summary.totalExpense)}`} tone="expense" />
          </div>
        </Card>
      ) : (
        <Skeleton className="h-24 w-full" />
      )}

      <Card className="overflow-hidden">
        <CardContent className="border-b p-3 sm:p-4">
          <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_160px_160px_150px_150px_auto]">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={filters.query} onChange={(event) => setFilter('query', event.target.value)} placeholder="Cari kategori, sumber, keterangan..." />
            </div>

            <Select value={filters.type} onValueChange={(value) => setFilter('type', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem value="ALL">Semua jenis</SelectItem>
                <SelectItem value="INCOME">Kas Masuk</SelectItem>
                <SelectItem value="EXPENSE">Kas Keluar</SelectItem>
              </SelectGroup></SelectContent>
            </Select>

            <Select value={filters.method} onValueChange={(value) => setFilter('method', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem value="ALL">Semua metode</SelectItem>
                <SelectItem value="CASH">Tunai</SelectItem>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
              </SelectGroup></SelectContent>
            </Select>

            <Input type="date" aria-label="Dari tanggal" value={filters.from} onChange={(event) => setFilter('from', event.target.value)} />
            <Input type="date" aria-label="Sampai tanggal" value={filters.to} onChange={(event) => setFilter('to', event.target.value)} />

            <Button variant="ghost" onClick={resetFilters} disabled={!filters.query && filters.type === 'ALL' && filters.method === 'ALL' && !filters.from && !filters.to}>
              <IconX data-icon="inline-start" /> Reset
            </Button>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">{filtered.length} dari {data?.data.length ?? 0} transaksi</div>
        </CardContent>

        {error && <div className="p-4"><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert></div>}

        {!data && !error && (
          <div className="p-4">
            <Skeleton className="h-[360px] w-full" />
          </div>
        )}

        {data && (
          <>
            <div className="hidden md:block">
              <TransactionTable data={filtered} canManage={canManage} onEdit={setEditing} onDelete={setDeleting} />
            </div>
            <div className="md:hidden">
              <TransactionMobileList data={filtered} canManage={canManage} onEdit={setEditing} onDelete={setDeleting} />
            </div>
          </>
        )}
      </Card>

      <TransactionEditSheet
        transaction={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={loadTransactions}
      />

      <TransactionDeleteDialog
        transaction={deleting}
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={loadTransactions}
        onError={(err) => setError(err.message)}
      />
    </div>
  );
}
