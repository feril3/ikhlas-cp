import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

function AlertDialogOverlay({ className, ...props }) {
  return <AlertDialogPrimitive.Overlay className={cn('fixed inset-0 bg-black/45 backdrop-blur-[2px]', className)} {...props} />;
}

const AlertDialogContent = React.forwardRef(function AlertDialogContent({ className, ...props }, ref) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content ref={ref} className={cn('fixed left-1/2 top-1/2 w-[min(calc(100%-2rem),440px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-5 text-card-foreground shadow-xl outline-none', className)} {...props} />
    </AlertDialogPortal>
  );
});
function AlertDialogHeader({ className, ...props }) { return <div className={cn('flex flex-col gap-2 text-left', className)} {...props} />; }
function AlertDialogFooter({ className, ...props }) { return <div className={cn('mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />; }
const AlertDialogTitle = React.forwardRef(function AlertDialogTitle({ className, ...props }, ref) { return <AlertDialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />; });
const AlertDialogDescription = React.forwardRef(function AlertDialogDescription({ className, ...props }, ref) { return <AlertDialogPrimitive.Description ref={ref} className={cn('text-sm leading-6 text-muted-foreground', className)} {...props} />; });
const AlertDialogAction = React.forwardRef(function AlertDialogAction({ className, ...props }, ref) { return <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants({ variant: 'destructive' }), className)} {...props} />; });
const AlertDialogCancel = React.forwardRef(function AlertDialogCancel({ className, ...props }, ref) { return <AlertDialogPrimitive.Cancel ref={ref} className={cn(buttonVariants({ variant: 'outline' }), className)} {...props} />; });

export { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel };
