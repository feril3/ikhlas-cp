import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconEdit,
  IconFileText,
  IconRefresh,
  IconTrash,
  IconX
} from '@/components/icons.jsx';
import { toast } from 'sonner';
import { api } from '@/lib/api.js';
import { formatDate, formatDateTime, formatRupiah } from '@/lib/format.js';
import { useApprovalCounts } from '@/features/approvals/ApprovalCountsContext.jsx';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FileUploadField } from '@/features/transactions/FileUploadField.jsx';
import { cn } from '@/lib/utils';

const actionLabels = {
  CREATE: 'Transaksi baru',
  UPDATE: 'Perubahan transaksi',
  DELETE: 'Penghapusan transaksi'
};

const STATUS = {
  PENDING_REVIEW: { label: 'Menunggu review', variant: 'warning' },
  REVISION_REQUIRED: { label: 'Perlu revisi', variant: 'destructive' },
  APPROVED: { label: 'Disetujui', variant: 'success' }
};

function StatusBadge({ status }) {
  const item = STATUS[status] ?? STATUS.APPROVED;
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

function isImage(name, mime) {
  return (mime ?? '').startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(name ?? '');
}

// Pratinjau dokumen pengajuan. Foto tampil langsung; PDF dibuka di tab baru.
function Attachments({ request, large = false }) {
  const proposal = request.proposal ?? {};
  const docs = [
    proposal.evidenceFileId && { kind: 'evidence', label: 'Buka bukti', name: proposal.evidenceOriginalName, mime: proposal.evidenceMimeType },
    proposal.bankMutationFileId && { kind: 'mutation', label: 'Buka mutasi', name: proposal.bankMutationOriginalName, mime: proposal.bankMutationMimeType }
  ].filter(Boolean);
  if (docs.length === 0) return null;

  return (
    <div className={cn('flex gap-2', large ? 'flex-col' : 'flex-row')}>
      {docs.map((doc) => {
        const url = api.approvalAttachmentUrl(request.id, doc.kind);
        return isImage(doc.name, doc.mime) ? (
          <a key={doc.kind} href={url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-xl bg-muted" aria-label={`${doc.label} (membuka tab baru)`}>
            <img src={url} alt={doc.label} loading="lazy" className={cn('object-cover', large ? 'max-h-80 w-full' : 'size-14')} />
            {large && <span className="absolute bottom-2 left-2 rounded-full bg-inverse px-2.5 py-1 text-xs font-medium text-inverse-foreground">{doc.label}</span>}
          </a>
        ) : (
          <a key={doc.kind} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
            <IconFileText /> {doc.label}
          </a>
        );
      })}
    </div>
  );
}

function ProposalSummary({ request }) {
  const proposal = request.proposal ?? {};
  const rows = [
    ['Tanggal', proposal.transactionDate ? formatDate(proposal.transactionDate, { day: 'numeric', month: 'long' }) : '—'],
    ['Kategori', proposal.category ?? '—'],
    ['Metode', proposal.method === 'TRANSFER' ? 'Transfer' : 'Tunai'],
    ['Keterangan', proposal.description || '—']
  ];
  return (
    <div className="grid gap-3">
      <div>
        <span className="text-xs text-muted-foreground">{proposal.type === 'EXPENSE' ? 'Kas keluar' : 'Kas masuk'}</span>
        <p className="text-3xl font-bold tracking-tight tabular-nums">{formatRupiah(proposal.amount ?? 0)}</p>
      </div>
      <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <Attachments request={request} large />
    </div>
  );
}

function TransactionComparison({ request }) {
  const before = request.currentTransaction ?? {};
  const after = request.proposal ?? {};
  const rows = [
    ['Nominal', formatRupiah(before.amount ?? 0), formatRupiah(after.amount ?? 0)],
    ['Tanggal', before.transactionDate ?? '—', after.transactionDate ?? '—'],
    ['Kategori', before.category ?? '—', after.category ?? '—'],
    ['Metode', before.method === 'TRANSFER' ? 'Transfer' : 'Tunai', after.method === 'TRANSFER' ? 'Transfer' : 'Tunai'],
    ['Keterangan', before.description || '—', after.description || '—']
  ].filter(([, current, proposed]) => String(current) !== String(proposed));

  return (
    <div className="grid gap-4">
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl bg-muted">
          <div className="grid grid-cols-[88px_1fr_1fr] gap-2 px-3 py-2 text-xs text-muted-foreground">
            <span>Data</span><span>Saat ini</span><span>Usulan</span>
          </div>
          {rows.map(([label, current, proposed]) => (
            <div key={label} className="grid grid-cols-[88px_1fr_1fr] gap-2 border-t border-border px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="min-w-0 break-words text-subtle-foreground line-through">{current}</span>
              <span className="min-w-0 break-words font-semibold">{proposed}</span>
            </div>
          ))}
        </div>
      )}
      <ProposalSummary request={request} />
    </div>
  );
}

function ReviewDialog({ request, open, onOpenChange, onDone }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (open) setNote('');
  }, [open, request?.id]);

  async function review(decision) {
    if (!request) return;
    if (decision === 'REVISION_REQUIRED' && note.trim().length < 3) {
      toast.error('Tulis catatan revisi dulu.', { description: 'Catatan membantu Bendahara tahu apa yang perlu diperbaiki.' });
      return;
    }

    setBusy(decision);
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
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review pengajuan</DialogTitle>
          <DialogDescription>
            {request ? `${actionLabels[request.action]} dari ${request.submittedByName} · ${formatDateTime(request.submittedAt)}` : ''}
          </DialogDescription>
        </DialogHeader>

        {request && (
          request.action === 'UPDATE' && request.currentTransaction
            ? <TransactionComparison request={request} />
            : <ProposalSummary request={request} />
        )}

        <Field>
          <FieldLabel htmlFor="review-note">Catatan Ketua</FieldLabel>
          <Textarea
            id="review-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Wajib diisi jika meminta revisi"
            rows={3}
            maxLength={500}
          />
        </Field>

        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
          <Button type="button" variant="secondary" size="lg" disabled={Boolean(busy)} onClick={() => review('REVISION_REQUIRED')}>
            <IconX /> {busy === 'REVISION_REQUIRED' ? 'Mengirim…' : 'Minta revisi'}
          </Button>
          <Button type="button" size="lg" disabled={Boolean(busy)} onClick={() => review('APPROVE')}>
            <IconCheck /> {busy === 'APPROVE' ? 'Memproses…' : 'Approve & posting'}
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
  const [evidence, setEvidence] = useState(null);
  const [mutation, setMutation] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!request || !open) return;
    setEvidence(null);
    setMutation(null);
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

      if (evidence || mutation) {
        await api.uploadApprovalAttachments(request.id, { evidence, mutation });
      }
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
          <DialogDescription>Perbaiki sesuai catatan Ketua, lalu kirim ulang untuk direview.</DialogDescription>
        </DialogHeader>

        {request?.reviewNote && (
          <p className="rounded-xl bg-destructive-subtle px-3 py-2.5 text-sm text-destructive">
            <span className="font-semibold">Catatan Ketua:</span> {request.reviewNote}
          </p>
        )}

        {request?.action === 'DELETE' ? (
          <ProposalSummary request={request} />
        ) : form ? (
          <form id="approval-revision-form" className="grid gap-4" onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="revision-amount">Nominal</FieldLabel>
                <Input id="revision-amount" type="number" inputMode="numeric" min="1" value={form.amount} onChange={(event) => update('amount', event.target.value)} required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="revision-date">Tanggal</FieldLabel>
                  <Input id="revision-date" type="date" value={form.transactionDate} onChange={(event) => update('transactionDate', event.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel>Kategori</FieldLabel>
                  <Select value={form.categoryId} onValueChange={(value) => update('categoryId', value)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
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
                  className="grid w-full grid-cols-2"
                >
                  <ToggleGroupItem value="CASH">Tunai</ToggleGroupItem>
                  <ToggleGroupItem value="TRANSFER">Transfer</ToggleGroupItem>
                </ToggleGroup>
              </Field>
              {form.type === 'INCOME' && (
                <Field>
                  <FieldLabel htmlFor="revision-source">Detail sumber dana</FieldLabel>
                  <Input id="revision-source" value={form.sourceDetail} onChange={(event) => update('sourceDetail', event.target.value)} maxLength={120} />
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="revision-description">Keterangan</FieldLabel>
                <Textarea id="revision-description" value={form.description} onChange={(event) => update('description', event.target.value)} rows={3} maxLength={300} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <FileUploadField label="Ganti bukti" description="Opsional · maks. 4 MB" current={proposal.evidenceOriginalName} file={evidence} onChange={setEvidence} />
                <FileUploadField label="Ganti mutasi" description="Opsional · maks. 4 MB" current={proposal.bankMutationOriginalName} file={mutation} onChange={setMutation} />
              </div>
            </FieldGroup>
          </form>
        ) : null}

        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
          <Button type="button" variant="secondary" size="lg" onClick={() => onOpenChange(false)} disabled={busy}>Batal</Button>
          <Button
            type={request?.action === 'DELETE' ? 'button' : 'submit'}
            form={request?.action === 'DELETE' ? undefined : 'approval-revision-form'}
            size="lg"
            disabled={busy}
            onClick={request?.action === 'DELETE' ? submit : undefined}
          >
            <IconRefresh /> {busy ? 'Mengirim…' : 'Kirim ulang'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestCard({ request, role, onOpen }) {
  const proposal = request.proposal ?? {};
  const actionable = (role === 'ADMIN' && request.status === 'PENDING_REVIEW') || (role === 'TREASURER' && request.status === 'REVISION_REQUIRED');
  const income = proposal.type === 'INCOME';
  const Icon = request.action === 'DELETE' ? IconTrash : income ? IconArrowDown : IconArrowUp;

  return (
    <li>
      <div className="flex w-full items-start gap-3 rounded-2xl bg-card p-4 shadow-card">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-foreground"><Icon className="size-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold">{actionLabels[request.action]}</span>
            <StatusBadge status={request.status} />
          </span>
          <span className="mt-1 block text-xl font-bold tracking-tight tabular-nums">{formatRupiah(proposal.amount ?? 0)}</span>
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">
            {[proposal.category, income ? 'Kas masuk' : 'Kas keluar'].filter(Boolean).join(' · ')}
          </span>
          <span className="mt-0.5 block text-xs text-subtle-foreground">{request.submittedByName} · {formatDateTime(request.submittedAt)}</span>
          {request.reviewNote && request.status === 'REVISION_REQUIRED' && (
            <span className="mt-2 block rounded-xl bg-destructive-subtle px-3 py-2 text-sm text-destructive">Catatan Ketua: {request.reviewNote}</span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-2">
          <Attachments request={request} />
          {actionable && (
            <Button size="sm" onClick={() => onOpen(request)}>
              {role === 'ADMIN' ? <><IconCheck /> Review</> : <><IconEdit /> Perbaiki</>}
            </Button>
          )}
        </span>
      </div>
    </li>
  );
}

// Daftar pengajuan: Ketua/Admin melihat semua pengajuan Bendahara, Bendahara melihat pengajuannya sendiri.
export function TransactionApprovalPanel({ user, onChanged }) {
  const role = user?.role;
  const [searchParams, setSearchParams] = useSearchParams();
  const { refresh: refreshCounts } = useApprovalCounts();
  const [requests, setRequests] = useState(null);
  const [filter, setFilter] = useState(role === 'ADMIN' ? 'PENDING_REVIEW' : 'ACTIVE');
  const [reviewing, setReviewing] = useState(null);
  const [revising, setRevising] = useState(null);

  async function load() {
    try {
      const result = await api.transactionApprovals();
      setRequests(result.data);
    } catch (error) {
      setRequests((current) => current ?? []);
      toast.error('Daftar pengajuan gagal dimuat.', { description: error.message });
    }
  }

  useEffect(() => { load(); }, []);

  // Dibuka dari notifikasi: /approvals?id=12 langsung membuka pengajuan tersebut.
  useEffect(() => {
    const id = Number(searchParams.get('id'));
    if (!id || !requests) return;
    const target = requests.find((item) => item.id === id);
    if (target) open(target);
    searchParams.delete('id');
    setSearchParams(searchParams, { replace: true });
  }, [requests]);

  const counts = useMemo(() => {
    const list = requests ?? [];
    return {
      PENDING_REVIEW: list.filter((item) => item.status === 'PENDING_REVIEW').length,
      REVISION_REQUIRED: list.filter((item) => item.status === 'REVISION_REQUIRED').length,
      APPROVED: list.filter((item) => item.status === 'APPROVED').length
    };
  }, [requests]);

  const visible = useMemo(() => {
    const list = requests ?? [];
    if (filter === 'ACTIVE') return list.filter((item) => item.status !== 'APPROVED');
    return list.filter((item) => item.status === filter).slice(0, filter === 'APPROVED' ? 20 : undefined);
  }, [filter, requests]);

  function open(request) {
    if (role === 'ADMIN' && request.status === 'PENDING_REVIEW') setReviewing(request);
    if (role === 'TREASURER' && request.status === 'REVISION_REQUIRED') setRevising(request);
  }

  async function refreshed() {
    await Promise.all([load(), onChanged?.(), refreshCounts()]);
  }

  const filters = role === 'ADMIN'
    ? [['PENDING_REVIEW', 'Menunggu'], ['REVISION_REQUIRED', 'Perlu revisi'], ['APPROVED', 'Disetujui']]
    : [['ACTIVE', 'Aktif'], ['REVISION_REQUIRED', 'Perlu revisi'], ['APPROVED', 'Disetujui']];
  const emptyCopy = {
    PENDING_REVIEW: 'Tidak ada pengajuan yang perlu direview. Pengajuan baru dari Bendahara akan muncul di sini.',
    REVISION_REQUIRED: role === 'ADMIN' ? 'Tidak ada pengajuan yang sedang direvisi Bendahara.' : 'Tidak ada pengajuan yang perlu Anda perbaiki.',
    APPROVED: 'Belum ada pengajuan yang disetujui.',
    ACTIVE: 'Belum ada pengajuan aktif. Catat transaksi dari tombol + di bawah.'
  };

  return (
    <section aria-label={role === 'ADMIN' ? 'Review Transaksi' : 'Pengajuan Saya'} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <ToggleGroup type="single" value={filter} onValueChange={(value) => value && setFilter(value)} className="max-w-full overflow-x-auto">
          {filters.map(([value, label]) => {
            const count = value === 'ACTIVE' ? counts.PENDING_REVIEW + counts.REVISION_REQUIRED : counts[value];
            return (
              <ToggleGroupItem key={value} value={value}>
                {label}{value !== 'APPROVED' && count > 0 ? <span className="tabular-nums opacity-70">{count}</span> : null}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
        <Button variant="ghost" size="icon" onClick={load} aria-label="Muat ulang daftar"><IconRefresh /></Button>
      </div>

      {requests === null ? (
        <div className="grid gap-3"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div>
      ) : visible.length === 0 ? (
        <Card className="px-5 py-10 text-center text-sm text-muted-foreground">{emptyCopy[filter]}</Card>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {visible.map((request) => <RequestCard key={request.id} request={request} role={role} onOpen={open} />)}
        </ul>
      )}

      <ReviewDialog request={reviewing} open={Boolean(reviewing)} onOpenChange={(value) => !value && setReviewing(null)} onDone={refreshed} />
      <RevisionDialog request={revising} open={Boolean(revising)} onOpenChange={(value) => !value && setRevising(null)} onDone={refreshed} />
    </section>
  );
}
