import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative w-full rounded-md border p-3.5 text-sm', {
  variants: {
    variant: {
      default: 'bg-card text-card-foreground',
      destructive: 'border-destructive/25 bg-destructive/5 text-destructive',
      success: 'border-[#badfce] bg-[#eff8f4] text-[#125a42]'
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
  return <div className={cn('text-sm leading-5 opacity-90', className)} {...props} />;
}
export { Alert, AlertTitle, AlertDescription };
