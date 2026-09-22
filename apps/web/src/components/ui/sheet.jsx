import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

function SheetOverlay({ className, ...props }) {
  return <DialogPrimitive.Overlay className={cn('fixed inset-0 bg-black/40 backdrop-blur-[2px]', className)} {...props} />;
}

const SheetContent = React.forwardRef(function SheetContent(
  { className, children, side = 'right', ...props },
  ref
) {
  const sideClasses = {
    right: 'inset-y-0 right-0 h-full w-[min(92vw,420px)] border-l',
    left: 'inset-y-0 left-0 h-full w-[min(92vw,420px)] border-r',
    bottom: 'inset-x-0 bottom-0 max-h-[88vh] rounded-t-xl border-t'
  };

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn('fixed bg-card text-card-foreground shadow-xl outline-none', sideClasses[side], className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
          <IconX />
          <span className="sr-only">Tutup</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
});

function SheetHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1.5 p-5 pr-12', className)} {...props} />;
}
const SheetTitle = React.forwardRef(function SheetTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />;
});
const SheetDescription = React.forwardRef(function SheetDescription({ className, ...props }, ref) {
  return <DialogPrimitive.Description ref={ref} className={cn('text-sm leading-5 text-muted-foreground', className)} {...props} />;
});
function SheetFooter({ className, ...props }) {
  return <div className={cn('mt-auto flex gap-2 p-5', className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter };
