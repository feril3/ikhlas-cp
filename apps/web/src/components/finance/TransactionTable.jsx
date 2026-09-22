import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import {
  IconArrowsSort,
  IconDots,
  IconExternalLink,
  IconFileText,
  IconPencil,
  IconTrash
} from '@tabler/icons-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function TransactionTable({ data, canManage, onEdit, onDelete }) {
  const [sorting, setSorting] = useState([{ id: 'transactionDate', desc: true }]);

  const columns = useMemo(() => [
    {
      accessorKey: 'transactionDate',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Tanggal <IconArrowsSort data-icon="inline-end" />
        </Button>
      ),
      cell: ({ row }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(row.original.transactionDate)}</span>
    },
    {
      accessorKey: 'category',
      header: 'Kategori / sumber',
      cell: ({ row }) => (
        <div className="min-w-[180px]">
          <strong className="block text-sm font-medium">{row.original.category}</strong>
          {row.original.sourceDetail && <span className="mt-0.5 block max-w-[260px] truncate text-[11px] text-muted-foreground">{row.original.sourceDetail}</span>}
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
      cell: ({ row }) => <Badge variant={row.original.type === 'INCOME' ? 'success' : 'destructive'}>{row.original.type === 'INCOME' ? 'Masuk' : 'Keluar'}</Badge>
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="-mr-3" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Nominal <IconArrowsSort data-icon="inline-end" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className={`whitespace-nowrap text-right text-sm font-semibold tabular-nums ${row.original.type === 'INCOME' ? 'text-primary' : 'text-destructive'}`}>
          {row.original.type === 'INCOME' ? '+' : '-'}{formatRupiah(row.original.amount)}
        </div>
      )
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><IconDots /><span className="sr-only">Aksi transaksi</span></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                {row.original.evidenceFileId && <DropdownMenuItem asChild><a href={api.attachmentUrl(row.original.id, 'evidence')} target="_blank" rel="noreferrer"><IconFileText /> Bukti transaksi <IconExternalLink className="ml-auto" /></a></DropdownMenuItem>}
                {row.original.bankMutationFileId && <DropdownMenuItem asChild><a href={api.attachmentUrl(row.original.id, 'mutation')} target="_blank" rel="noreferrer"><IconFileText /> Mutasi rekening <IconExternalLink className="ml-auto" /></a></DropdownMenuItem>}
              </DropdownMenuGroup>
              {canManage && (
                <>
                  {(row.original.evidenceFileId || row.original.bankMutationFileId) && <DropdownMenuSeparator />}
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => onEdit(row.original)}><IconPencil /> Edit</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onDelete(row.original)} className="text-destructive focus:text-destructive"><IconTrash /> Hapus</DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ], [canManage, onDelete, onEdit]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 12 } }
  });

  if (!data.length) {
    return <Empty><EmptyTitle>Tidak ada transaksi</EmptyTitle><EmptyDescription>Ubah filter atau catat transaksi baru untuk mulai mengisi riwayat kas.</EmptyDescription></Empty>;
  }

  return (
    <div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-3 border-t px-3 py-3">
        <span className="text-xs text-muted-foreground">Halaman {table.getState().pagination.pageIndex + 1} dari {Math.max(table.getPageCount(), 1)}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Sebelumnya</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Berikutnya</Button>
        </div>
      </div>
    </div>
  );
}
