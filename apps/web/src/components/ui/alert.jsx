import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative w-full rounded-xl border p-3.5 text-sm', {
  variants: {
    variant: {
      default: 'border-border bg-card text-card-foreground',
      destructive: 'border-destructive-border bg-destructive-subtle text-destructive-subtle-foreground',
      success: 'border-success-border bg-success-subtle text-success-subtle-foreground',
      warning: 'border-warning-border bg-warning-subtle text-warning-subtle-foreground',
      info: 'border-info-border bg-info-subtle text-info-subtle-foreground'
    }
  },
  defaultVariants: { variant: 'default' }
});

function Alert({ className, variant, ...props }) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}
function AlertTitle({ className, ...props }) {
  return <h5 className={cn('mb-1 font-semibold', className)} {...props} />;
}
function AlertDescription({ className, ...props }) {
  return <div className={cn('text-sm', className)} {...props} />;
}
export { Alert, AlertTitle, AlertDescription };
