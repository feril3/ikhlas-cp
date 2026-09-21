import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  CircleDollarSign,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  ReceiptText,
  Settings,
  X
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transaksi', icon: ReceiptText },
  { to: '/transactions/income', label: 'Kas Masuk', icon: ArrowDownToLine },
  { to: '/transactions/expense', label: 'Kas Keluar', icon: ArrowUpFromLine },
  { to: '/reports', label: 'Laporan', icon: FileBarChart },
  { to: '/schedule', label: 'Jadwal & Kegiatan', icon: CalendarDays },
  { to: '/settings', label: 'Pengaturan', icon: Settings, roles: ['ADMIN'] },
  { to: '/public-display', label: 'Public Display', icon: Monitor, external: true }
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

function UserProfile({ compact = false }) {
  const { user, logout } = useAuth();
  const initials = user?.name
    ?.split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'IK';

  return (
    <div className={compact ? 'sidebar-profile compact' : 'sidebar-profile'}>
      <div className="avatar">{initials}</div>
      <div className="profile-copy">
        <strong>{user?.name}</strong>
        <span>{user?.role === 'ADMIN' ? 'Admin / Pengurus' : 'Bendahara'}</span>
      </div>
      <button className="profile-logout" onClick={logout} title="Logout" aria-label="Logout">
        <LogOut size={17} />
      </button>
    </div>
  );
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const allowedNavigation = navigation.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav className="side-nav" aria-label="Navigasi utama">
          {allowedNavigation.map(({ to, label, icon: Icon, external }) => (
            <NavLink
              key={to}
              to={to}
              target={external ? '_blank' : undefined}
              rel={external ? 'noreferrer' : undefined}
              end={to === '/'}
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <UserProfile />
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
              {allowedNavigation.map(({ to, label, icon: Icon, external }) => (
                <NavLink
                  key={to}
                  to={to}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noreferrer' : undefined}
                  end={to === '/'}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                >
                  <Icon size={19} /><span>{label}</span>
                </NavLink>
              ))}
            </nav>
            <UserProfile compact />
          </div>
        </div>
      )}
    </div>
  );
}
