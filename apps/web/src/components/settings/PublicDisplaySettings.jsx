import { useEffect, useState } from 'react';
import { IconDots, IconPlus, IconTrash } from '@tabler/icons-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

const empty = { kind: 'VERSE', title: '', content: '', source: '', sortOrder: 50, isActive: true };

export function PublicDisplaySettings({ messages, api, reload }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editing ? {
      kind: editing.kind,
      title: editing.title ?? '',
      content: editing.content ?? '',
      source: editing.source ?? '',
      sortOrder: editing.sortOrder ?? 0,
      isActive: Boolean(editing.isActive)
    } : empty);
  }, [editing, open]);

  function add() { setEditing(null); setOpen(true); }
  function edit(message) { setEditing(message); setOpen(true); }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const input = { ...form, sortOrder: Number(form.sortOrder || 0) };
      if (editing) await api.updatePublicMessage(editing.id, input);
      else await api.createPublicMessage(input);
      toast.success(editing ? 'Konten Public Display diperbarui.' : 'Konten Public Display ditambahkan.');
      setOpen(false);
      await reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(message) {
    try {
      await api.updatePublicMessage(message.id, {
        kind: message.kind, title: message.title ?? '', content: message.content,
        source: message.source ?? '', sortOrder: message.sortOrder, isActive: !message.isActive
      });
      toast.success(message.isActive ? 'Konten dinonaktifkan.' : 'Konten diaktifkan.');
      await reload();
    } catch (error) { toast.error(error.message); }
  }

  async function remove() {
    if (!deleteTarget) return;
    try {
      await api.deletePublicMessage(deleteTarget.id);
      toast.success('Konten Public Display dihapus.');
      setDeleteTarget(null);
      await reload();
    } catch (error) { toast.error(error.message); }
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-3 border-b bg-muted/25 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><h2 className="text-lg font-semibold">Public Display</h2><p className="mt-1 text-sm text-muted-foreground">Kelola running text, pengumuman, dan pesan yang tampil ke jamaah.</p></div>
        <Button className="w-full sm:w-auto" onClick={add}><IconPlus />Tambah konten</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Judul</TableHead><TableHead>Isi singkat</TableHead><TableHead>Sumber</TableHead><TableHead>Urutan</TableHead><TableHead>Status</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
        <TableBody>
          {messages.map((message) => <TableRow key={message.id}>
            <TableCell className="font-medium">{message.title || (message.kind === 'VERSE' ? 'Ayat / Hadits' : message.kind === 'ANNOUNCEMENT' ? 'Pengumuman' : 'Pesan')}</TableCell>
            <TableCell className="max-w-[340px] truncate">{message.content}</TableCell>
            <TableCell>{message.source || '—'}</TableCell>
            <TableCell>{message.sortOrder}</TableCell>
            <TableCell><Badge variant={message.isActive ? 'success' : 'outline'}>{message.isActive ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
            <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><IconDots /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => edit(message)}>Edit</DropdownMenuItem><DropdownMenuItem onSelect={() => toggle(message)}>{message.isActive ? 'Nonaktifkan' : 'Aktifkan'}</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={() => setDeleteTarget(message)}><IconTrash />Hapus</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
          </TableRow>)}
          {messages.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Belum ada konten Public Display.</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? 'Edit konten' : 'Tambah konten'}</SheetTitle><SheetDescription>Konten aktif dapat tampil bergulir pada Public Display.</SheetDescription></SheetHeader>
          <form className="flex flex-1 flex-col gap-5 px-5 pb-5" onSubmit={save}>
            <FieldGroup>
              <Field><FieldLabel>Jenis</FieldLabel><Select value={form.kind} onValueChange={(kind) => setForm((x) => ({ ...x, kind }))}><SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="VERSE">Ayat / Hadits</SelectItem><SelectItem value="ANNOUNCEMENT">Pengumuman</SelectItem><SelectItem value="MESSAGE">Pesan Masjid</SelectItem></SelectContent></Select></Field>
              <Field><FieldLabel>Judul</FieldLabel><Input value={form.title} onChange={(e) => setForm((x) => ({ ...x, title: e.target.value }))} /></Field>
              <Field><FieldLabel>Isi</FieldLabel><Textarea rows={5} maxLength={400} value={form.content} onChange={(e) => setForm((x) => ({ ...x, content: e.target.value }))} required /></Field>
              <Field><FieldLabel>Sumber / referensi</FieldLabel><Input value={form.source} onChange={(e) => setForm((x) => ({ ...x, source: e.target.value }))} /></Field>
              <Field><FieldLabel>Urutan</FieldLabel><Input type="number" min="0" max="999" value={form.sortOrder} onChange={(e) => setForm((x) => ({ ...x, sortOrder: e.target.value }))} /></Field>
              <label className="flex items-start gap-3 rounded-lg border p-3 text-sm"><Checkbox checked={form.isActive} onCheckedChange={(checked) => setForm((x) => ({ ...x, isActive: Boolean(checked) }))} /><span><strong className="block font-medium">Aktif</strong><span className="text-muted-foreground">Tampilkan konten pada Public Display.</span></span></label>
            </FieldGroup>
            <SheetFooter className="mt-auto px-0 pb-0"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan konten'}</Button></SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(value) => !value && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus konten?</AlertDialogTitle><AlertDialogDescription>Konten ini akan dihapus dari pengaturan Public Display.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={remove}>Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
