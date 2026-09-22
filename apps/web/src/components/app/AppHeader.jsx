import { Fragment } from 'react';
import { IconDeviceTv } from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';
import { UserMenu } from '@/components/app/UserMenu.jsx';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';

const routeMeta = {
  '/': ['Overview', 'Dashboard'],
  '/transactions': ['Keuangan', 'Transaksi'],
  '/transactions/income': ['Keuangan', 'Kas Masuk'],
  '/transactions/expense': ['Keuangan', 'Kas Keluar'],
  '/reports': ['Keuangan', 'Laporan'],
  '/schedule': ['Operasional', 'Jadwal Jumat & Agenda'],
  '/settings': ['Administrasi', 'Pengaturan']
};

function sectionDestination(section) {
  if (section === 'Keuangan') return '/transactions';
  if (section === 'Operasional') return '/schedule';
  if (section === 'Administrasi') return '/settings';
  return '/';
}

export function AppHeader() {
  const location = useLocation();
  const trail = routeMeta[location.pathname] ?? ['IKHLAS'];

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <SidebarTrigger mobile className="lg:hidden" />
        <SidebarTrigger className="hidden lg:inline-flex" />

        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList className="flex-nowrap text-xs sm:text-sm">
            {trail.map((item, index) => (
              <Fragment key={item}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem className={index === 0 ? 'hidden sm:inline-flex' : 'min-w-0'}>
                  {index === trail.length - 1
                    ? <BreadcrumbPage className="truncate">{item}</BreadcrumbPage>
                    : (
                      <BreadcrumbLink asChild>
                        <Link to={sectionDestination(item)}>{item}</Link>
                      </BreadcrumbLink>
                    )
                  }
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        <Button variant="outline" size="sm" asChild className="hidden md:inline-flex">
          <Link to="/public-display" target="_blank" rel="noreferrer">
            <IconDeviceTv data-icon="inline-start" aria-hidden="true" />
            Tampilan Publik
          </Link>
        </Button>

        <UserMenu />
      </div>
    </header>
  );
}
