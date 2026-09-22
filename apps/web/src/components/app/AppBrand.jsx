import { IconBuildingMosque } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export function AppBrand({ compact = false, className }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex size-9 shrink-0 items-center justify-center text-sidebar-primary">
        <IconBuildingMosque aria-hidden="true" stroke={1.7} />
      </div>
      {!compact && (
        <div className="min-w-0">
          <strong className="block truncate text-[15px] font-bold tracking-[0.07em] text-sidebar-foreground">IKHLAS</strong>
          <span className="block truncate text-[11px] text-sidebar-foreground/60">Masjid Al-Fath</span>
        </div>
      )}
    </div>
  );
}
