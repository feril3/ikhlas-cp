import { ArrowDownLeft, ArrowUpRight, FileText, Paperclip } from 'lucide-react';
import { formatDate, formatRupiah } from '../lib/format.js';
import { api } from '../lib/api.js';

export function TransactionRow({ transaction, compact = false }) {
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
      </div>
    </article>
  );
}
