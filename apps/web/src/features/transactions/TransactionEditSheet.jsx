import { useEffect, useState } from 'react';
import { IconDeviceFloppy, IconHistory } from '@tabler/icons-react';
import { api } from '@/lib/api.js';
import { formatRupiah } from '@/lib/format.js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export function TransactionEditSheet({ transaction, open, onOpenChange, onSaved }) {
  const income = transaction?.type === 'INCOME';
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  useEffect(() => {
    if (!transaction || !open) return undefined;

    let cancelled = false;
    setForm({
      amount: String(transaction.amount),
      transactionDate: transaction.transactionDate,
      method: transaction.method,
      categoryId: String(transaction.categoryId ?? ''),
      sourceDetail: transaction.sourceDetail ?? '',
      description: transaction.description ?? ''
    });
    setStatus({ type: 'loading', message: 'Memuat kategori transaksi...' });

    api.transactionCategories(transaction.type)
      .then((result) => {
        if (cancelled) return;
        const available = result.data.filter(
          (item) => item.isActive || Number(item.id) === Number(transaction.categoryId)
        );
        setCategories(available);
        setForm((current) => ({
          ...current,
          categoryId: current?.categoryId
            || String(available.find((item) => item.name === transaction.category)?.id ?? '')
        }));
        setStatus({ type: 'idle', message: '' });
      })
      .catch((error) => {
        if (!cancelled) setStatus({ type: 'error', message: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [transaction, open]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!transaction || !form) return;

    setStatus({ type: 'loading', message: 'Menyimpan perubahan...' });
    try {
      await api.updateTransaction(transaction.id, {
        amount: Number(form.amount),
        transactionDate: form.transactionDate,
        method: form.method,
        categoryId: Number(form.categoryId),
        sourceDetail: income ? form.sourceDetail : '',
        description: form.description
      });
      await onSaved();
      onOpenChange(false);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[min(96vw,560px)] flex-col overflow-hidden p-0">
        <SheetHeader className="border-b px-5 py-5 sm:px-6">
          <SheetTitle>Edit {income ? 'Kas Masuk' : 'Kas Keluar'}</SheetTitle>
          <SheetDescription>
            {transaction
              ? transaction.category + ' · ' + formatRupiah(transaction.amount)
              : 'Perbarui transaksi'}
          </SheetDescription>
        </SheetHeader>

        {form && (
          <form id="transaction-edit-form" onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-amount">Nominal</FieldLabel>
                <Input
                  id="edit-amount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="9999999999"
                  className="h-11"
                  value={form.amount}
                  onChange={(event) => update('amount', event.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-date">Tanggal transaksi</FieldLabel>
                <Input
                  id="edit-date"
                  type="date"
                  className="h-11"
                  value={form.transactionDate}
                  onChange={(event) => update('transactionDate', event.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel>Metode {income ? 'penerimaan' : 'pembayaran'}</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  spacing={0}
                  value={form.method}
                  onValueChange={(value) => value && update('method', value)}
                  className="grid w-full grid-cols-2"
                >
                  <ToggleGroupItem value="CASH" className="h-11 w-full rounded-r-none">Tunai</ToggleGroupItem>
                  <ToggleGroupItem value="TRANSFER" className="h-11 w-full rounded-l-none">Transfer</ToggleGroupItem>
                </ToggleGroup>
              </Field>

              <Field>
                <FieldLabel>Kategori</FieldLabel>
                <Select value={form.categoryId} onValueChange={(value) => update('categoryId', value)}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}{category.isActive ? '' : ' (nonaktif, transaksi lama)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {income && (
                <Field>
                  <FieldLabel htmlFor="edit-source">Detail sumber dana</FieldLabel>
                  <Input
                    id="edit-source"
                    className="h-11"
                    maxLength="120"
                    value={form.sourceDetail}
                    onChange={(event) => update('sourceDetail', event.target.value)}
                  />
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="edit-description">Keterangan</FieldLabel>
                <Textarea
                  id="edit-description"
                  rows={4}
                  maxLength="300"
                  className="min-h-28"
                  value={form.description}
                  onChange={(event) => update('description', event.target.value)}
                />
                <FieldDescription>{form.description.length}/300 karakter</FieldDescription>
              </Field>

              <div className="flex gap-3 rounded-lg border bg-muted/35 p-3 text-sm text-muted-foreground">
                <IconHistory aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="leading-5">
                  Nilai sebelum dan sesudah perubahan dicatat ke audit trail. Jenis kas masuk/keluar tidak dapat diubah.
                </p>
              </div>

              {status.type === 'error' && (
                <Alert variant="destructive">
                  <AlertDescription>{status.message}</AlertDescription>
                </Alert>
              )}
            </FieldGroup>
          </form>
        )}

        <SheetFooter className="border-t bg-muted/20 px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={status.type === 'loading'}>
            Batal
          </Button>
          <Button
            form="transaction-edit-form"
            type="submit"
            disabled={!form?.categoryId || status.type === 'loading'}
          >
            {status.type === 'loading' ? <Spinner /> : <IconDeviceFloppy aria-hidden="true" />}
            Simpan perubahan
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
