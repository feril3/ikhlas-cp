import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  IconArrowDown,
  IconArrowUp,
  IconClipboardCheck,
  IconMenu2,
  IconPlus,
  IconReceipt,
  IconSmartHome
} from '@/components/icons.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { isActive, reviewLabel } from '@/components/app/navigation.js';
import { useActionCount } from '@/features/approvals/ApprovalCountsContext.jsx';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

function NavItem({ to, label, icon: Icon, badge = 0 }) {
  const { pathname } = useLocation();
  const active = isActive(pathname, to);
  return (
    <NavLink
      to={to}
      end={to === '/'}
      aria-current={active ? 'page' : undefined}
      className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5 text-2xs font-medium text-muted-foreground aria-[current=page]:text-foreground"
    >
      <span className={cn('relative flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-(--duration-fast)', active && 'bg-inverse text-inverse-foreground')}>
        <Icon className="size-5" />
        {badge > 0 && (
          <span className="absolute -top-1 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-2xs font-semibold text-primary-foreground tabular-nums ring-2 ring-background">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className="max-w-full truncate">{label}</span>
      {badge > 0 && <span className="sr-only">, {badge} pengajuan</span>}
    </NavLink>
  );
}

// Bilah navigasi bawah untuk ponsel dan tablet (di bawah 1024px).
export function MobileNav() {
  const { user } = useAuth();
  const actionCount = useActionCount();
  const { setOpenMobile } = useSidebar();
  const [addOpen, setAddOpen] = useState(false);
  const canAdd = ['ADMIN', 'TREASURER'].includes(user?.role);

  return (
    <>
      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[var(--safe-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex h-(--bottom-nav-height) max-w-xl items-stretch px-1">
          <NavItem to="/" label="Beranda" icon={IconSmartHome} />
          <NavItem to="/transactions" label="Transaksi" icon={IconReceipt} />
          {canAdd && (
            <div className="flex flex-1 items-center justify-center">
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="touch-target flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift transition-transform duration-(--duration-fast) active:scale-95 motion-reduce:active:scale-100"
              >
                <IconPlus className="size-6" />
                <span className="sr-only">Catat transaksi</span>
              </button>
            </div>
          )}
          <NavItem to="/approvals" label={user?.role === 'ADMIN' ? 'Review' : 'Pengajuan'} icon={IconClipboardCheck} badge={actionCount} />
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5 text-2xs font-medium text-muted-foreground"
          >
            <span className="flex h-7 w-12 items-center justify-center"><IconMenu2 className="size-5" /></span>
            <span>Lainnya</span>
          </button>
        </div>
      </nav>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom">
          <SheetHeader className="pb-2">
            <SheetTitle>Catat transaksi</SheetTitle>
            <SheetDescription>
              {user?.role === 'TREASURER'
                ? 'Transaksi akan dikirim ke Ketua untuk direview sebelum masuk saldo.'
                : 'Transaksi dari Ketua/Admin langsung masuk saldo.'}
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            {[
              { to: '/transactions/income', label: 'Kas masuk', hint: 'Infak, donasi, kotak amal', icon: IconArrowDown },
              { to: '/transactions/expense', label: 'Kas keluar', hint: 'Wajib foto bukti', icon: IconArrowUp }
            ].map(({ to, label, hint, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setAddOpen(false)}
                className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-card transition-shadow duration-(--duration-fast) hover:shadow-lift"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-foreground"><Icon className="size-5" /></span>
                <span>
                  <span className="block text-md font-semibold">{label}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export { reviewLabel };
