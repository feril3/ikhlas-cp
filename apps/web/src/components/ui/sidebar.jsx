import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconMenu2 } from '@/components/icons.jsx';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

// Sidebar menempel di canvas (248px); konten berada di panel melayang. Di bawah 1024px navigasi
// berpindah ke bilah bawah (MobileNav) dan sidebar dibuka sebagai sheet dari menu "Lainnya".
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
    toggleSidebar: () => setOpen((current) => !current)
  }), [open, openMobile]);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

function Sidebar({ className, children }) {
  const { open } = useSidebar();
  return (
    <aside
      data-state={open ? 'expanded' : 'collapsed'}
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-(--duration-moderate) ease-(--ease-standard) lg:flex',
        open ? 'lg:w-62' : 'lg:w-18',
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
      <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
        <SheetTitle className="sr-only">Navigasi utama</SheetTitle>
        <div className="flex h-full flex-col pt-[var(--safe-top)] pb-[var(--safe-bottom)]">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

function SidebarHeader({ className, ...props }) {
  return <div className={cn('px-3 pt-3 pb-2', className)} {...props} />;
}
function SidebarContent({ className, ...props }) {
  return <div className={cn('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-2', className)} {...props} />;
}
function SidebarFooter({ className, ...props }) {
  const { open } = useSidebar();
  return <div className={cn('p-3', !open && 'px-2', className)} {...props} />;
}
function SidebarGroup({ className, ...props }) {
  return <div className={cn('flex flex-col gap-0.5', className)} {...props} />;
}
function SidebarGroupLabel({ className, forceVisible = false, ...props }) {
  const { open } = useSidebar();
  return (
    <div
      className={cn('flex h-8 shrink-0 items-center px-3 text-xs font-medium text-subtle-foreground data-[hidden=true]:sr-only', className)}
      data-hidden={!forceVisible && !open}
      {...props}
    />
  );
}
function SidebarMenu({ className, ...props }) {
  return <div className={cn('flex flex-col gap-0.5', className)} {...props} />;
}
const SidebarMenuButton = React.forwardRef(function SidebarMenuButton({ className, active = false, asChild = false, ...props }, ref) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      data-active={active}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'touch-target relative flex h-(--control-height) w-full appearance-none items-center gap-2.5 rounded-full border-0 bg-transparent px-3 text-left text-sm font-medium text-sidebar-foreground transition-[background-color,color] duration-(--duration-fast) ease-(--ease-standard) hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground pointer-coarse:h-(--touch-size) [&_svg]:size-4 [&_svg]:shrink-0',
        className
      )}
      {...props}
    />
  );
});
function SidebarMenuBadge({ className, ...props }) {
  return (
    <span
      className={cn('ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-2xs font-semibold text-primary-foreground tabular-nums', className)}
      {...props}
    />
  );
}
function SidebarInset({ className, ...props }) {
  return (
    <div
      className={cn('relative flex min-w-0 flex-1 flex-col bg-background lg:my-2 lg:mr-2 lg:rounded-3xl lg:shadow-panel', className)}
      {...props}
    />
  );
}
function SidebarTrigger({ className, mobile = false, ...props }) {
  const { open, toggleSidebar, setOpenMobile } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => (mobile ? setOpenMobile(true) : toggleSidebar())}
      {...props}
    >
      {mobile ? <IconMenu2 stroke={1.75} /> : open ? <IconLayoutSidebarLeftCollapse stroke={1.75} /> : <IconLayoutSidebarLeftExpand stroke={1.75} />}
      <span className="sr-only">{mobile ? 'Buka menu' : open ? 'Ciutkan menu' : 'Lebarkan menu'}</span>
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
  SidebarMenuBadge,
  SidebarInset,
  SidebarTrigger,
  useSidebar
};
