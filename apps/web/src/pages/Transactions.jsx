import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconArrowDown,
  IconArrowUp,
  IconSearch,
  IconTrash
} from '@/components/icons.jsx';
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
import { useActionCount } from '@/features/approvals/ApprovalCountsContext.jsx';
import { TransactionEditSheet } from '@/features/transactions/TransactionEditSheet.jsx';
import { TransactionTable } from '@/features/transactions/TransactionTable.jsx';

function Metric({ label, value, tone = 'default', caption }) {
  const valueClass = tone === 'income'
    ? 'text-success'
    : tone === 'expense'
      ? 'text-destructive'
      : 'text-foreground';

  return (
    <div className="min-w-0 bg-card px-4 py-3.5 sm:px-5 sm:py-4">
      <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>
      <strong className={'mt-1 block truncate text-md font-bold tracking-tight tabular-nums sm:text-2xl ' + valueClass}>
        {value}
      </strong>
      {caption && <span className="mt-0.5 hidden text-xs text-subtle-foreground sm:block">{caption}</span>}
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
  const actionCount = useActionCount();

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
  const [showFilters, setShowFilters] = useState(false);

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

  async function handleSaved(result) {
    await loadTransactions();
    if (result?.approvalRequired) {
      toast.success('Perubahan dikirim ke Ketua untuk direview.', {
        description: 'Nilai transaksi yang sudah terposting belum berubah sampai approval selesai.'
      });
    } else {
      toast.success('Transaksi berhasil diperbarui.');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;

    setBusyId(deleting.id);
    try {
      const result = await api.deleteTransaction(deleting.id);
      await loadTransactions();
      if (result?.approvalRequired) {
        toast.success('Penghapusan dikirim ke Ketua untuk direview.', {
          description: 'Transaksi tetap terposting sampai penghapusan disetujui.'
        });
      } else {
        toast.success('Transaksi berhasil dihapus.', {
          description: deleting.evidenceFileId || deleting.bankMutationFileId
            ? 'Dokumen Google Drive dipertahankan untuk audit.'
            : undefined
        });
      }
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
        title="Transaksi"
        description="Cari, ubah, dan telusuri kas masuk maupun kas keluar."
        actions={canManageTransactions ? (
          <div className="hidden gap-2 lg:flex">
            <Button variant="secondary" asChild>
              <Link to="/transactions/income"><IconArrowDown /> Catat kas masuk</Link>
            </Button>
            <Button asChild>
              <Link to="/transactions/expense"><IconArrowUp /> Catat kas keluar</Link>
            </Button>
          </div>
        ) : null}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data && (
        <>
          {actionCount > 0 && (
            <Link
              to="/approvals"
              className="flex items-center justify-between gap-3 rounded-2xl bg-warning-subtle px-4 py-3 text-sm text-warning transition-opacity duration-(--duration-fast) hover:opacity-90"
            >
              <span>
                <span className="font-semibold">{actionCount} pengajuan</span>{' '}
                {user?.role === 'ADMIN' ? 'menunggu review Anda.' : 'perlu Anda perbaiki.'}
              </span>
              <span className="shrink-0 font-semibold">{user?.role === 'ADMIN' ? 'Review sekarang' : 'Perbaiki'}</span>
            </Link>
          )}

          <Card className="overflow-hidden">
            <div className="grid grid-cols-2 gap-px bg-border xl:grid-cols-4">
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
                <InputGroup className="h-(--control-height)">
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
                  <ToggleGroupItem value="ALL" className="w-full xl:w-auto">Semua</ToggleGroupItem>
                  <ToggleGroupItem value="INCOME" className="w-full xl:w-auto">Kas masuk</ToggleGroupItem>
                  <ToggleGroupItem value="EXPENSE" className="w-full xl:w-auto">Kas keluar</ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 md:hidden">
                <Button variant="secondary" size="sm" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters}>
                  {showFilters ? 'Sembunyikan filter' : 'Filter metode, kategori, tanggal'}
                </Button>
                <span className="text-xs text-muted-foreground">{filtered.length} hasil</span>
              </div>

              <div className={`mt-4 gap-3 border-t pt-4 md:grid md:grid-cols-2 xl:grid-cols-[minmax(150px,.8fr)_minmax(180px,1fr)_minmax(150px,.75fr)_minmax(150px,.75fr)_auto] xl:items-end ${showFilters ? 'grid' : 'hidden'}`}>
                <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                  Metode
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="h-(--control-height) w-full">
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
                    <SelectTrigger className="h-(--control-height) w-full">
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
                  <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-(--control-height)" />
                </label>

                <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                  Sampai
                  <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-(--control-height)" />
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
              {busyId ? 'Memproses...' : user?.role === 'TREASURER' ? 'Ajukan penghapusan' : 'Hapus transaksi'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
