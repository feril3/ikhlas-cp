import { useAuth } from '@/auth/AuthContext.jsx';
import { PageHeader } from '@/components/app/PageHeader.jsx';
import { TransactionApprovalPanel } from '@/features/transactions/TransactionApprovalPanel.jsx';

export default function Approvals() {
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <PageHeader
        title={admin ? 'Perlu review' : 'Pengajuan saya'}
        description={admin
          ? 'Periksa pengajuan Bendahara sebelum masuk saldo, laporan, dan Tampilan publik.'
          : 'Pengajuan baru masuk saldo setelah disetujui Ketua. Perbaiki pengajuan yang diminta revisi.'}
      />
      <TransactionApprovalPanel user={user} />
    </div>
  );
}
