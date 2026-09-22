import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

export function LoadingState({ label = 'Memuat data...', className }) {
  return (
    <div className={cn('flex min-h-[220px] items-center justify-center gap-2.5 text-sm text-muted-foreground', className)}>
      <Spinner className="size-4" />
      <span>{label}</span>
    </div>
  );
}
