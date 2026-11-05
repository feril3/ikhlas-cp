import { IconBuildingMosque } from '@/components/icons.jsx';
import { cn } from '@/lib/utils';

export function AppBrand({ compact = false, className }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <IconBuildingMosque aria-hidden="true" className="size-4.5" stroke={1.75} />
      </span>
      {!compact && (
        <span className="min-w-0">
          <strong className="block truncate text-sm font-semibold tracking-tight text-foreground">IKHLAS</strong>
          <span className="block truncate text-xs text-subtle-foreground">Masjid Al-Fath</span>
        </span>
      )}
    </div>
  );
}
