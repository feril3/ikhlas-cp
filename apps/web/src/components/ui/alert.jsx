import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative w-full rounded-md border p-3.5 text-sm', {
  variants: {
    variant: {
      default: 'border-border bg-card text-card-foreground shadow-[0_1px_1px_rgba(23,33,30,0.03)]',
      destructive: 'border-[var(--ui-danger-border)] bg-[var(--ui-danger-soft)] text-destructive',
      success: 'border-[var(--ui-success-border)] bg-[var(--ui-success-soft)] text-[var(--ui-success)]'
    }
  },
  defaultVariants: { variant: 'default' }
});

function Alert({ className, variant, ...props }) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}
function AlertTitle({ className, ...props }) {
  return <h5 className={cn('mb-1 font-semibold leading-none', className)} {...props} />;
}
function AlertDescription({ className, ...props }) {
  return <div className={cn('text-sm leading-5', className)} {...props} />;
}
export { Alert, AlertTitle, AlertDescription };
