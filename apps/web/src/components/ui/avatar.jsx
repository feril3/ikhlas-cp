import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

const Avatar = React.forwardRef(function Avatar({ className, ...props }, ref) {
  return <AvatarPrimitive.Root ref={ref} className={cn('relative flex size-9 shrink-0 overflow-hidden rounded-full', className)} {...props} />;
});
const AvatarImage = React.forwardRef(function AvatarImage({ className, ...props }, ref) {
  return <AvatarPrimitive.Image ref={ref} className={cn('aspect-square size-full', className)} {...props} />;
});
const AvatarFallback = React.forwardRef(function AvatarFallback({ className, ...props }, ref) {
  return <AvatarPrimitive.Fallback ref={ref} className={cn('flex size-full items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground', className)} {...props} />;
});

export { Avatar, AvatarImage, AvatarFallback };
