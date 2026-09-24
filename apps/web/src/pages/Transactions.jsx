import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconArrowDown,
  IconArrowUp,
  IconSearch,
  IconTrash
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { api } from '@/lib/api.js';
import { formatRupiah } from '@/lib/format.js';
import { useAuth } from '@/auth/AuthContext.jsx';
import { PageHeader } from '@/components/app/PageHeader.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TransactionEditSheet } from '@/features/transactions/TransactionEditSheet.jsx';
import { TransactionTable } from '@/features/transactions/TransactionTable.jsx';

function Metric({ label, value, tone = 'default', caption }) {
  const valueClass = tone === 'income'
    ? 'text-primary'
    : tone === 'expense'
      ? 'text-destructive'
      : 'text-foreground';

  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <strong className={'mt-1.5 block truncate text-xl font-semibold tracking-[-0.025em] sm:text-2xl ' + valueClass}>
        {value}
      </strong>
      {caption && <span className="mt-1 block text-[11px] text-muted-foreground">{caption}</span>}
    </div>
  );
}

function TransactionsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-[420px] w-full" />
    </div>
  );
}

export default function Transactions() {
  const { user } = useAuth();
  const canManageTransactions = ['ADMIN', 'TREASURER'].includes(user?.role);

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [query, setQuery] = useState('');
  const [type, setType] = useState('ALL');
  const [method, setMethod] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function loadTransactions() {
    setError('');
    try {
      const result = await api.transactions();
      setData(result);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  const categories = useMemo(() => {
    const values = new Set((data?.data ?? []).map((item) => item.category).filter(Boolean));
    return [...values].sort((a, b) => a.localeCompare(b, 'id-ID'));
  }, [data]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return (data?.data ?? []).filter((item) => {
      if (type !== 'ALL' && item.type !== type) return false;
      if (method !== 'ALL' && item.method !== method) return false;
      if (category !== 'ALL' && item.category !== category) return false;
      if (from && item.transactionDate < from) return false;
      if (to && item.transactionDate > to) return false;

      if (normalized) {
        const haystack = [
          item.category,
          item.sourceDetail,
          item.description,
          item.method === 'TRANSFER' ? 'transfer' : 'tunai',
          item.type === 'INCOME' ? 'masuk' : 'keluar'
        ].filter(Boolean).join(' ').toLowerCase();

        if (!haystack.includes(normalized)) return false;
      }

      return true;
    });
  }, [category, data, from, method, query, to, type]);

  const hasFilters = Boolean(query || type !== 'ALL' || method !== 'ALL' || category !== 'ALL' || from || to);

  function resetFilters() {
    setQuery('');
    setType('ALL');
    setMethod('ALL');
    setCategory('ALL');
    setFrom('');
    setTo('');
  }

  async function handleSaved() {
    await loadTransactions();
    toast.success('Transaksi berhasil diperbarui.');
  }

  async function confirmDelete() {
    if (!deleting) return;

    setBusyId(deleting.id);
    try {
      await api.deleteTransaction(deleting.id);
      await loadTransactions();
      toast.success('Transaksi berhasil dihapus.', {
        description: deleting.evidenceFileId || deleting.bankMutationFileId
          ? 'Dokumen Google Drive dipertahankan untuk audit.'
          : undefined
      });
      setDeleting(null);
    } catch (err) {
      setError(err.message);
      toast.error('Transaksi gagal dihapus.', { description: err.message });
    } finally {
      setBusyId(null);
    }
  }

  if (!data && !error) return <TransactionsSkeleton />;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Riwayat Transaksi"
        description="Pantau, cari, koreksi, dan audit kas masuk maupun kas keluar dari satu tempat."
        actions={canManageTransactions ? (
          <>
            <Button variant="outline" asChild>
              <Link to="/transactions/income">
                <IconArrowDown data-icon="inline-start" aria-hidden="true" />
                Kas Masuk
              </Link>
            </Button>
            <Button asChild>
              <Link to="/transactions/expense">
                <IconArrowUp data-icon="inline-start" aria-hidden="true" />
                Kas Keluar
              </Link>
            </Button>
          </>
        ) : null}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data && (
        <>
          <Card className="overflow-hidden">
            <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
              <Metric
                label="Saldo awal"
                value={formatRupiah(data.summary.openingBalance)}
                caption="Basis awal perhitungan kas"
              />
              <Metric
                label="Masuk"
                value={'+' + formatRupiah(data.summary.totalIncome)}
                tone="income"
                caption="Total seluruh kas masuk"
              />
              <Metric
                label="Keluar"
                value={'-' + formatRupiah(data.summary.totalExpense)}
                tone="expense"
                caption="Total seluruh kas keluar"
              />
              <Metric
                label="Sisa saldo"
                value={formatRupiah(data.summary.currentBalance)}
                caption="Saldo berjalan saat ini"
              />
            </div>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <InputGroup className="h-10">
                  <InputGroupAddon>
                    <IconSearch aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupInput
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari kategori, sumber, atau keterangan..."
                    aria-label="Cari transaksi"
                  />
                </InputGroup>

                <ToggleGroup
                  type="single"
                  value={type}
                  onValueChange={(value) => value && setType(value)}
                  variant="outline"
                  spacing={0}
                  className="grid w-full grid-cols-3 xl:w-auto"
                >
                  <ToggleGroupItem value="ALL" className="w-full rounded-r-none xl:w-auto">Semua</ToggleGroupItem>
                  <ToggleGroupItem value="INCOME" className="w-full rounded-none xl:w-auto">Kas Masuk</ToggleGroupItem>
                  <ToggleGroupItem value="EXPENSE" className="w-full rounded-l-none xl:w-auto">Kas Keluar</ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-2 xl:grid-cols-[minmax(150px,.8fr)_minmax(180px,1fr)_minmax(150px,.75fr)_minmax(150px,.75fr)_auto] xl:items-end">
                <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                  Metode
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Metode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua metode</SelectItem>
                      <SelectItem value="CASH">Tunai</SelectItem>
                      <SelectItem value="TRANSFER">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                  Kategori
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua kategori</SelectItem>
                      {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </label>

                <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                  Dari
                  <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-10" />
                </label>

                <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                  Sampai
                  <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-10" />
                </label>

                <div className="flex min-h-10 items-center justify-between gap-3 md:col-span-2 xl:col-span-1 xl:justify-end">
                  <span className="text-xs font-medium text-muted-foreground">{filtered.length} hasil</span>
                  {hasFilters && <Button variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <TransactionTable
              data={filtered}
              canManage={canManageTransactions}
              busyId={busyId}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          </Card>
        </>
      )}

      <TransactionEditSheet
        transaction={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={handleSaved}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && !busyId && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <IconTrash aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Hapus transaksi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? deleting.category + ' sebesar ' + formatRupiah(deleting.amount) + ' akan dihapus dari kas.'
                : 'Transaksi akan dihapus.'}
              {(deleting?.evidenceFileId || deleting?.bankMutationFileId)
                ? ' Dokumen yang sudah tersimpan di Google Drive tetap dipertahankan untuk audit.'
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busyId)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={Boolean(busyId)}
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
            >
              {busyId ? 'Menghapus...' : 'Hapus transaksi'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
