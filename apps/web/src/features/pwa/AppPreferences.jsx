import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { IconBell, IconDeviceMobile, IconShare, IconX } from '@/components/icons.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenuGroup, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { disablePush, enablePush, isIos, isStandalone, onInstallAvailable, promptInstall, pushStatus } from '@/lib/pwa.js';

const DISMISS_KEY = 'ikhlas.pwa-card-dismissed';

export function usePwaState() {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [push, setPush] = useState('loading');

  useEffect(() => onInstallAvailable(setCanInstall), []);
  useEffect(() => {
    const media = window.matchMedia?.('(display-mode: standalone)');
    const update = () => setInstalled(isStandalone());
    media?.addEventListener?.('change', update);
    return () => media?.removeEventListener?.('change', update);
  }, []);

  const refreshPush = useCallback(() => pushStatus().then(setPush).catch(() => setPush('unsupported')), []);
  useEffect(() => { refreshPush(); }, [refreshPush]);

  async function install() {
    if (await promptInstall()) toast.success('Aplikasi IKHLAS terpasang di perangkat ini.');
  }

  async function togglePush() {
    try {
      setPush(push === 'on' ? await disablePush() : await enablePush());
      toast.success(push === 'on' ? 'Notifikasi dimatikan di perangkat ini.' : 'Notifikasi aktif di perangkat ini.');
    } catch (error) {
      toast.error('Notifikasi belum bisa diaktifkan.', { description: error.message });
      refreshPush();
    }
  }

  return { canInstall, installed, iosNeedsInstall: isIos() && !installed, push, install, togglePush };
}

function notifyCopy(role) {
  return role === 'ADMIN'
    ? 'Dapat kabar setiap ada pengajuan transaksi yang perlu Anda review.'
    : 'Dapat kabar saat pengajuan Anda disetujui atau perlu revisi.';
}

// Isi menu akun: pasang aplikasi dan atur notifikasi di perangkat ini.
export function AppPreferences() {
  const { canInstall, installed, push, install, togglePush } = usePwaState();
  const pushToggleable = push === 'on' || push === 'off';
  if (installed && !pushToggleable) return null;
  return (
    <DropdownMenuGroup>
      {!installed && canInstall && (
        <DropdownMenuItem onSelect={install}><IconDeviceMobile /> Pasang aplikasi</DropdownMenuItem>
      )}
      {pushToggleable && (
        <DropdownMenuItem onSelect={togglePush}>
          <IconBell /> {push === 'on' ? 'Matikan notifikasi' : 'Aktifkan notifikasi'}
        </DropdownMenuItem>
      )}
    </DropdownMenuGroup>
  );
}

// Kartu di Beranda: muncul sampai aplikasi terpasang dan notifikasi aktif, atau sampai ditutup.
export function PwaSetupCard() {
  const { user } = useAuth();
  const { canInstall, installed, iosNeedsInstall, push, install, togglePush } = usePwaState();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  const showInstall = !installed && (canInstall || iosNeedsInstall);
  const showPush = push === 'off';
  if (dismissed || push === 'loading' || (!showInstall && !showPush)) return null;

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* penyimpanan lokal tidak tersedia */ }
  }

  return (
    <Card className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-foreground">
        {showInstall ? <IconDeviceMobile className="size-5" /> : <IconBell className="size-5" />}
      </span>
      <div className="min-w-0 flex-1 pr-8 sm:pr-0">
        <h2 className="text-md font-semibold tracking-tight">
          {showInstall ? 'Pasang IKHLAS di ponsel Anda' : 'Aktifkan notifikasi'}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {showInstall
            ? iosNeedsInstall
              ? 'Di Safari, ketuk Bagikan lalu "Tambah ke Layar Utama". Notifikasi di iPhone hanya berjalan dari aplikasi yang terpasang.'
              : 'Buka lebih cepat dari layar utama, seperti aplikasi biasa.'
            : notifyCopy(user?.role)}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {showInstall && canInstall && <Button onClick={install}><IconDeviceMobile /> Pasang aplikasi</Button>}
        {showInstall && iosNeedsInstall && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><IconShare /> Bagikan → Tambah ke Layar Utama</span>
        )}
        {!showInstall && showPush && <Button onClick={togglePush}><IconBell /> Aktifkan notifikasi</Button>}
      </div>
      <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" onClick={dismiss} aria-label="Tutup saran">
        <IconX />
      </Button>
    </Card>
  );
}
