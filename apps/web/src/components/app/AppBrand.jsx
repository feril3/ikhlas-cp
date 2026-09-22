import { IconBuildingMosque } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export function AppBrand({ compact = false, className }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex size-9 items-center justify-center text-[#e4ca8e]">
        <IconBuildingMosque stroke={1.7} />
      </div>
      {!compact && (
        <div className="min-w-0">
          <strong className="block truncate text-[15px] font-semibold tracking-[0.06em] text-white">IKHLAS</strong>
          <span className="block truncate text-[11px] text-white/58">Masjid Al-Fath</span>
        </div>
      )}
    </div>
  );
}
