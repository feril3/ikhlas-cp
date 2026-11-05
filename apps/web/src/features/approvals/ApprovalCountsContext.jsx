import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api.js';
import { useAuth } from '@/auth/AuthContext.jsx';

// Jumlah pengajuan untuk badge navigasi. Diperbarui tiap 60 detik, saat aplikasi kembali dibuka,
// saat notifikasi push masuk, dan setelah pengguna mereview atau mengirim pengajuan.
const ApprovalCountsContext = createContext({ pendingReview: 0, revisionRequired: 0, refresh: () => {} });

export function ApprovalCountsProvider({ children }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ pendingReview: 0, revisionRequired: 0 });

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setCounts(await api.notificationSummary());
    } catch {
      // Badge bersifat bantuan; kegagalan jaringan tidak perlu mengganggu pengguna.
    }
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    const onMessage = (event) => event.data?.type === 'push-received' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, [refresh, user]);

  // Angka di ikon aplikasi (Android/desktop yang mendukung Badging API).
  useEffect(() => {
    const total = user?.role === 'ADMIN' ? counts.pendingReview : counts.revisionRequired;
    if ('setAppBadge' in navigator) {
      (total > 0 ? navigator.setAppBadge(total) : navigator.clearAppBadge()).catch(() => {});
    }
  }, [counts, user]);

  const value = useMemo(() => ({ ...counts, refresh }), [counts, refresh]);
  return <ApprovalCountsContext.Provider value={value}>{children}</ApprovalCountsContext.Provider>;
}

export function useApprovalCounts() {
  return useContext(ApprovalCountsContext);
}

// Angka yang perlu ditindaklanjuti oleh peran pengguna saat ini.
export function useActionCount() {
  const { user } = useAuth();
  const counts = useApprovalCounts();
  return user?.role === 'ADMIN' ? counts.pendingReview : counts.revisionRequired;
}
