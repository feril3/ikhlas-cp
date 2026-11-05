import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Tombol pill. Tinggi dari token densitas; target sentuh 44px lewat touch-target.
const buttonVariants = cva(
  "touch-target relative inline-flex shrink-0 appearance-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full border-0 text-sm font-semibold select-none transition-[color,background-color,box-shadow,transform,opacity] duration-(--duration-fast) ease-(--ease-standard) active:scale-[0.98] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
        secondary: 'bg-secondary text-secondary-foreground shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-accent aria-expanded:bg-accent',
        outline: 'bg-secondary text-secondary-foreground shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-accent aria-expanded:bg-accent',
        ghost: 'bg-transparent text-foreground hover:bg-accent aria-expanded:bg-accent',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
        'destructive-ghost': 'bg-transparent text-destructive hover:bg-destructive-subtle',
        inverse: 'bg-inverse text-inverse-foreground hover:opacity-90',
        link: 'h-auto rounded-sm bg-transparent px-0 text-link underline-offset-4 hover:underline active:scale-100'
      },
      size: {
        sm: 'h-(--control-height-sm) px-3 text-xs',
        default: 'h-(--control-height) px-4',
        lg: 'h-(--control-height-lg) px-5 text-base',
        'icon-sm': 'size-(--control-height-sm)',
        icon: 'size-(--control-height)',
        'icon-lg': "size-(--control-height-lg) [&_svg:not([class*='size-'])]:size-5"
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

const Button = React.forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot : 'button';
  return <Comp ref={ref} data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});

export { Button, buttonVariants };
