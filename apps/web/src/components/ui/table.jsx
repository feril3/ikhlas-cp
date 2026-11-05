import * as React from 'react';
import { cn } from '@/lib/utils';

const Table = React.forwardRef(function Table({ className, ...props }, ref) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
});
const TableHeader = React.forwardRef(function TableHeader({ className, ...props }, ref) {
  return <thead ref={ref} className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />;
});
const TableBody = React.forwardRef(function TableBody({ className, ...props }, ref) {
  return <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
});
const TableRow = React.forwardRef(function TableRow({ className, ...props }, ref) {
  return <tr ref={ref} className={cn('border-b border-border transition-colors duration-(--duration-fast) hover:bg-accent', className)} {...props} />;
});
const TableHead = React.forwardRef(function TableHead({ className, ...props }, ref) {
  return <th ref={ref} className={cn('h-(--table-row-height) px-(--table-cell-padding-x) text-left align-middle text-xs font-medium text-muted-foreground', className)} {...props} />;
});
const TableCell = React.forwardRef(function TableCell({ className, ...props }, ref) {
  return <td ref={ref} className={cn('h-(--table-row-height) px-(--table-cell-padding-x) py-2 align-middle', className)} {...props} />;
});

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
