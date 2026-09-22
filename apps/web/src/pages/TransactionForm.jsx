import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconArrowLeft,
  IconBuildingBank,
  IconCamera,
  IconCash,
  IconFileDescription,
  IconPaperclip,
  IconTrash
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { api } from '@/lib/api.js';
import { formatRupiah, toInputDate } from '@/lib/format.js';
import { PageHeader } from '@/components/app/PageHeader.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

function UploadField({ label, description, file, onChange, onRemove, required = false, capture = undefined }) {
  return (
    <div className="rounded-md border border-dashed bg-muted/25 p-3">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <IconPaperclip className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <strong className="block text-sm font-semibold">{label}{required ? ' *' : ''}</strong>
          <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{description}</span>
          {file && (
            <div className="mt-2 flex items-center gap-2 rounded-md border bg-card px-2.5 py-2">
              <IconFileDescription className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{file.name}</span>
              <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Hapus ${file.name}`}>
                <IconTrash />
              </Button>
            </div>
          )}
        </div>
      </div>

      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted">
        <IconCamera className="size-4" />
        {file ? 'Ganti file' : 'Pilih file / kamera'}
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          capture={capture}
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

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
  const [errors, setErrors] = useState({ amount: '', category: '', evidence: '' });

  useEffect(() => {
    let cancelled = false;
    setLoadingCategories(true);
    api.transactionCategories(type)
      .then((result) => {
        if (cancelled) return;
        const active = result.data.filter((item) => item.isActive);
        setCategories(active);
        setForm((current) => ({
          ...current,
          method: income ? 'CASH' : 'TRANSFER',
          categoryId: active[0]?.id ? String(active[0].id) : ''
        }));
      })
      .catch((error) => {
        if (!cancelled) setStatus({ type: 'error', message: error.message });
      })
      .finally(() => {
        if (!cancelled) setLoadingCategories(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type, income]);

  const amount = useMemo(() => Number(amountInput.replace(/\D/g, '') || 0), [amountInput]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    if (name === 'categoryId') setErrors((current) => ({ ...current, category: '' }));
  }

  function handleAmount(event) {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 10);
    setAmountInput(digits ? new Intl.NumberFormat('id-ID').format(Number(digits)) : '');
    setErrors((current) => ({ ...current, amount: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {
      amount: amount ? '' : 'Nominal transaksi wajib diisi.',
      category: form.categoryId ? '' : 'Pilih kategori transaksi.',
      evidence: !income && !evidence ? 'Bukti transaksi wajib untuk kas keluar.' : ''
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) return;

    setStatus({
      type: 'loading',
      message: evidence || mutation
        ? 'Menyimpan transaksi dan mengunggah dokumen...'
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

      const notificationFailed = created.notification?.status === 'failed';
      toast[notificationFailed ? 'warning' : 'success'](
        `${income ? 'Kas masuk' : 'Kas keluar'} berhasil dicatat`,
        notificationFailed ? { description: 'Transaksi tersimpan, tetapi notifikasi Telegram gagal dikirim.' } : undefined
      );
      setStatus({ type: 'success', message: 'Transaksi berhasil disimpan.' });
      setTimeout(() => navigate('/transactions'), 450);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  if (loadingCategories) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-[360px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-24 sm:pb-0">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate(-1)}>
          <IconArrowLeft data-icon="inline-start" /> Kembali
        </Button>
        <PageHeader
          title={income ? 'Catat Kas Masuk' : 'Catat Kas Keluar'}
          description="Simpan transaksi dengan detail yang cukup untuk direkonsiliasi dan diaudit kembali."
        />
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Nominal transaksi</CardTitle>
            <CardDescription>Masukkan nominal rupiah tanpa angka desimal.</CardDescription>
          </CardHeader>
          <CardContent>
            <Field data-invalid={Boolean(errors.amount)}>
              <FieldLabel htmlFor="amount">Nominal</FieldLabel>
              <InputGroup className="min-h-16">
                <InputGroupAddon className="text-base text-primary">Rp</InputGroupAddon>
                <InputGroupInput
                  id="amount"
                  className="text-[clamp(1.75rem,5vw,2.35rem)] font-semibold tracking-[-0.04em] tabular-nums"
                  value={amountInput}
                  onChange={handleAmount}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0"
                  aria-invalid={Boolean(errors.amount)}
                />
              </InputGroup>
              <FieldDescription>{amount ? formatRupiah(amount) : 'Contoh: 2500000 menjadi Rp 2.500.000'}</FieldDescription>
              {errors.amount && <FieldError>{errors.amount}</FieldError>}
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detail transaksi</CardTitle>
            <CardDescription>Tanggal, metode, kategori, dan keterangan operasional.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="transaction-date">Tanggal transaksi</FieldLabel>
                <Input id="transaction-date" type="date" value={form.transactionDate} onChange={(event) => update('transactionDate', event.target.value)} required />
              </Field>

              <FieldSet>
                <FieldLegend>Metode {income ? 'penerimaan' : 'pembayaran'}</FieldLegend>
                <ToggleGroup
                  type="single"
                  value={form.method}
                  onValueChange={(value) => value && update('method', value)}
                  aria-label="Metode transaksi"
                >
                  <ToggleGroupItem value="CASH"><IconCash className="size-4" /> Tunai</ToggleGroupItem>
                  <ToggleGroupItem value="TRANSFER"><IconBuildingBank className="size-4" /> Transfer Bank</ToggleGroupItem>
                </ToggleGroup>
              </FieldSet>

              <Field data-invalid={Boolean(errors.category)}>
                <FieldLabel>{income ? 'Sumber dana' : 'Kategori pengeluaran'}</FieldLabel>
                <Select value={form.categoryId} onValueChange={(value) => update('categoryId', value)}>
                  <SelectTrigger aria-invalid={Boolean(errors.category)}><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>Kategori dikelola Admin dari Pengaturan.</FieldDescription>
                {errors.category && <FieldError>{errors.category}</FieldError>}
              </Field>

              {income && (
                <Field>
                  <FieldLabel htmlFor="source-detail">Detail sumber dana</FieldLabel>
                  <Input
                    id="source-detail"
                    value={form.sourceDetail}
                    onChange={(event) => update('sourceDetail', event.target.value)}
                    maxLength="120"
                    placeholder="Donatur tetap, Kotak Amal Lt. 1, Hamba Allah"
                  />
                  <FieldDescription>Opsional dan tidak ditampilkan di Public Display.</FieldDescription>
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="description">Keterangan</FieldLabel>
                <Textarea
                  id="description"
                  rows="4"
                  value={form.description}
                  onChange={(event) => update('description', event.target.value)}
                  placeholder={income ? 'Contoh: Donasi setelah kajian Ahad' : 'Contoh: Pembelian perlengkapan kebersihan'}
                  maxLength="300"
                />
                <FieldDescription className="text-right">{form.description.length}/300 karakter</FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Bukti pendukung</CardTitle>
              <CardDescription>Dokumen disimpan privat di Google Drive.</CardDescription>
            </div>
            {income && <Badge variant="outline">Opsional</Badge>}
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <UploadField
                label="Bukti transaksi"
                description="JPG, PNG, WEBP, atau PDF · maks. 5 MB"
                file={evidence}
                onChange={(file) => {
                  setEvidence(file);
                  if (file) setErrors((current) => ({ ...current, evidence: '' }));
                }}
                onRemove={() => setEvidence(null)}
                required={!income}
                capture="environment"
              />
              {errors.evidence && <FieldError className="mt-1.5 block">{errors.evidence}</FieldError>}
            </div>

            {form.method === 'TRANSFER' && (
              <UploadField
                label="Mutasi rekening"
                description="Lampirkan mutasi bila tersedia."
                file={mutation}
                onChange={setMutation}
                onRemove={() => setMutation(null)}
              />
            )}
          </CardContent>
        </Card>

        {status.type === 'error' && <Alert variant="destructive"><AlertDescription>{status.message}</AlertDescription></Alert>}
        {status.type === 'loading' && <Alert><AlertDescription>{status.message}</AlertDescription></Alert>}

        <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-[.75fr_1.25fr] gap-2 border-t bg-background/96 p-3 backdrop-blur sm:static sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Batal</Button>
          <Button type="submit" disabled={status.type === 'loading' || categories.length === 0}>
            {status.type === 'loading' ? 'Memproses...' : `Simpan ${income ? 'Kas Masuk' : 'Kas Keluar'}`}
          </Button>
        </div>
      </form>
    </div>
  );
}
