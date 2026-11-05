import { Outlet, useLocation } from 'react-router-dom';
import { AppHeader } from '@/components/app/AppHeader.jsx';
import { AppSidebar } from '@/components/app/AppSidebar.jsx';
import { MobileNav } from '@/components/app/MobileNav.jsx';
import { ApprovalCountsProvider } from '@/features/approvals/ApprovalCountsContext.jsx';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

// Halaman formulir memakai tombol aksi menempel di bawah, jadi bilah navigasi bawah disembunyikan.
const FORM_ROUTES = ['/transactions/income', '/transactions/expense'];

export function AppShell() {
  const { pathname } = useLocation();
  const formRoute = FORM_ROUTES.includes(pathname);

  return (
    <ApprovalCountsProvider>
      <SidebarProvider>
        <a
          href="#konten-utama"
          onClick={(event) => {
            event.preventDefault();
            document.getElementById('konten-utama')?.focus();
          }}
          className="sr-only z-50 rounded-full bg-inverse px-4 py-2 text-sm font-semibold text-inverse-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Lewati ke konten
        </a>
        <div className="dashboard-shell flex min-h-dvh w-full">
          <AppSidebar />
          <SidebarInset className="min-h-dvh lg:min-h-[calc(100dvh-1rem)]">
            <AppHeader />
            {/* hf-allow: outline-none -- <main> hanya menerima fokus terprogram dari tautan lewati. */}
            <main
              id="konten-utama"
              tabIndex={-1}
              className={cn(
                'min-w-0 flex-1 focus:outline-0',
                formRoute ? 'pb-6' : 'pb-[calc(var(--bottom-nav-height)+var(--safe-bottom)+1.5rem)] lg:pb-10'
              )}
            >
              <div className="mx-auto w-full max-w-[1400px] px-4 pt-2 sm:px-6 lg:px-8 lg:pt-4">
                <Outlet />
              </div>
            </main>
          </SidebarInset>
          {!formRoute && <MobileNav />}
        </div>
        <Toaster position="top-center" closeButton />
      </SidebarProvider>
    </ApprovalCountsProvider>
  );
}
