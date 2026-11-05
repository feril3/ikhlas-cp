import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { IconCamera, IconFile, IconPhoto, IconTrash } from '@/components/icons.jsx';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatFileSize, prepareUpload } from '@/lib/image.js';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 4 * 1024 * 1024;

// Unggah bukti: "Ambil foto" membuka kamera belakang di ponsel; "Pilih berkas" untuk galeri atau PDF.
// Foto dikompres otomatis agar muat dalam batas unggah.
export function FileUploadField({ label, description, file, onChange, required = false, current }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handle(event) {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!picked) return;
    setBusy(true);
    try {
      const prepared = await prepareUpload(picked);
      if (prepared.size > MAX_FILE_SIZE) {
        toast.error('Berkas terlalu besar.', { description: `Ukurannya ${formatFileSize(prepared.size)}, maksimal 4 MB. Pilih berkas lain atau foto ulang.` });
        return;
      }
      onChange(prepared);
    } catch (error) {
      toast.error('Berkas tidak bisa dipakai.', { description: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn('rounded-2xl border border-dashed border-border-strong p-3', file && 'border-solid border-border bg-muted')}>
      <div className="flex items-start gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-muted-foreground">
          {busy ? <Spinner /> : preview ? <img src={preview} alt="" className="size-full object-cover" /> : file ? <IconFile className="size-5" /> : <IconPhoto className="size-5" />}
        </span>
        <span className="min-w-0 flex-1 pt-0.5">
          <span className="block text-sm font-semibold text-foreground">
            {label}{required && <span className="text-destructive"> *</span>}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {busy ? 'Menyiapkan foto…' : file ? `${file.name} · ${formatFileSize(file.size)}` : current ? `Saat ini: ${current}` : description}
          </span>
        </span>
        {file && !busy && (
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(null)} aria-label={`Hapus ${label.toLowerCase()}`}>
            <IconTrash />
          </Button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label htmlFor={`${id}-camera`} className="touch-target relative inline-flex h-(--control-height) cursor-pointer items-center justify-center gap-1.5 rounded-full bg-secondary px-3 text-sm font-semibold text-secondary-foreground shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring">
          <IconCamera /> {file ? 'Foto ulang' : 'Ambil foto'}
          <input id={`${id}-camera`} type="file" accept="image/*" capture="environment" className="sr-only" onChange={handle} disabled={busy} />
        </label>
        <label htmlFor={`${id}-file`} className="touch-target relative inline-flex h-(--control-height) cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-foreground hover:bg-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring">
          <IconFile /> Pilih berkas
          <input id={`${id}-file`} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" className="sr-only" onChange={handle} disabled={busy} />
        </label>
      </div>
    </div>
  );
}
