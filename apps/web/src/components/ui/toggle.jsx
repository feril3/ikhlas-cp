import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Kontrol segmen: pilihan aktif memakai pill tinta (inverse).
const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1.5 rounded-full border border-transparent text-sm font-medium whitespace-nowrap text-muted-foreground transition-[background-color,color] duration-(--duration-fast) hover:text-foreground disabled:pointer-events-none disabled:text-disabled-foreground data-[state=on]:bg-inverse data-[state=on]:text-inverse-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: 'bg-transparent'
      },
      size: {
        default: 'h-(--control-height-sm) min-w-8 px-3',
        sm: 'h-7 min-w-7 px-2.5 text-xs',
        lg: 'h-(--control-height) min-w-9 px-3.5'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

const Toggle = React.forwardRef(function Toggle(
  { className, variant = 'default', size = 'default', pressed, onPressedChange, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      data-state={pressed ? 'on' : 'off'}
      className={cn(toggleVariants({ variant, size, className }))}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) onPressedChange?.(!pressed);
      }}
      {...props}
    />
  );
});

export { Toggle, toggleVariants };
