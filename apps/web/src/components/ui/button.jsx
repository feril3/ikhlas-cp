import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-9 shrink-0 appearance-none items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring/30 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary px-4 text-primary-foreground hover:bg-primary/92',
        secondary: 'border border-transparent bg-secondary px-4 text-secondary-foreground hover:border-border hover:bg-secondary/80',
        outline: 'border-input bg-card px-4 text-foreground hover:border-ring/70 hover:bg-muted',
        ghost: 'bg-transparent px-3 text-foreground hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive px-4 text-white hover:bg-destructive/90',
        link: 'bg-transparent px-1 text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10',
        sm: 'h-8 min-h-8 px-3 text-xs',
        lg: 'h-11 min-h-11 px-5',
        icon: 'size-9 min-h-9 p-0',
        'icon-sm': 'size-8 min-h-8 p-0'
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
