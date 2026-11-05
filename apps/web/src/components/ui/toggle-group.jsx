import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cn } from '@/lib/utils';
import { toggleVariants } from '@/components/ui/toggle';

const ToggleGroupContext = React.createContext({ size: 'default', variant: 'default' });

// Segmented control: satu wadah pill berlatar muted, item aktif berupa pill tinta.
function ToggleGroup({ className, variant, size, spacing, orientation = 'horizontal', children, ...props }) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-orientation={orientation}
      className={cn('inline-flex w-fit items-center gap-1 rounded-full bg-muted p-1 shadow-[inset_0_0_0_1px_var(--border)]', className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({ className, children, variant = 'default', size = 'default', ...props }) {
  const context = React.useContext(ToggleGroupContext);
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(toggleVariants({ variant: context.variant || variant, size: context.size || size }), 'rounded-full', className)}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
