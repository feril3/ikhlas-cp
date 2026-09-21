import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  CircleDollarSign,
  LayoutDashboard,
  Menu,
  Monitor,
  ReceiptText,
  X
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transaksi', icon: ReceiptText },
  { to: '/transactions/income', label: 'Kas Masuk', icon: ArrowDownToLine },
  { to: '/transactions/expense', label: 'Kas Keluar', icon: ArrowUpFromLine },
  { to: '/schedule', label: 'Jadwal & Kegiatan', icon: CalendarDays },
  { to: '/public-display', label: 'Public Display', icon: Monitor }
];

function Brand() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark" aria-hidden="true"><CircleDollarSign size={22} /></div>
      <div>
        <strong>IKHLAS</strong>
        <span>Manajemen Masjid</span>
      </div>
    </div>
  );
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav className="side-nav" aria-label="Navigasi utama">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-profile">
          <div className="avatar">FA</div>
          <div><strong>Feril Alif</strong><span>Admin / Pengurus</span></div>
        </div>
      </aside>

      <div className="app-main">
        <header className="mobile-header">
          <Brand />
          <button className="icon-button" onClick={() => setMenuOpen(true)} aria-label="Buka menu"><Menu size={22} /></button>
        </header>
        <main className="page-container"><Outlet /></main>
      </div>

      {menuOpen && (
        <div className="mobile-menu-layer" role="dialog" aria-modal="true" aria-label="Menu navigasi">
          <button className="menu-backdrop" onClick={() => setMenuOpen(false)} aria-label="Tutup menu" />
          <div className="mobile-drawer">
            <div className="drawer-head"><Brand /><button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Tutup menu"><X size={22} /></button></div>
            <nav className="side-nav">
              {navigation.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <Icon size={19} /><span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
