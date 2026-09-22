import { useEffect, useState } from 'react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { api } from '@/lib/api.js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

export function TransactionEditSheet({ transaction, open, onOpenChange, onSaved }) {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  useEffect(() => {
    if (!transaction || !open) return undefined;
    const income = transaction.type === 'INCOME';
    setForm({
      amount: String(transaction.amount ?? ''),
      transactionDate: transaction.transactionDate,
      method: transaction.method,
      categoryId: String(transaction.categoryId ?? ''),
      sourceDetail: income ? (transaction.sourceDetail ?? '') : '',
      description: transaction.description ?? ''
    });
    setStatus({ type: 'loading', message: 'Memuat kategori...' });

    let cancelled = false;
    api.transactionCategories(transaction.type)
      .then((result) => {
        if (cancelled) return;
        setCategories(result.data.filter((item) => item.isActive || Number(item.id) === Number(transaction.categoryId)));
        setStatus({ type: 'idle', message: '' });
      })
      .catch((error) => {
        if (!cancelled) setStatus({ type: 'error', message: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [transaction, open]);

  if (!transaction || !form) return null;
  const income = transaction.type === 'INCOME';

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
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
      await onSaved?.();
      onOpenChange(false);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit {income ? 'Kas Masuk' : 'Kas Keluar'}</SheetTitle>
          <SheetDescription>Jenis transaksi tetap. Perubahan nilai dicatat sebagai before/after di audit trail.</SheetDescription>
        </SheetHeader>

        <form id="transaction-edit-form" className="flex flex-1 flex-col gap-5 px-5 pb-5" onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-amount">Nominal</FieldLabel>
              <Input id="edit-amount" type="number" min="1" max="9999999999" inputMode="numeric" value={form.amount} onChange={(event) => update('amount', event.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-date">Tanggal transaksi</FieldLabel>
              <Input id="edit-date" type="date" value={form.transactionDate} onChange={(event) => update('transactionDate', event.target.value)} required />
            </Field>
            <Field>
              <FieldLabel>Metode</FieldLabel>
              <Select value={form.method} onValueChange={(value) => update('method', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="CASH">Tunai</SelectItem>
                    <SelectItem value="TRANSFER">Transfer Bank</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Kategori</FieldLabel>
              <Select value={form.categoryId} onValueChange={(value) => update('categoryId', value)}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            {income && (
              <Field>
                <FieldLabel htmlFor="edit-source">Detail sumber dana</FieldLabel>
                <Input id="edit-source" maxLength="120" value={form.sourceDetail} onChange={(event) => update('sourceDetail', event.target.value)} />
                <FieldDescription>Opsional. Gunakan hanya jika membantu rekonsiliasi.</FieldDescription>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="edit-description">Keterangan</FieldLabel>
              <Textarea id="edit-description" rows="4" maxLength="300" value={form.description} onChange={(event) => update('description', event.target.value)} />
            </Field>
          </FieldGroup>

          <Alert>
            <AlertDescription>Nilai lama dan baru disimpan ke audit trail. File bukti yang sudah terhubung tidak berubah dari form ini.</AlertDescription>
          </Alert>

          {status.message && status.type === 'error' && (
            <Alert variant="destructive"><AlertDescription>{status.message}</AlertDescription></Alert>
          )}
        </form>

        <SheetFooter className="sticky bottom-0 border-t bg-card">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button form="transaction-edit-form" disabled={status.type === 'loading' || !form.categoryId}>
            <IconDeviceFloppy data-icon="inline-start" />
            {status.type === 'loading' ? 'Menyimpan...' : 'Simpan perubahan'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
