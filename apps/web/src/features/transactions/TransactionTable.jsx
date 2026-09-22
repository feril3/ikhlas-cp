import { useMemo } from 'react';
import {
  IconChevronLeft,
  IconChevronRight,
  IconDotsVertical,
  IconFileText,
  IconPencil,
  IconTrash
} from '@tabler/icons-react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable
} from '@tanstack/react-table';
import { api } from '@/lib/api.js';
import { formatDate, formatRupiah } from '@/lib/format.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

function AttachmentLinks({ transaction }) {
  if (!transaction.evidenceFileId && !transaction.bankMutationFileId) {
    return <span className="text-xs text-muted-foreground">Tidak ada</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {transaction.evidenceFileId && (
        <a
          href={api.attachmentUrl(transaction.id, 'evidence')}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <IconFileText aria-hidden="true" className="size-3.5" /> Bukti
        </a>
      )}
      {transaction.bankMutationFileId && (
        <a
          href={api.attachmentUrl(transaction.id, 'mutation')}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <IconFileText aria-hidden="true" className="size-3.5" /> Mutasi
        </a>
      )}
    </div>
  );
}

function RowActions({ transaction, canManage, busy, onEdit, onDelete }) {
  if (!canManage && !transaction.evidenceFileId && !transaction.bankMutationFileId) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={busy} aria-label={'Aksi ' + transaction.category}>
          <IconDotsVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {transaction.evidenceFileId && (
          <DropdownMenuItem asChild>
            <a href={api.attachmentUrl(transaction.id, 'evidence')} target="_blank" rel="noreferrer">
              <IconFileText aria-hidden="true" /> Buka bukti
            </a>
          </DropdownMenuItem>
        )}
        {transaction.bankMutationFileId && (
          <DropdownMenuItem asChild>
            <a href={api.attachmentUrl(transaction.id, 'mutation')} target="_blank" rel="noreferrer">
              <IconFileText aria-hidden="true" /> Buka mutasi
            </a>
          </DropdownMenuItem>
        )}
        {canManage && (transaction.evidenceFileId || transaction.bankMutationFileId) && <DropdownMenuSeparator />}
        {canManage && (
          <>
            <DropdownMenuItem onSelect={() => onEdit(transaction)}>
              <IconPencil aria-hidden="true" /> Edit transaksi
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDelete(transaction)}
              className="text-destructive focus:text-destructive"
            >
              <IconTrash aria-hidden="true" /> Hapus transaksi
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileTransactionCard({ transaction, canManage, busy, onEdit, onDelete }) {
  const income = transaction.type === 'INCOME';

  return (
    <article className="border-b px-4 py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="truncate text-sm font-semibold">{transaction.category}</strong>
            <Badge variant={income ? 'success' : 'destructive'}>{income ? 'Masuk' : 'Keluar'}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(transaction.transactionDate)} · {transaction.method === 'TRANSFER' ? 'Transfer' : 'Tunai'}
          </p>
        </div>
        <RowActions
          transaction={transaction}
          canManage={canManage}
          busy={busy}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0 text-xs leading-5 text-muted-foreground">
          {transaction.sourceDetail && <div className="truncate">{transaction.sourceDetail}</div>}
          {transaction.description && <div className="line-clamp-2">{transaction.description}</div>}
        </div>
        <strong className={income ? 'shrink-0 text-sm font-semibold text-primary' : 'shrink-0 text-sm font-semibold text-destructive'}>
          {income ? '+' : '-'}{formatRupiah(transaction.amount)}
        </strong>
      </div>

      {(transaction.evidenceFileId || transaction.bankMutationFileId) && (
        <div className="mt-3">
          <AttachmentLinks transaction={transaction} />
        </div>
      )}
    </article>
  );
}

export function TransactionTable({ data, canManage, busyId, onEdit, onDelete }) {
  const columns = useMemo(() => [
    {
      accessorKey: 'transactionDate',
      header: 'Tanggal',
      cell: ({ row }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(row.original.transactionDate)}</span>
    },
    {
      accessorKey: 'category',
      header: 'Kategori',
      cell: ({ row }) => (
        <div className="max-w-[280px]">
          <strong className="block truncate text-sm font-medium">{row.original.category}</strong>
          {row.original.sourceDetail && (
            <span className="block truncate text-xs text-muted-foreground">{row.original.sourceDetail}</span>
          )}
        </div>
      )
    },
    {
      accessorKey: 'method',
      header: 'Metode',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.method === 'TRANSFER' ? 'Transfer' : 'Tunai'}</span>
    },
    {
      accessorKey: 'type',
      header: 'Jenis',
      cell: ({ row }) => (
        <Badge variant={row.original.type === 'INCOME' ? 'success' : 'destructive'}>
          {row.original.type === 'INCOME' ? 'Masuk' : 'Keluar'}
        </Badge>
      )
    },
    {
      id: 'attachments',
      header: 'Dokumen',
      cell: ({ row }) => <AttachmentLinks transaction={row.original} />
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">Nominal</div>,
      cell: ({ row }) => (
        <div className={row.original.type === 'INCOME' ? 'whitespace-nowrap text-right font-semibold text-primary' : 'whitespace-nowrap text-right font-semibold text-destructive'}>
          {row.original.type === 'INCOME' ? '+' : '-'}{formatRupiah(row.original.amount)}
        </div>
      )
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActions
            transaction={row.original}
            canManage={canManage}
            busy={busyId === row.original.id}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      )
    }
  ], [busyId, canManage, onDelete, onEdit]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10
      }
    }
  });

  if (!data.length) {
    return (
      <Empty className="min-h-64 border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon"><IconFileText aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>Tidak ada transaksi yang cocok</EmptyTitle>
          <EmptyDescription>Ubah kata kunci atau filter untuk melihat transaksi lain.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const pageRows = table.getRowModel().rows;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const start = pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, data.length);

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden">
        {pageRows.map((row) => (
          <MobileTransactionCard
            key={row.id}
            transaction={row.original}
            canManage={canManage}
            busy={busyId === row.original.id}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-5">
        <span className="text-xs text-muted-foreground">
          {start}-{end} dari {data.length} transaksi
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Halaman sebelumnya"
          >
            <IconChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Halaman berikutnya"
          >
            <IconChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </>
  );
}
