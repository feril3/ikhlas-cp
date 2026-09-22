import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatRupiah } from '@/lib/format';

const transactionLabels = {
  amount: 'Nominal',
  transactionDate: 'Tanggal',
  method: 'Metode',
  category: 'Kategori',
  sourceDetail: 'Sumber',
  description: 'Keterangan'
};

function displayValue(key, value) {
  if (key === 'amount' && value !== undefined && value !== null) return formatRupiah(Number(value));
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  return String(value ?? '—');
}

function StructuredDetails({ log }) {
  const before = log.details?.before;
  const after = log.details?.after;

  if (log.entityType === 'TRANSACTION' && before && after) {
    const changes = Object.entries(transactionLabels)
      .filter(([key]) => String(before?.[key] ?? '') !== String(after?.[key] ?? ''));

    return (
      <div className="space-y-3">
        {changes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada perubahan field utama.</p>
        ) : changes.map(([key, label]) => (
          <div key={key} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[120px_1fr_1fr]">
            <strong className="text-sm">{label}</strong>
            <div><span className="block text-xs text-muted-foreground">Sebelum</span><span className="text-sm">{displayValue(key, before[key])}</span></div>
            <div><span className="block text-xs text-muted-foreground">Sesudah</span><span className="text-sm">{displayValue(key, after[key])}</span></div>
          </div>
        ))}
      </div>
    );
  }

  if (!log.details) return <p className="text-sm text-muted-foreground">Tidak ada detail tambahan.</p>;
  return <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-5">{JSON.stringify(log.details, null, 2)}</pre>;
}

export function AuditSettings({ logs }) {
  const [userFilter, setUserFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const entities = useMemo(
    () => [...new Set(logs.map((log) => log.entityType).filter(Boolean))].sort(),
    [logs]
  );

  const filtered = useMemo(() => logs.filter((log) => {
    const userText = `${log.userName ?? ''} ${log.userEmail ?? ''}`.toLowerCase();
    if (userFilter && !userText.includes(userFilter.toLowerCase())) return false;
    if (entityFilter !== 'ALL' && log.entityType !== entityFilter) return false;
    if (actionFilter && !log.action.toLowerCase().includes(actionFilter.toLowerCase())) return false;
    if (dateFilter && !String(log.createdAt).startsWith(dateFilter)) return false;
    return true;
  }), [logs, userFilter, entityFilter, actionFilter, dateFilter]);

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b bg-muted/25 px-4 py-4 sm:px-5">
        <h2 className="text-lg font-semibold">Audit</h2>
        <p className="mt-1 text-sm text-muted-foreground">Telusuri perubahan sistem dan buka detail sebelum/sesudah ketika tersedia.</p>
      </div>
      <div className="grid gap-3 border-b bg-card p-4 sm:grid-cols-2 xl:grid-cols-4">
        <Input placeholder="Cari pengguna" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} />
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua entitas</SelectItem>
            {entities.map((entity) => <SelectItem key={entity} value={entity}>{entity}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Cari action" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Waktu</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
        <TableBody>
          {filtered.map((log) => <TableRow key={log.id}>
            <TableCell className="whitespace-nowrap">{new Date(log.createdAt.replace(' ', 'T') + 'Z').toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
            <TableCell>{log.userName ?? 'Sistem / anonim'}</TableCell>
            <TableCell className="font-medium">{log.action.replaceAll('_', ' ')}</TableCell>
            <TableCell>{log.entityType}{log.entityId ? ` #${log.entityId}` : ''}</TableCell>
            <TableCell><Button variant="ghost" size="sm" onClick={() => setSelected(log)}>Buka</Button></TableCell>
          </TableRow>)}
          {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Tidak ada audit log yang cocok.</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detail audit</SheetTitle>
            <SheetDescription>{selected ? `${selected.action.replaceAll('_', ' ')} · ${selected.entityType}` : ''}</SheetDescription>
          </SheetHeader>
          {selected && <div className="space-y-5 px-5 pb-6">
            <div className="grid gap-3 rounded-lg border p-4 text-sm">
              <div><span className="text-muted-foreground">Pengguna</span><strong className="block">{selected.userName ?? 'Sistem / anonim'}</strong></div>
              <div><span className="text-muted-foreground">Waktu</span><strong className="block">{new Date(selected.createdAt.replace(' ', 'T') + 'Z').toLocaleString('id-ID')}</strong></div>
            </div>
            <StructuredDetails log={selected} />
          </div>}
        </SheetContent>
      </Sheet>
    </section>
  );
}
