import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const emptyUser = { name: '', email: '', password: '', role: 'TREASURER' };

export function UserSettings({ users, currentUser, api, reload }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyUser);
  const [saving, setSaving] = useState(false);

  async function create(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.createUser(form);
      toast.success('Pengguna berhasil dibuat.');
      setForm(emptyUser);
      setOpen(false);
      await reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(user) {
    try {
      await api.updateUserStatus(user.id, !user.isActive);
      toast.success(user.isActive ? 'Pengguna dinonaktifkan.' : 'Pengguna diaktifkan.');
      await reload();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-3 border-b bg-muted/25 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><h2 className="text-lg font-semibold">Pengguna</h2><p className="mt-1 text-sm text-muted-foreground">Kelola akun Admin dan Bendahara serta status aksesnya.</p></div>
        <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}><IconPlus />Tambah pengguna</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Akses</TableHead></TableRow></TableHeader>
        <TableBody>
          {users.map((user) => <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell><Badge variant="outline">{user.role === 'ADMIN' ? 'Admin' : 'Bendahara'}</Badge></TableCell>
            <TableCell><Badge variant={user.isActive ? 'success' : 'outline'}>{user.isActive ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
            <TableCell>
              <Switch
                checked={user.isActive}
                disabled={Number(user.id) === Number(currentUser?.id)}
                onCheckedChange={() => toggle(user)}
                aria-label={user.isActive ? `Nonaktifkan ${user.name}` : `Aktifkan ${user.name}`}
              />
            </TableCell>
          </TableRow>)}
          {users.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Belum ada pengguna.</TableCell></TableRow>}
        </TableBody>
      </Table>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah pengguna</DialogTitle><DialogDescription>Password awal minimal 10 karakter.</DialogDescription></DialogHeader>
          <form className="grid gap-5" onSubmit={create}>
            <FieldGroup>
              <Field><FieldLabel>Nama</FieldLabel><Input value={form.name} onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} required /></Field>
              <Field><FieldLabel>Email</FieldLabel><Input type="email" value={form.email} onChange={(e) => setForm((x) => ({ ...x, email: e.target.value }))} required /></Field>
              <Field><FieldLabel>Role</FieldLabel><Select value={form.role} onValueChange={(role) => setForm((x) => ({ ...x, role }))}><SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TREASURER">Bendahara</SelectItem><SelectItem value="ADMIN">Admin / Pengurus</SelectItem></SelectContent></Select></Field>
              <Field><FieldLabel>Password awal</FieldLabel><Input type="password" minLength={10} value={form.password} onChange={(e) => setForm((x) => ({ ...x, password: e.target.value }))} required /></Field>
            </FieldGroup>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button disabled={saving}>{saving ? 'Membuat...' : 'Tambah pengguna'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
