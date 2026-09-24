import { useEffect, useMemo, useState } from 'react';
import {
  IconCalendarEvent,
  IconDots,
  IconEdit,
  IconMapPin,
  IconPlus,
  IconTrash,
  IconUser,
  IconVideo
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { api } from '../lib/api.js';
import { toInputDate } from '../lib/format.js';
import { LoadingState } from '../components/LoadingState.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { Badge } from '../components/ui/badge.jsx';
import { Button } from '../components/ui/button.jsx';
import { Checkbox } from '../components/ui/checkbox.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog.jsx';
import { Input } from '../components/ui/input.jsx';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '../components/ui/sheet.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.jsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu.jsx';
import { Field, FieldGroup, FieldLabel } from '../components/ui/field.jsx';

function emptyActivity(date = toInputDate()) {
  return {
    title: '',
    activityDate: date,
    startTime: '',
    location: '',
    speaker: '',
    liveUrl: '',
    isPublished: true
  };
}

function activityToForm(activity) {
  return {
    title: activity.title ?? '',
    activityDate: activity.activityDate,
    startTime: activity.startTime ?? '',
    location: activity.location ?? '',
    speaker: activity.speaker ?? '',
    liveUrl: activity.liveUrl ?? '',
    isPublished: Boolean(activity.isPublished)
  };
}

function formatFridayDate(date) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function formatAgendaDate(date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function FridayEditor({ open, onOpenChange, row, onSaved }) {
  const [form, setForm] = useState({ imam: '', khatib: '', bilal: '' });
  const [sameImamKhatib, setSameImamKhatib] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) return;
    const imam = row.imam ?? '';
    const khatib = row.khatib ?? '';
    setForm({ imam, khatib, bilal: row.bilal ?? '' });
    setSameImamKhatib(Boolean(imam.trim()) && imam.trim() === khatib.trim());
  }, [row]);

  function updateImam(value) {
    setForm((current) => ({
      ...current,
      imam: value,
      khatib: sameImamKhatib ? value : current.khatib
    }));
  }

  function toggleSameImamKhatib() {
    setSameImamKhatib((current) => {
      const next = !current;
      if (next) setForm((value) => ({ ...value, khatib: value.imam }));
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (!row) return;
    setSaving(true);
    try {
      const result = await api.updateFridaySchedule(row.scheduleDate, form);
      onSaved(result.schedule);
      toast.success('Petugas Jumat berhasil diperbarui.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit petugas Jumat</DialogTitle>
          <DialogDescription>{row ? formatFridayDate(row.scheduleDate) : ''}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Imam</FieldLabel>
              <Input value={form.imam} onChange={(e) => updateImam(e.target.value)} placeholder="Nama imam" required />
            </Field>
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/25 p-3">
              <div>
                <strong className="block text-sm font-medium">Imam juga menjadi Khatib</strong>
                <span className="text-xs text-muted-foreground">Aktifkan jika satu orang bertugas sebagai imam sekaligus khatib.</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant={sameImamKhatib ? 'secondary' : 'outline'}
                aria-pressed={sameImamKhatib}
                onClick={toggleSameImamKhatib}
              >
                {sameImamKhatib ? 'Sama' : 'Samakan'}
              </Button>
            </div>
            <Field>
              <FieldLabel>Khatib</FieldLabel>
              <Input
                value={form.khatib}
                onChange={(e) => setForm((x) => ({ ...x, khatib: e.target.value }))}
                placeholder="Nama khatib"
                disabled={sameImamKhatib}
                required
              />
            </Field>
            <Field><FieldLabel>Bilal</FieldLabel><Input value={form.bilal} onChange={(e) => setForm((x) => ({ ...x, bilal: e.target.value }))} placeholder="Nama bilal" required /></Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan petugas'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AgendaEditor({ open, onOpenChange, activity, today, onSaved }) {
  const editing = Boolean(activity?.id);
  const [form, setForm] = useState(() => emptyActivity(today));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(activity ? activityToForm(activity) : emptyActivity(today));
  }, [activity, today, open]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.updateActivity(activity.id, form);
      else await api.createActivity(form);
      toast.success(editing ? 'Agenda berhasil diperbarui.' : 'Agenda berhasil ditambahkan.');
      await onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editing ? 'Edit agenda' : 'Tambah agenda'}</SheetTitle>
          <SheetDescription>Atur informasi kegiatan yang dapat ditampilkan pada Public Display.</SheetDescription>
        </SheetHeader>
        <form className="flex flex-1 flex-col gap-5 px-5 pb-5" onSubmit={submit}>
          <FieldGroup>
            <Field><FieldLabel>Nama kegiatan</FieldLabel><Input value={form.title} onChange={(e) => setForm((x) => ({ ...x, title: e.target.value }))} placeholder="Kajian Ba'da Maghrib" required /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field><FieldLabel>Tanggal</FieldLabel><Input type="date" min={today} value={form.activityDate} onChange={(e) => setForm((x) => ({ ...x, activityDate: e.target.value }))} required /></Field>
              <Field><FieldLabel>Waktu</FieldLabel><Input type="time" value={form.startTime} onChange={(e) => setForm((x) => ({ ...x, startTime: e.target.value }))} /></Field>
            </div>
            <Field><FieldLabel>Pemateri</FieldLabel><Input value={form.speaker} onChange={(e) => setForm((x) => ({ ...x, speaker: e.target.value }))} placeholder="Nama pemateri" /></Field>
            <Field><FieldLabel>Lokasi</FieldLabel><Input value={form.location} onChange={(e) => setForm((x) => ({ ...x, location: e.target.value }))} placeholder="Aula utama" /></Field>
            <Field><FieldLabel>URL YouTube</FieldLabel><Input type="url" value={form.liveUrl} onChange={(e) => setForm((x) => ({ ...x, liveUrl: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." /></Field>
            <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
              <Checkbox checked={form.isPublished} onCheckedChange={(checked) => setForm((x) => ({ ...x, isPublished: Boolean(checked) }))} />
              <span><strong className="block font-medium">Tampilkan di Public Display</strong><span className="text-muted-foreground">Agenda aktif akan ikut ditampilkan pada layar jamaah.</span></span>
            </label>
          </FieldGroup>
          <SheetFooter className="mt-auto px-0 pb-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button disabled={saving}>{saving ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Tambah agenda'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function Schedule() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const today = useMemo(() => toInputDate(), []);
  const [fridays, setFridays] = useState(null);
  const [activities, setActivities] = useState([]);
  const [fridayToEdit, setFridayToEdit] = useState(null);
  const [agendaToEdit, setAgendaToEdit] = useState(null);
  const [agendaEditorOpen, setAgendaEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loadingError, setLoadingError] = useState('');

  async function load() {
    try {
      const [fridayData, activityData] = await Promise.all([
        api.fridaySchedules(today, 8),
        api.activities(today)
      ]);
      setFridays(fridayData.data);
      setActivities(activityData.data);
      setLoadingError('');
    } catch (error) {
      setLoadingError(error.message);
    }
  }

  useEffect(() => { load(); }, []);

  function openNewAgenda() {
    setAgendaToEdit(null);
    setAgendaEditorOpen(true);
  }

  function openEditAgenda(activity) {
    setAgendaToEdit(activity);
    setAgendaEditorOpen(true);
  }

  async function togglePublished(activity) {
    try {
      await api.updateActivity(activity.id, { ...activityToForm(activity), isPublished: !activity.isPublished });
      toast.success(activity.isPublished ? 'Agenda disembunyikan dari Public Display.' : 'Agenda dipublikasikan.');
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.deleteActivity(deleteTarget.id);
      toast.success('Agenda berhasil dihapus.');
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jadwal Jumat & Agenda"
        description="Kelola petugas Jumat mendatang dan agenda publik. Jadwal salat harian tetap otomatis dari provider."
        actions={isAdmin ? <Button onClick={openNewAgenda}><IconPlus />Tambah agenda</Button> : null}
      />

      {loadingError && <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">{loadingError}</div>}

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-start justify-between gap-4 border-b bg-muted/25 px-4 py-4 sm:px-5">
          <div><h2 className="text-lg font-semibold">Petugas Jumat mendatang</h2><p className="mt-1 text-sm text-muted-foreground">Tanggal Jumat yang sudah lewat otomatis tidak ditampilkan lagi.</p></div>
          <IconUser className="mt-1 size-5 text-muted-foreground" />
        </div>
        {!fridays ? <div className="p-5"><LoadingState /></div> : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Imam</TableHead><TableHead>Khatib</TableHead><TableHead>Bilal</TableHead><TableHead>Status</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
                <TableBody>
                  {fridays.map((row) => {
                    const complete = Boolean(row.imam?.trim() && row.khatib?.trim() && row.bilal?.trim());
                    return <TableRow key={row.scheduleDate}>
                      <TableCell className="font-medium">{formatFridayDate(row.scheduleDate)}</TableCell>
                      <TableCell>{row.imam || '—'}</TableCell><TableCell>{row.khatib || '—'}</TableCell><TableCell>{row.bilal || '—'}</TableCell>
                      <TableCell>{complete
                        ? <Badge variant="success">Siap</Badge>
                        : <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><span className="size-1.5 rounded-full bg-muted-foreground/55" />Belum lengkap</span>
                      }</TableCell>
                      <TableCell>{isAdmin && <Button variant="ghost" size="icon-sm" aria-label="Edit petugas Jumat" onClick={() => setFridayToEdit(row)}><IconEdit /></Button>}</TableCell>
                    </TableRow>;
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="divide-y md:hidden">
              {fridays.map((row) => {
                const complete = Boolean(row.imam?.trim() && row.khatib?.trim() && row.bilal?.trim());
                return <article key={row.scheduleDate} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{formatFridayDate(row.scheduleDate)}</strong><div className="mt-1 text-xs leading-5 text-muted-foreground">Imam {row.imam || '—'} · Khatib {row.khatib || '—'} · Bilal {row.bilal || '—'}</div></div>{complete ? <Badge variant="success">Siap</Badge> : <span className="mt-0.5 inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-muted-foreground"><span className="size-1.5 rounded-full bg-muted-foreground/55" />Belum lengkap</span>}</div>
                  {isAdmin && <Button variant="outline" size="sm" onClick={() => setFridayToEdit(row)}><IconEdit />Edit petugas</Button>}
                </article>;
              })}
            </div>
          </>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-start justify-between gap-4 border-b bg-muted/25 px-4 py-4 sm:px-5">
          <div><h2 className="text-lg font-semibold">Agenda mendatang</h2><p className="mt-1 text-sm text-muted-foreground">Kegiatan publik, pemateri, waktu, dan status tayang.</p></div>
          <IconCalendarEvent className="mt-1 size-5 text-muted-foreground" />
        </div>
        <div className="hidden md:block">
          <Table>
            <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Kegiatan</TableHead><TableHead>Pemateri</TableHead><TableHead>Waktu</TableHead><TableHead>Status publik</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
            <TableBody>
              {activities.map((item) => <TableRow key={item.id}>
                <TableCell className="whitespace-nowrap">{formatAgendaDate(item.activityDate)}</TableCell>
                <TableCell><strong className="font-medium">{item.title}</strong>{item.location && <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><IconMapPin className="size-3.5" />{item.location}</span>}</TableCell>
                <TableCell>{item.speaker || '—'}</TableCell>
                <TableCell>{item.startTime || 'Fleksibel'}</TableCell>
                <TableCell>{item.isPublished
                  ? <Badge variant="success">Tayang</Badge>
                  : <span className="text-xs font-medium text-muted-foreground">Disembunyikan</span>
                }</TableCell>
                <TableCell>{isAdmin && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Aksi ${item.title}`}><IconDots /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => openEditAgenda(item)}><IconEdit />Edit</DropdownMenuItem><DropdownMenuItem onSelect={() => togglePublished(item)}>{item.isPublished ? 'Sembunyikan dari display' : 'Publikasikan'}</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={() => setDeleteTarget(item)}><IconTrash />Hapus</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</TableCell>
              </TableRow>)}
              {activities.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Belum ada agenda mendatang.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>

        <div className="divide-y md:hidden">
          {activities.map((item) => <article key={item.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3"><div><strong>{item.title}</strong><p className="mt-1 text-xs text-muted-foreground">{formatAgendaDate(item.activityDate)} · {item.startTime || 'Waktu fleksibel'}</p></div>{item.isPublished ? <Badge variant="success">Tayang</Badge> : <span className="text-xs font-medium text-muted-foreground">Draft</span>}</div>
            <div className="space-y-1 text-sm text-muted-foreground">{item.speaker && <p className="flex items-center gap-2"><IconUser className="size-4" />{item.speaker}</p>}{item.location && <p className="flex items-center gap-2"><IconMapPin className="size-4" />{item.location}</p>}{item.liveUrl && <p className="flex items-center gap-2"><IconVideo className="size-4" />Live tersedia</p>}</div>
            {isAdmin && <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => openEditAgenda(item)}><IconEdit />Edit</Button><Button variant="ghost" size="sm" onClick={() => togglePublished(item)}>{item.isPublished ? 'Sembunyikan' : 'Publikasikan'}</Button><Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(item)}><IconTrash />Hapus</Button></div>}
          </article>)}
          {activities.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Belum ada agenda mendatang.</div>}
        </div>
      </section>

      <FridayEditor open={Boolean(fridayToEdit)} onOpenChange={(open) => !open && setFridayToEdit(null)} row={fridayToEdit} onSaved={(saved) => setFridays((rows) => rows.map((row) => row.scheduleDate === saved.scheduleDate ? saved : row))} />
      <AgendaEditor open={agendaEditorOpen} onOpenChange={setAgendaEditorOpen} activity={agendaToEdit} today={today} onSaved={load} />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus agenda?</AlertDialogTitle><AlertDialogDescription>{deleteTarget ? `${deleteTarget.title} pada ${formatAgendaDate(deleteTarget.activityDate)} akan dihapus dari sistem dan Public Display.` : ''}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={confirmDelete}>Hapus agenda</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
