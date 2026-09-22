import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { IconChevronRight } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

function Breadcrumb({ ...props }) {
  return <nav aria-label="breadcrumb" {...props} />;
}
function BreadcrumbList({ className, ...props }) {
  return <ol className={cn('m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-sm leading-none text-muted-foreground', className)} {...props} />;
}
function BreadcrumbItem({ className, ...props }) {
  return <li className={cn('inline-flex min-w-0 items-center gap-1 leading-none', className)} {...props} />;
}
function BreadcrumbLink({ className, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'a';
  return <Comp className={cn('inline-flex items-center leading-none transition-colors hover:text-foreground', className)} {...props} />;
}
function BreadcrumbPage({ className, ...props }) {
  return <span aria-current="page" className={cn('inline-flex items-center font-medium leading-none text-foreground', className)} {...props} />;
}
function BreadcrumbSeparator({ children, className, ...props }) {
  return (
    <li
      role="presentation"
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center leading-none text-muted-foreground/70', className)}
      {...props}
    >
      {children ?? <IconChevronRight className="size-3.5" stroke={1.8} />}
    </li>
  );
}

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator };
