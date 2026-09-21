import { ArrowDownLeft, ArrowUpRight, Paperclip } from 'lucide-react';
import { formatDate, formatRupiah } from '../lib/format.js';

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
          {transaction.evidencePath && <><span>•</span><Paperclip size={13} /></>}
        </div>
        {!compact && transaction.description && <p>{transaction.description}</p>}
      </div>
    </article>
  );
}
