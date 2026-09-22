import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconArrowLeft,
  IconBuildingBank,
  IconCash,
  IconDeviceFloppy,
  IconInfoCircle
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { api } from '@/lib/api.js';
import { formatRupiah, toInputDate } from '@/lib/format.js';
import { PageHeader } from '@/components/app/PageHeader.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field';
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
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FileUploadField } from '@/features/transactions/FileUploadField.jsx';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function TransactionFormSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <Skeleton className="h-12 w-32" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-[520px] w-full" />
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

  useEffect(() => {
    let cancelled = false;
    setLoadingCategories(true);
    setStatus({ type: 'idle', message: '' });

    api.transactionCategories(type)
      .then((result) => {
        if (cancelled) return;
        const active = result.data.filter((item) => item.isActive);
        setCategories(active);
        setForm({
          transactionDate: toInputDate(),
          method: income ? 'CASH' : 'TRANSFER',
          categoryId: active[0]?.id ? String(active[0].id) : '',
          sourceDetail: '',
          description: ''
        });
        setAmountInput('');
        setEvidence(null);
        setMutation(null);
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
  }, [income, type]);

  const amount = useMemo(
    () => Number(amountInput.replace(/\D/g, '') || 0),
    [amountInput]
  );

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleMethod(value) {
    if (!value) return;
    update('method', value);
    if (value === 'CASH') setMutation(null);
  }

  function handleAmount(event) {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 10);
    setAmountInput(digits ? new Intl.NumberFormat('id-ID').format(Number(digits)) : '');
  }

  function acceptFile(file, setter) {
    if (!file) {
      setter(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Ukuran file terlalu besar.', { description: 'Maksimum 5 MB per dokumen.' });
      return;
    }

    setter(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!amount) {
      setStatus({ type: 'error', message: 'Nominal transaksi wajib diisi.' });
      return;
    }

    if (!form.categoryId) {
      setStatus({ type: 'error', message: 'Pilih kategori transaksi terlebih dahulu.' });
      return;
    }

    if (!income && !evidence) {
      setStatus({ type: 'error', message: 'Bukti transaksi wajib dilampirkan untuk kas keluar.' });
      return;
    }

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
        {
          evidence,
          mutation: form.method === 'TRANSFER' ? mutation : null
        }
      );

      if (created.notification?.status === 'failed') {
        toast.warning(income ? 'Kas masuk tersimpan.' : 'Kas keluar tersimpan.', {
          description: 'Notifikasi Telegram gagal dikirim.'
        });
      } else {
        toast.success(income ? 'Kas masuk berhasil dicatat.' : 'Kas keluar berhasil dicatat.');
      }

      navigate('/transactions');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
      toast.error('Transaksi gagal disimpan.', { description: error.message });
    }
  }

  if (loadingCategories) return <TransactionFormSkeleton />;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
          <IconArrowLeft data-icon="inline-start" aria-hidden="true" />
          Kembali
        </Button>
      </div>

      <PageHeader
        title={income ? 'Kas Masuk' : 'Kas Keluar'}
        description="Catat transaksi dengan kategori dan bukti yang mudah diverifikasi pengurus."
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Nominal transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="amount">Nominal</FieldLabel>
              <InputGroup className="h-14">
                <InputGroupAddon className="pl-4 text-base font-semibold text-foreground">Rp</InputGroupAddon>
                <InputGroupInput
                  id="amount"
                  value={amountInput}
                  onChange={handleAmount}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0"
                  className="h-14 text-xl font-semibold tracking-[-0.02em] sm:text-2xl"
                  aria-describedby="amount-preview"
                />
              </InputGroup>
              <FieldDescription id="amount-preview">
                {amount ? formatRupiah(amount) : 'Masukkan nominal tanpa pecahan desimal.'}
              </FieldDescription>
            </Field>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)] lg:items-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Informasi transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="transaction-date">Tanggal transaksi</FieldLabel>
                <Input
                  id="transaction-date"
                  type="date"
                  className="h-12"
                  value={form.transactionDate}
                  onChange={(event) => update('transactionDate', event.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel>Metode {income ? 'penerimaan' : 'pembayaran'}</FieldLabel>
                <ToggleGroup
                  type="single"
                  value={form.method}
                  onValueChange={handleMethod}
                  variant="outline"
                  spacing={0}
                  className="grid w-full grid-cols-2"
                >
                  <ToggleGroupItem value="CASH" className="h-12 w-full rounded-r-none">
                    <IconCash data-icon="inline-start" aria-hidden="true" />
                    Tunai
                  </ToggleGroupItem>
                  <ToggleGroupItem value="TRANSFER" className="h-12 w-full rounded-l-none">
                    <IconBuildingBank data-icon="inline-start" aria-hidden="true" />
                    Transfer
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>

              <Field>
                <FieldLabel>{income ? 'Sumber dana' : 'Kategori pengeluaran'}</FieldLabel>
                <Select value={form.categoryId} onValueChange={(value) => update('categoryId', value)}>
                  <SelectTrigger className="h-12 w-full">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>Kategori dikelola Admin dari Pengaturan Sistem.</FieldDescription>
              </Field>

              {income && (
                <Field>
                  <FieldLabel htmlFor="source-detail">Detail sumber dana</FieldLabel>
                  <Input
                    id="source-detail"
                    className="h-12"
                    value={form.sourceDetail}
                    onChange={(event) => update('sourceDetail', event.target.value)}
                    maxLength="120"
                    placeholder="Contoh: Donatur tetap, Kotak Amal Lt. 1"
                  />
                  <FieldDescription>
                    Opsional dan tidak ditampilkan pada Public Display.
                  </FieldDescription>
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="transaction-description">Keterangan</FieldLabel>
                <Textarea
                  id="transaction-description"
                  rows={4}
                  className="min-h-28"
                  value={form.description}
                  onChange={(event) => update('description', event.target.value)}
                  placeholder={income ? 'Contoh: Donasi setelah kajian Ahad' : 'Contoh: Pembelian perlengkapan kebersihan'}
                  maxLength="300"
                />
                <FieldDescription>{form.description.length}/300 karakter</FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

          <Card className="lg:sticky lg:top-20">
            <CardHeader className="pb-3">
              <CardTitle>Bukti pendukung</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <FileUploadField
              id="transaction-evidence"
              label="Bukti transaksi"
              description="JPG, PNG, WEBP, atau PDF · maks. 5 MB"
              file={evidence}
              onChange={(file) => acceptFile(file, setEvidence)}
              required={!income}
              capture="environment"
            />

            {form.method === 'TRANSFER' && (
              <FileUploadField
                id="bank-mutation"
                label="Mutasi rekening"
                description="Lampirkan mutasi bank jika tersedia · maks. 5 MB"
                file={mutation}
                onChange={(file) => acceptFile(file, setMutation)}
              />
            )}

            <div className="flex gap-3 rounded-lg bg-muted/45 p-3 text-xs leading-5 text-muted-foreground">
              <IconInfoCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>
                Dokumen disimpan privat di Google Drive. Aplikasi hanya menyimpan referensi file untuk mengaitkannya dengan transaksi.
              </p>
            </div>
          </CardContent>
          </Card>
        </div>

        {status.type === 'error' && (
          <Alert variant="destructive">
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}
        {status.type === 'loading' && (
          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <Spinner /> {status.message}
            </AlertDescription>
          </Alert>
        )}

        {categories.length === 0 && (
          <Alert variant="destructive">
            <AlertDescription>Belum ada kategori aktif untuk jenis transaksi ini. Tambahkan kategori dari Pengaturan Sistem.</AlertDescription>
          </Alert>
        )}

        <div className="sticky bottom-0 z-20 -mx-4 mt-1 flex gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 sm:h-10 sm:flex-none"
            onClick={() => navigate(-1)}
            disabled={status.type === 'loading'}
          >
            Batal
          </Button>
          <Button
            type="submit"
            className="h-12 flex-1 sm:h-10 sm:flex-none"
            disabled={status.type === 'loading' || categories.length === 0}
          >
            {status.type === 'loading' ? <Spinner /> : <IconDeviceFloppy data-icon="inline-start" aria-hidden="true" />}
            {status.type === 'loading' ? 'Memproses...' : 'Simpan transaksi'}
          </Button>
        </div>
      </form>
    </div>
  );
}
