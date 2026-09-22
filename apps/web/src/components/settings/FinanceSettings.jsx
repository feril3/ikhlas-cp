import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatRupiah } from '@/lib/format';

export function FinanceSettings({ settings, setSettings, onSave, saving }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Keuangan</h2>
        <p className="mt-1 text-sm text-muted-foreground">Atur saldo awal yang menjadi dasar perhitungan kas.</p>
      </div>
      <Alert className="mb-6">
        <AlertTitle>Perubahan memengaruhi saldo sistem</AlertTitle>
        <AlertDescription>Setiap perubahan saldo awal dan tanggalnya dicatat pada audit trail.</AlertDescription>
      </Alert>
      <form className="space-y-5" onSubmit={onSave}>
        <FieldGroup>
          <Field>
            <FieldLabel>Saldo awal</FieldLabel>
            <Input type="number" min="0" step="1" value={settings.openingBalance} onChange={(e) => setSettings((x) => ({ ...x, openingBalance: e.target.value }))} required />
            <span className="text-xs text-muted-foreground">{formatRupiah(Number(settings.openingBalance || 0))}</span>
          </Field>
          <Field><FieldLabel>Tanggal saldo awal</FieldLabel><Input type="date" value={settings.openingBalanceDate ?? ''} onChange={(e) => setSettings((x) => ({ ...x, openingBalanceDate: e.target.value }))} /></Field>
          <Field><FieldLabel>Catatan</FieldLabel><Textarea rows={4} maxLength={240} value={settings.openingBalanceNote ?? ''} onChange={(e) => setSettings((x) => ({ ...x, openingBalanceNote: e.target.value }))} placeholder="Contoh: Saldo kas sebelum migrasi ke IKHLAS" /></Field>
        </FieldGroup>
        <div className="flex justify-end border-t pt-5"><Button disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan keuangan'}</Button></div>
      </form>
    </section>
  );
}
