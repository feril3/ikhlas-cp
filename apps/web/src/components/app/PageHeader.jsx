import { cn } from '@/lib/utils';

export function PageHeader({ title, description, actions, meta, className }) {
  return (
    <header className={cn('flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="min-w-0">
        {meta && <div className="mb-1 text-xs font-medium text-muted-foreground">{meta}</div>}
        <h1 className="m-0 text-[clamp(1.75rem,3vw,2.1rem)] font-semibold leading-tight tracking-[-0.035em] text-foreground">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
