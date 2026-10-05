import { useEffect, useMemo, useState } from 'react';
import {
  IconCheck,
  IconClockHour4,
  IconEdit,
  IconRefresh,
  IconTrash,
  IconX
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { api } from '@/lib/api.js';
import { formatRupiah } from '@/lib/format.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const actionLabels = {
  CREATE: 'Transaksi baru',
  UPDATE: 'Perubahan transaksi',
  DELETE: 'Penghapusan transaksi'
};

function statusBadge(status) {
  if (status === 'PENDING_REVIEW') return <Badge variant="secondary">Menunggu review</Badge>;
  if (status === 'REVISION_REQUIRED') return <Badge variant="destructive">Perlu revisi</Badge>;
  return <Badge variant="success">Disetujui</Badge>;
}

function submittedTime(value) {
  if (!value) return '—';
  const date = new Date(value.replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function ProposalSummary({ request }) {
  const proposal = request.proposal ?? {};
  return (
    <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-2">
      <div><span className="block text-xs text-muted-foreground">Jenis</span><strong>{proposal.type === 'EXPENSE' ? 'Kas Keluar' : 'Kas Masuk'}</strong></div>
      <div><span className="block text-xs text-muted-foreground">Nominal</span><strong>{formatRupiah(proposal.amount ?? 0)}</strong></div>
      <div><span className="block text-xs text-muted-foreground">Tanggal</span><strong>{proposal.transactionDate ?? '—'}</strong></div>
      <div><span className="block text-xs text-muted-foreground">Kategori</span><strong>{proposal.category ?? '—'}</strong></div>
      <div><span className="block text-xs text-muted-foreground">Metode</span><strong>{proposal.method === 'TRANSFER' ? 'Transfer' : 'Tunai'}</strong></div>
      <div><span className="block text-xs text-muted-foreground">Keterangan</span><strong>{proposal.description || '—'}</strong></div>
    </div>
  );
}

function ReviewDialog({ request, open, onOpenChange, onDone }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setNote('');
  }, [open, request?.id]);

  async function review(decision) {
    if (!request) return;
    if (decision === 'REVISION_REQUIRED' && note.trim().length < 3) {
      toast.error('Catatan revisi wajib diisi.');
      return;
    }

    setBusy(true);
    try {
      await api.reviewTransactionApproval(request.id, { decision, note });
      toast.success(
        decision === 'APPROVE'
          ? 'Pengajuan disetujui dan sudah diposting.'
          : 'Pengajuan dikembalikan ke Bendahara untuk direvisi.'
      );
      onOpenChange(false);
      await onDone();
    } catch (error) {
      toast.error('Review gagal diproses.', { description: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review pengajuan transaksi</DialogTitle>
          <DialogDescription>
            {request ? `${actionLabels[request.action]} dari ${request.submittedByName}` : ''}
          </DialogDescription>
        </DialogHeader>

        {request && <ProposalSummary request={request} />}

        <Field>
          <FieldLabel>Catatan Ketua</FieldLabel>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Opsional untuk approval, wajib jika meminta revisi."
            rows={4}
            maxLength={500}
          />
        </Field>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => review('REVISION_REQUIRED')}>
            <IconX /> Minta revisi
          </Button>
          <Button type="button" disabled={busy} onClick={() => review('APPROVE')}>
            <IconCheck /> Approve & posting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RevisionDialog({ request, open, onOpenChange, onDone }) {
  const proposal = request?.proposal ?? {};
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!request || !open) return;
    setForm({
      type: proposal.type,
      amount: String(proposal.amount ?? ''),
      transactionDate: proposal.transactionDate ?? '',
      method: proposal.method ?? 'CASH',
      categoryId: String(proposal.categoryId ?? ''),
      sourceDetail: proposal.sourceDetail ?? '',
      description: proposal.description ?? ''
    });

    api.transactionCategories(proposal.type)
      .then((result) => {
        setCategories(result.data.filter((item) => item.isActive || Number(item.id) === Number(proposal.categoryId)));
      })
      .catch((error) => toast.error('Kategori gagal dimuat.', { description: error.message }));
  }, [open, request?.id]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!request) return;

    setBusy(true);
    try {
      const input = request.action === 'DELETE'
        ? {}
        : {
            ...(request.action === 'CREATE' ? { type: form.type } : {}),
            amount: Number(form.amount),
            transactionDate: form.transactionDate,
            method: form.method,
            categoryId: Number(form.categoryId),
            sourceDetail: form.type === 'INCOME' ? form.sourceDetail : '',
            description: form.description
          };

      await api.resubmitTransactionApproval(request.id, input);
      toast.success('Perbaikan dikirim ulang ke Ketua.');
      onOpenChange(false);
      await onDone();
    } catch (error) {
      toast.error('Pengajuan ulang gagal.', { description: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{request?.action === 'DELETE' ? 'Ajukan ulang penghapusan' : 'Perbaiki pengajuan'}</DialogTitle>
          <DialogDescription>{request?.reviewNote || 'Perbaiki data lalu kirim ulang untuk review.'}</DialogDescription>
        </DialogHeader>

        {request?.action === 'DELETE' ? (
          <ProposalSummary request={request} />
        ) : form ? (
          <form id="approval-revision-form" className="grid gap-4" onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel>Nominal</FieldLabel>
                <Input type="number" min="1" value={form.amount} onChange={(event) => update('amount', event.target.value)} required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Tanggal</FieldLabel>
                  <Input type="date" value={form.transactionDate} onChange={(event) => update('transactionDate', event.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel>Kategori</FieldLabel>
                  <Select value={form.categoryId} onValueChange={(value) => update('categoryId', value)}>
                    <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field>
                <FieldLabel>Metode</FieldLabel>
                <ToggleGroup
                  type="single"
                  value={form.method}
                  onValueChange={(value) => value && update('method', value)}
                  variant="outline"
                  spacing={0}
                  className="grid w-full grid-cols-2"
                >
                  <ToggleGroupItem value="CASH" className="rounded-r-none">Tunai</ToggleGroupItem>
                  <ToggleGroupItem value="TRANSFER" className="rounded-l-none">Transfer</ToggleGroupItem>
                </ToggleGroup>
              </Field>
              {form.type === 'INCOME' && (
                <Field>
                  <FieldLabel>Detail sumber dana</FieldLabel>
                  <Input value={form.sourceDetail} onChange={(event) => update('sourceDetail', event.target.value)} maxLength={120} />
                </Field>
              )}
              <Field>
                <FieldLabel>Keterangan</FieldLabel>
                <Textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows={3} maxLength={300} />
              </Field>
            </FieldGroup>
          </form>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Batal</Button>
          <Button
            type={request?.action === 'DELETE' ? 'button' : 'submit'}
            form={request?.action === 'DELETE' ? undefined : 'approval-revision-form'}
            disabled={busy}
            onClick={request?.action === 'DELETE' ? submit : undefined}
          >
            <IconRefresh /> Kirim ulang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TransactionApprovalPanel({ user, onChanged }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [revising, setRevising] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const result = await api.transactionApprovals();
      setRequests(result.data);
    } catch (error) {
      toast.error('Daftar approval gagal dimuat.', { description: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const active = requests.filter((item) => item.status !== 'APPROVED');
    const approved = requests.filter((item) => item.status === 'APPROVED').slice(0, 4);
    return [...active, ...approved];
  }, [requests]);

  async function refreshed() {
    await Promise.all([load(), onChanged?.()]);
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b bg-muted/25 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-semibold">{user?.role === 'ADMIN' ? 'Review Transaksi' : 'Pengajuan Saya'}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {user?.role === 'ADMIN'
                ? 'Review pengajuan Bendahara sebelum perubahan masuk ke saldo, laporan, dan Public Display.'
                : 'Perubahan Bendahara baru diposting setelah disetujui Ketua/Admin.'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}><IconRefresh /> Refresh</Button>
        </div>

        <div className="divide-y">
          {visible.map((request) => (
            <div key={request.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm">{actionLabels[request.action]}</strong>
                  {statusBadge(request.status)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {request.submittedByName} · {submittedTime(request.submittedAt)}
                  {request.proposal?.amount ? ' · ' + formatRupiah(request.proposal.amount) : ''}
                  {request.proposal?.category ? ' · ' + request.proposal.category : ''}
                </p>
                {request.reviewNote && (
                  <p className="mt-2 rounded-md bg-destructive/5 px-2.5 py-2 text-xs text-destructive">
                    Catatan Ketua: {request.reviewNote}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 gap-2">
                {user?.role === 'ADMIN' && request.status === 'PENDING_REVIEW' && (
                  <Button size="sm" onClick={() => setReviewing(request)}>
                    <IconCheck /> Review
                  </Button>
                )}
                {user?.role === 'TREASURER' && request.status === 'REVISION_REQUIRED' && (
                  <Button size="sm" onClick={() => setRevising(request)}>
                    <IconEdit /> Perbaiki
                  </Button>
                )}
                {request.status === 'PENDING_REVIEW' && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <IconClockHour4 className="size-4" /> Menunggu
                  </span>
                )}
                {request.action === 'DELETE' && request.status === 'APPROVED' && <IconTrash className="size-4 text-muted-foreground" />}
              </div>
            </div>
          ))}

          {!loading && visible.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              {user?.role === 'ADMIN' ? 'Tidak ada pengajuan transaksi yang perlu direview.' : 'Belum ada pengajuan transaksi.'}
            </div>
          )}
        </div>
      </Card>

      <ReviewDialog request={reviewing} open={Boolean(reviewing)} onOpenChange={(open) => !open && setReviewing(null)} onDone={refreshed} />
      <RevisionDialog request={revising} open={Boolean(revising)} onOpenChange={(open) => !open && setRevising(null)} onDone={refreshed} />
    </>
  );
}
