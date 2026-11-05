import { cn } from '@/lib/utils';

export function PageHeader({ title, description, actions, meta, className }) {
  return (
    <header className={cn('flex flex-col gap-3 pt-2 pb-1 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="min-w-0">
        {meta && <p className="mb-1 text-sm text-subtle-foreground">{meta}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-base text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
