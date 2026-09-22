import { useState } from 'react';
import { api } from '@/lib/api.js';
import { formatDate, formatRupiah } from '@/lib/format.js';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

export function TransactionDeleteDialog({ transaction, open, onOpenChange, onDeleted, onError }) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!transaction) return;
    setBusy(true);
    try {
      await api.deleteTransaction(transaction.id);
      await onDeleted?.();
      onOpenChange(false);
    } catch (error) {
      onError?.(error);
    } finally {
      setBusy(false);
    }
  }

  if (!transaction) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus transaksi?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="mb-1 block text-foreground">{transaction.category} · {formatRupiah(transaction.amount)}</strong>
            {formatDate(transaction.transactionDate)} · {transaction.method === 'TRANSFER' ? 'Transfer' : 'Tunai'}.
            {(transaction.evidenceFileId || transaction.bankMutationFileId) && (
              <span className="mt-2 block">File bukti Google Drive tetap dipertahankan untuk audit walaupun record kas dihapus.</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={remove} disabled={busy}>{busy ? 'Menghapus...' : 'Hapus transaksi'}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
