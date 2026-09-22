import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/app/AppHeader.jsx';
import { AppSidebar } from '@/components/app/AppSidebar.jsx';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';

export function AppShell() {
  return (
    <SidebarProvider>
      <div className="dashboard-shell flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset className="min-h-screen">
          <AppHeader />
          <main>
            <div className="page-container">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
