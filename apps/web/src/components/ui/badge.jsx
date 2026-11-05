import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Badge datar: latar lembut, teks tegas, tanpa cincin, garis tepi, bayangan, atau ikon status.
// Teks selalu menyebut statusnya, jadi warna bukan satu-satunya penanda (WCAG 1.4.1).
// Varian outline tetap bergaris tepi karena garis itu ciri variannya.
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full font-medium whitespace-nowrap tabular-nums [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        secondary: 'bg-accent text-muted-foreground',
        muted: 'bg-muted text-subtle-foreground',
        primary: 'bg-primary text-primary-foreground',
        default: 'bg-inverse text-inverse-foreground',
        inverse: 'bg-inverse text-inverse-foreground',
        outline: 'text-foreground shadow-[inset_0_0_0_1px_var(--border-strong)]',
        success: 'bg-success-subtle text-success',
        warning: 'bg-warning-subtle text-warning',
        destructive: 'bg-destructive-subtle text-destructive',
        info: 'bg-info-subtle text-info'
      },
      size: {
        sm: 'h-5 px-1.5 text-2xs',
        default: 'h-6 px-2 text-xs'
      }
    },
    defaultVariants: { variant: 'secondary', size: 'default' }
  }
);

function Badge({ className, variant, size, ...props }) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
