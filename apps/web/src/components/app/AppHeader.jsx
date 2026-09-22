import { IconChevronRight } from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';
import { AppBrand } from '@/components/app/AppBrand.jsx';
import { UserMenu } from '@/components/app/UserMenu.jsx';
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
  '/': ['Dashboard'],
  '/transactions': ['Keuangan', 'Transaksi'],
  '/transactions/income': ['Keuangan', 'Kas Masuk'],
  '/transactions/expense': ['Keuangan', 'Kas Keluar'],
  '/reports': ['Keuangan', 'Laporan'],
  '/schedule': ['Operasional', 'Jadwal Jumat & Agenda'],
  '/settings': ['Administrasi', 'Pengaturan']
};

export function AppHeader() {
  const location = useLocation();
  const trail = routeMeta[location.pathname] ?? ['IKHLAS'];

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center border-b bg-background/96 px-4 backdrop-blur md:px-6">
      <div className="flex w-full items-center gap-3">
        <div className="lg:hidden">
          <SidebarTrigger mobile />
        </div>
        <div className="hidden lg:block">
          <SidebarTrigger />
        </div>

        <div className="lg:hidden">
          <AppBrand compact />
        </div>

        <Breadcrumb className="hidden min-w-0 sm:block">
          <BreadcrumbList>
            {trail.map((item, index) => (
              <span className="contents" key={item}>
                {index > 0 && <BreadcrumbSeparator><IconChevronRight className="size-3.5" /></BreadcrumbSeparator>}
                <BreadcrumbItem>
                  {index === trail.length - 1
                    ? <BreadcrumbPage>{item}</BreadcrumbPage>
                    : <BreadcrumbLink asChild><Link to="/">{item}</Link></BreadcrumbLink>}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
