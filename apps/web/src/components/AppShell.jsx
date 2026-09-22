import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/app/AppHeader.jsx';
import { AppSidebar } from '@/components/app/AppSidebar.jsx';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';

export function AppShell() {
  return (
    <SidebarProvider>
      <div className="dashboard-shell flex min-h-svh w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset className="min-h-svh overflow-x-hidden">
          <AppHeader />
          <main className="min-w-0">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
        <Toaster richColors closeButton />
      </div>
    </SidebarProvider>
  );
}
