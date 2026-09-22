import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { IconLayoutSidebarLeftCollapse, IconMenu2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

const SidebarContext = React.createContext(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within SidebarProvider');
  return context;
}

function SidebarProvider({ children, defaultOpen = true }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [openMobile, setOpenMobile] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = React.useMemo(() => ({
    open,
    setOpen,
    openMobile,
    setOpenMobile,
    toggleSidebar: () => setOpen((value) => !value)
  }), [open, openMobile]);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

function Sidebar({ className, children }) {
  const { open } = useSidebar();
  return (
    <aside
      data-state={open ? 'expanded' : 'collapsed'}
      className={cn(
        'hidden min-h-screen shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex lg:w-64 lg:flex-col data-[state=collapsed]:lg:w-[72px]',
        className
      )}
    >
      {children}
    </aside>
  );
}

function SidebarMobile({ children }) {
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent side="left" className="w-[min(88vw,320px)] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
        <SheetTitle className="sr-only">Navigasi utama</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}

function SidebarHeader({ className, ...props }) {
  return <div className={cn('p-3', className)} {...props} />;
}
function SidebarContent({ className, ...props }) {
  return <div className={cn('flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-3', className)} {...props} />;
}
function SidebarFooter({ className, ...props }) {
  return <div className={cn('border-t border-sidebar-border p-3', className)} {...props} />;
}
function SidebarGroup({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1', className)} {...props} />;
}
function SidebarGroupLabel({ className, forceVisible = false, ...props }) {
  const { open } = useSidebar();
  return (
    <div
      className={cn('px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55 data-[hidden=true]:sr-only', className)}
      data-hidden={!forceVisible && !open}
      {...props}
    />
  );
}
function SidebarMenu({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1', className)} {...props} />;
}
function SidebarMenuButton({ className, active = false, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(
        'flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[13px] font-medium text-sidebar-foreground/78 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&_svg]:size-[18px] [&_svg]:shrink-0',
        active && 'bg-sidebar-accent text-sidebar-accent-foreground',
        className
      )}
      {...props}
    />
  );
}
function SidebarInset({ className, ...props }) {
  return <div className={cn('min-w-0 flex-1 bg-background', className)} {...props} />;
}
function SidebarTrigger({ className, mobile = false, ...props }) {
  const { toggleSidebar, setOpenMobile } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => mobile ? setOpenMobile(true) : toggleSidebar()}
      {...props}
    >
      {mobile ? <IconMenu2 /> : <IconLayoutSidebarLeftCollapse />}
      <span className="sr-only">{mobile ? 'Buka navigasi' : 'Ciutkan navigasi'}</span>
    </Button>
  );
}

export {
  SidebarProvider,
  Sidebar,
  SidebarMobile,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar
};
