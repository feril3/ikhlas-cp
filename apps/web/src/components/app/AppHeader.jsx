import { IconDeviceTv } from '@/components/icons.jsx';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext.jsx';
import { UserMenu } from '@/components/app/UserMenu.jsx';
import { AppBrand } from '@/components/app/AppBrand.jsx';
import { pageTitle } from '@/components/app/navigation.js';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';

// Bilah atas: di desktop berisi judul dan tautan Tampilan publik; di ponsel berisi merek, judul, dan akun.
export function AppHeader() {
  const location = useLocation();
  const { user } = useAuth();
  const title = pageTitle(location.pathname, user?.role);

  return (
    <header className="sticky top-0 z-30 rounded-t-[inherit] bg-background/90 pt-[var(--safe-top)] backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="hidden lg:inline-flex" />
        <AppBrand className="min-w-0 flex-1 lg:hidden" />
        <p className="hidden min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground lg:block">{title}</p>
        <Button variant="secondary" size="sm" asChild className="hidden lg:inline-flex">
          <Link to="/public-display" target="_blank" rel="noreferrer">
            <IconDeviceTv /> Tampilan publik
          </Link>
        </Button>
        <span className="lg:hidden"><UserMenu compact /></span>
      </div>
    </header>
  );
}
