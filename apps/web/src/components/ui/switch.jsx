import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

const Switch = React.forwardRef(function Switch({ className, ...props }, ref) {
 return (
 <SwitchPrimitive.Root
 ref={ref}
 className={cn(
 'peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center touch-target relative rounded-full border border-input bg-muted transition-[background-color,border-color,box-shadow] focus-visible:border-ring disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 data-[state=checked]:border-primary data-[state=checked]:bg-primary',
 className
 )}
 {...props}
 >
 <SwitchPrimitive.Thumb className="pointer-events-none block size-5 translate-x-0 rounded-full bg-card shadow-card transition-[transform,background-color] data-[state=checked]:translate-x-4 data-[state=checked]:bg-primary-foreground" />
 </SwitchPrimitive.Root>
 );
});

export { Switch };
