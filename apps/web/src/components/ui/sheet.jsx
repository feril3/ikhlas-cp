import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { IconX } from '@/components/icons.jsx';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

function SheetOverlay({ className, ...props }) {
  return <DialogPrimitive.Overlay className={cn('fixed inset-0 z-50 bg-overlay', className)} {...props} />;
}

const SheetContent = React.forwardRef(function SheetContent(
  { className, children, side = 'right', showClose = true, ...props },
  ref
) {
  const sideClasses = {
    right: 'inset-y-0 right-0 h-full w-[min(92vw,440px)] sm:rounded-l-3xl',
    left: 'inset-y-0 left-0 h-full w-[min(88vw,320px)] rounded-r-3xl',
    bottom: 'inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl pb-[var(--safe-bottom)]'
  };

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn('fixed z-[60] flex flex-col bg-popover text-popover-foreground shadow-pop', sideClasses[side], className)}
        {...props}
      >
        {side === 'bottom' && <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong" />}
        {children}
        {showClose && (
          <DialogPrimitive.Close className="touch-target absolute top-4 right-4 inline-flex size-(--control-height-sm) items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
            <IconX className="size-4" stroke={1.75} />
            <span className="sr-only">Tutup</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </SheetPortal>
  );
});

function SheetHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1 p-5 pr-14', className)} {...props} />;
}
const SheetTitle = React.forwardRef(function SheetTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn('text-xl font-semibold tracking-tight', className)} {...props} />;
});
const SheetDescription = React.forwardRef(function SheetDescription({ className, ...props }, ref) {
  return <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />;
});
function SheetFooter({ className, ...props }) {
  return <div className={cn('mt-auto flex gap-2 p-5', className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter };
