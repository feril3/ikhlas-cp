import { cn } from '@/lib/utils';

function Empty({ className, ...props }) { return <div className={cn('flex flex-col items-center justify-center gap-2 py-10 text-center', className)} {...props} />; }
function EmptyTitle({ className, ...props }) { return <h3 className={cn('m-0 text-sm font-semibold text-foreground', className)} {...props} />; }
function EmptyDescription({ className, ...props }) { return <p className={cn('m-0 max-w-md text-sm leading-5 text-muted-foreground', className)} {...props} />; }
export { Empty, EmptyTitle, EmptyDescription };
