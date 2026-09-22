import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-5 shadow-[0_1px_0_rgba(23,33,30,0.03)]',
  {
    variants: {
      variant: {
        default: 'border-primary bg-primary text-primary-foreground',
        secondary: 'border-border bg-secondary text-secondary-foreground',
        outline: 'border-border bg-card text-foreground',
        destructive: 'border-[var(--ui-danger-border)] bg-[var(--ui-danger-soft)] text-destructive',
        success: 'border-[var(--ui-success-border)] bg-[var(--ui-success-soft)] text-[var(--ui-success)]'
      }
    },
    defaultVariants: { variant: 'secondary' }
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
