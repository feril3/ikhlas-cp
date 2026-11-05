import {
  IconAdjustments,
  IconCalendarEvent,
  IconChartBar,
  IconClipboardCheck,
  IconReceipt,
  IconSmartHome
} from '@/components/icons.jsx';

// Satu sumber menu untuk sidebar desktop, bilah bawah ponsel, dan judul halaman.
export function reviewLabel(role) {
  return role === 'ADMIN' ? 'Perlu review' : 'Pengajuan saya';
}

export function navGroups(role) {
  return [
    { label: '', items: [{ to: '/', label: 'Beranda', icon: IconSmartHome }] },
    {
      label: 'Keuangan',
      items: [
        { to: '/transactions', label: 'Transaksi', icon: IconReceipt },
        { to: '/approvals', label: reviewLabel(role), icon: IconClipboardCheck, badge: true },
        { to: '/reports', label: 'Laporan', icon: IconChartBar }
      ]
    },
    { label: 'Kegiatan', items: [{ to: '/schedule', label: 'Jadwal & agenda', icon: IconCalendarEvent }] },
    role === 'ADMIN'
      ? { label: 'Administrasi', items: [{ to: '/settings', label: 'Pengaturan', icon: IconAdjustments }] }
      : null
  ].filter(Boolean);
}

const TITLES = {
  '/': 'Beranda',
  '/transactions': 'Transaksi',
  '/transactions/income': 'Catat kas masuk',
  '/transactions/expense': 'Catat kas keluar',
  '/reports': 'Laporan',
  '/schedule': 'Jadwal & agenda',
  '/settings': 'Pengaturan'
};

export function pageTitle(pathname, role) {
  if (pathname.startsWith('/approvals')) return reviewLabel(role);
  return TITLES[pathname] ?? 'IKHLAS';
}

export function isActive(pathname, to) {
  if (to === '/') return pathname === '/';
  if (to === '/transactions') return pathname === '/transactions';
  return pathname.startsWith(to);
}
