import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { IconX } from '@/components/icons.jsx';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

function DialogOverlay({ className, ...props }) {
  return <DialogPrimitive.Overlay className={cn('fixed inset-0 z-50 bg-overlay', className)} {...props} />;
}

// Di ponsel dialog muncul sebagai lembar bawah yang bisa digulir; di layar lebar sebagai dialog di tengah.
const DialogContent = React.forwardRef(function DialogContent({ className, children, ...props }, ref) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed inset-x-0 bottom-0 z-[60] grid max-h-[92dvh] w-full gap-4 overflow-y-auto overscroll-contain rounded-t-3xl bg-popover p-5 pb-[calc(1.25rem+var(--safe-bottom))] text-popover-foreground shadow-pop',
          'sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-[min(calc(100vw-2rem),560px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6',
          className
        )}
        {...props}
      >
        <span aria-hidden="true" className="mx-auto -mt-2 mb-1 h-1 w-10 rounded-full bg-border-strong sm:hidden" />
        {children}
        <DialogPrimitive.Close className="touch-target absolute top-4 right-4 inline-flex size-(--control-height-sm) items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
          <IconX className="size-4" stroke={1.75} />
          <span className="sr-only">Tutup</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

function DialogHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1 pr-10', className)} {...props} />;
}
const DialogTitle = React.forwardRef(function DialogTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn('text-xl font-semibold tracking-tight', className)} {...props} />;
});
const DialogDescription = React.forwardRef(function DialogDescription({ className, ...props }, ref) {
  return <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />;
});
function DialogFooter({ className, ...props }) {
  return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />;
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };
