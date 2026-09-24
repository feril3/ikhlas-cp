import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const emptyCategory = { type: 'INCOME', name: '', sortOrder: 50, isActive: true };

export function CategorySettings({ categories, api, reload }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyCategory);
  const [saving, setSaving] = useState(false);

  async function create(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.createTransactionCategory({ ...form, sortOrder: Number(form.sortOrder || 0) });
      toast.success('Kategori berhasil ditambahkan.');
      setForm(emptyCategory);
      setOpen(false);
      await reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(category) {
    try {
      await api.updateTransactionCategory(category.id, {
        type: category.type,
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: !category.isActive
      });
      toast.success(category.isActive ? 'Kategori dinonaktifkan.' : 'Kategori diaktifkan.');
      await reload();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-3 border-b bg-muted/25 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><h2 className="text-lg font-semibold">Kategori</h2><p className="mt-1 text-sm text-muted-foreground">Nonaktifkan kategori yang tidak dipakai lagi. Transaksi lama tetap tersimpan dan tetap dapat diaudit.</p></div>
        <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}><IconPlus />Tambah kategori</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Jenis</TableHead><TableHead>Urutan</TableHead><TableHead>Transaksi</TableHead><TableHead>Status</TableHead><TableHead className="w-32">Aksi</TableHead></TableRow></TableHeader>
        <TableBody>
          {categories.map((category) => <TableRow key={category.id}>
            <TableCell className="font-medium">{category.name}</TableCell>
            <TableCell>{category.type === 'INCOME' ? 'Kas Masuk' : 'Kas Keluar'}</TableCell>
            <TableCell>{category.sortOrder}</TableCell>
            <TableCell>
              <span className="text-sm font-medium">{category.transactionCount ?? 0}</span>
              <span className="ml-1 text-xs text-muted-foreground">tercatat</span>
            </TableCell>
            <TableCell><Badge variant={category.isActive ? 'success' : 'outline'}>{category.isActive ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
            <TableCell>
              <Button
                type="button"
                variant={category.isActive ? 'outline' : 'secondary'}
                size="sm"
                onClick={() => toggle(category)}
              >
                {category.isActive ? 'Nonaktifkan' : 'Aktifkan'}
              </Button>
            </TableCell>
          </TableRow>)}
          {categories.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Belum ada kategori.</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah kategori</DialogTitle><DialogDescription>Kategori aktif otomatis muncul pada form transaksi.</DialogDescription></DialogHeader>
          <form className="grid gap-5" onSubmit={create}>
            <FieldGroup>
              <Field><FieldLabel>Jenis</FieldLabel><Select value={form.type} onValueChange={(type) => setForm((x) => ({ ...x, type }))}><SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INCOME">Kas Masuk</SelectItem><SelectItem value="EXPENSE">Kas Keluar</SelectItem></SelectContent></Select></Field>
              <Field><FieldLabel>Nama kategori</FieldLabel><Input value={form.name} onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} required /></Field>
              <Field><FieldLabel>Urutan</FieldLabel><Input type="number" min="0" max="999" value={form.sortOrder} onChange={(e) => setForm((x) => ({ ...x, sortOrder: e.target.value }))} /></Field>
            </FieldGroup>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button disabled={saving}>{saving ? 'Menyimpan...' : 'Tambah kategori'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
