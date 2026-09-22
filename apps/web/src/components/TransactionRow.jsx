import { ArrowDownLeft, ArrowUpRight, FileText, Paperclip, Pencil, Trash2 } from 'lucide-react';
import { formatDate, formatRupiah } from '../lib/format.js';
import { api } from '../lib/api.js';

export function TransactionRow({ transaction, compact = false, onEdit, onDelete, busy = false }) {
  const income = transaction.type === 'INCOME';
  const Icon = income ? ArrowDownLeft : ArrowUpRight;

  return (
    <article className={`transaction-row ${compact ? 'compact' : ''}`}>
      <div className={`transaction-icon ${income ? 'income' : 'expense'}`}><Icon size={18} /></div>
      <div className="transaction-main">
        <div className="transaction-topline">
          <strong>{transaction.category}</strong>
          <strong className={income ? 'amount-income' : 'amount-expense'}>{income ? '+' : '-'}{formatRupiah(transaction.amount)}</strong>
        </div>
        {income && transaction.sourceDetail && (
          <div className="transaction-source">Sumber: {transaction.sourceDetail}</div>
        )}
        <div className="transaction-meta">
          <span>{formatDate(transaction.transactionDate)}</span>
          <span>•</span>
          <span>{transaction.method === 'TRANSFER' ? 'Transfer' : 'Cash'}</span>
          {transaction.evidenceFileId && <><span>•</span><Paperclip size={13} /></>}
        </div>

        {!compact && transaction.description && <p>{transaction.description}</p>}

        {!compact && (transaction.evidenceFileId || transaction.bankMutationFileId) && (
          <div className="attachment-links">
            {transaction.evidenceFileId && <a href={api.attachmentUrl(transaction.id, 'evidence')} target="_blank" rel="noreferrer"><FileText size={14} /> Bukti transaksi</a>}
            {transaction.bankMutationFileId && <a href={api.attachmentUrl(transaction.id, 'mutation')} target="_blank" rel="noreferrer"><FileText size={14} /> Mutasi rekening</a>}
          </div>
        )}

        {!compact && (onEdit || onDelete) && (
          <div className="transaction-row-actions">
            {onEdit && (
              <button type="button" className="text-button" onClick={() => onEdit(transaction)} disabled={busy}>
                <Pencil size={14} /> Edit
              </button>
            )}
            {onDelete && (
              <button type="button" className="text-button danger-text-button" onClick={() => onDelete(transaction)} disabled={busy}>
                <Trash2 size={14} /> Hapus
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
