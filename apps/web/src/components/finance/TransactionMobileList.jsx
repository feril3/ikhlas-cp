import { IconDots, IconFileText, IconPencil, IconTrash } from '@tabler/icons-react';
import { api } from '@/lib/api.js';
import { formatDate, formatRupiah } from '@/lib/format.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';

export function TransactionMobileList({ data, canManage, onEdit, onDelete }) {
  if (!data.length) {
    return <Empty><EmptyTitle>Tidak ada transaksi</EmptyTitle><EmptyDescription>Ubah filter atau catat transaksi baru.</EmptyDescription></Empty>;
  }

  return (
    <div className="divide-y">
      {data.map((transaction) => (
        <article className="p-4" key={transaction.id}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <strong className={`block text-lg font-semibold tracking-[-0.02em] tabular-nums ${transaction.type === 'INCOME' ? 'text-primary' : 'text-destructive'}`}>
                {transaction.type === 'INCOME' ? '+' : '-'}{formatRupiah(transaction.amount)}
              </strong>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant={transaction.type === 'INCOME' ? 'success' : 'destructive'}>{transaction.type === 'INCOME' ? 'Masuk' : 'Keluar'}</Badge>
                <span className="text-sm font-medium">{transaction.category}</span>
              </div>
              {transaction.sourceDetail && <span className="mt-2 block truncate text-xs text-muted-foreground">{transaction.sourceDetail}</span>}
              <div className="mt-2 text-xs text-muted-foreground">{formatDate(transaction.transactionDate)} · {transaction.method === 'TRANSFER' ? 'Transfer' : 'Tunai'}</div>
              {transaction.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{transaction.description}</p>}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><IconDots /><span className="sr-only">Aksi</span></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  {transaction.evidenceFileId && <DropdownMenuItem asChild><a href={api.attachmentUrl(transaction.id, 'evidence')} target="_blank" rel="noreferrer"><IconFileText /> Bukti transaksi</a></DropdownMenuItem>}
                  {transaction.bankMutationFileId && <DropdownMenuItem asChild><a href={api.attachmentUrl(transaction.id, 'mutation')} target="_blank" rel="noreferrer"><IconFileText /> Mutasi rekening</a></DropdownMenuItem>}
                </DropdownMenuGroup>
                {canManage && (
                  <>
                    {(transaction.evidenceFileId || transaction.bankMutationFileId) && <DropdownMenuSeparator />}
                    <DropdownMenuGroup>
                      <DropdownMenuItem onSelect={() => onEdit(transaction)}><IconPencil /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onDelete(transaction)} className="text-destructive focus:text-destructive"><IconTrash /> Hapus</DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </article>
      ))}
    </div>
  );
}
