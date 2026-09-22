import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cn } from '@/lib/utils';

const ToggleGroup = React.forwardRef(function ToggleGroup({ className, ...props }, ref) {
  return <ToggleGroupPrimitive.Root ref={ref} className={cn('inline-flex w-full gap-2', className)} {...props} />;
});

const ToggleGroupItem = React.forwardRef(function ToggleGroupItem({ className, ...props }, ref) {
  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn('flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md border bg-card px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted data-[state=on]:border-primary/35 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/20', className)}
      {...props}
    />
  );
});

export { ToggleGroup, ToggleGroupItem };
