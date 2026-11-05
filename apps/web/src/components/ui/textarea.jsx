import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-[border-color] duration-(--duration-fast) placeholder:text-subtle-foreground hover:border-foreground/40 disabled:cursor-not-allowed disabled:bg-muted disabled:text-disabled-foreground aria-invalid:border-destructive',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
