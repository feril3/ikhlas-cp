import * as React from 'react';
import { cn } from '@/lib/utils';

const inputClassName =
  'h-(--control-height) w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-standard) placeholder:text-muted-foreground hover:border-subtle-foreground focus-visible:border-ring disabled:pointer-events-none disabled:bg-muted disabled:text-disabled-foreground aria-invalid:border-destructive';

const Input = React.forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return <input ref={ref} type={type} data-slot="input" className={cn(inputClassName, className)} {...props} />;
});

export { Input, inputClassName };
