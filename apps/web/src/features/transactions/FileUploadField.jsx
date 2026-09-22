import { IconCheck, IconFile, IconPhotoScan } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export function FileUploadField({
  id,
  label,
  description,
  file,
  onChange,
  required = false,
  capture,
  accept = 'image/jpeg,image/png,image/webp,application/pdf'
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border border-dashed bg-card px-4 py-3 transition-colors hover:bg-muted/45',
        file && 'border-primary/35 bg-primary/[0.025]'
      )}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        capture={capture}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <span className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground',
        file && 'bg-primary/10 text-primary'
      )}>
        {file ? <IconCheck aria-hidden="true" /> : <IconPhotoScan aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm font-semibold text-foreground">
          {file?.name ?? label}{required && !file ? ' *' : ''}
        </strong>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
          {file ? 'File siap diunggah. Ketuk untuk mengganti.' : description}
        </span>
      </span>
      <IconFile aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </label>
  );
}
