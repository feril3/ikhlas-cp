import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function GeneralSettings({ settings, setSettings, onSave, saving }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Umum</h2>
        <p className="mt-1 text-sm text-muted-foreground">Identitas masjid, rekening donasi, dan media live.</p>
      </div>
      <form className="space-y-7" onSubmit={onSave}>
        <div>
          <h3 className="mb-4 text-sm font-semibold">Identitas</h3>
          <FieldGroup>
            <Field><FieldLabel>Nama masjid</FieldLabel><Input value={settings.mosqueName} onChange={(e) => setSettings((x) => ({ ...x, mosqueName: e.target.value }))} required /></Field>
            <Field><FieldLabel>Tagline</FieldLabel><Input value={settings.mosqueTagline} onChange={(e) => setSettings((x) => ({ ...x, mosqueTagline: e.target.value }))} /></Field>
          </FieldGroup>
        </div>

        <div className="border-t pt-6">
          <h3 className="mb-4 text-sm font-semibold">Rekening donasi</h3>
          <FieldGroup>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field><FieldLabel>Nama bank</FieldLabel><Input value={settings.bankName} onChange={(e) => setSettings((x) => ({ ...x, bankName: e.target.value }))} /></Field>
              <Field><FieldLabel>Nomor rekening</FieldLabel><Input inputMode="numeric" value={settings.bankAccountNumber} onChange={(e) => setSettings((x) => ({ ...x, bankAccountNumber: e.target.value }))} /></Field>
            </div>
            <Field><FieldLabel>Nama pemilik rekening</FieldLabel><Input value={settings.bankAccountHolder} onChange={(e) => setSettings((x) => ({ ...x, bankAccountHolder: e.target.value }))} /></Field>
          </FieldGroup>
        </div>

        <div className="border-t pt-6">
          <h3 className="mb-4 text-sm font-semibold">Media</h3>
          <FieldGroup>
            <Field><FieldLabel>Streaming default</FieldLabel><Input type="url" value={settings.defaultYoutubeUrl} onChange={(e) => setSettings((x) => ({ ...x, defaultYoutubeUrl: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." /></Field>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field><FieldLabel>Judul live aktif</FieldLabel><Input value={settings.activeLiveTitle} onChange={(e) => setSettings((x) => ({ ...x, activeLiveTitle: e.target.value }))} /></Field>
              <Field><FieldLabel>URL live aktif</FieldLabel><Input type="url" value={settings.activeLiveUrl} onChange={(e) => setSettings((x) => ({ ...x, activeLiveUrl: e.target.value }))} /></Field>
            </div>
          </FieldGroup>
        </div>
        <div className="flex justify-end border-t pt-5"><Button disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan pengaturan'}</Button></div>
      </form>
    </section>
  );
}
