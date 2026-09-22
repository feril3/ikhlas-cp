import * as React from 'react';
import { IconChevronRight } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

function Breadcrumb({ ...props }) {
  return <nav aria-label="breadcrumb" {...props} />;
}
function BreadcrumbList({ className, ...props }) {
  return <ol className={cn('flex flex-wrap items-center gap-1 text-sm text-muted-foreground', className)} {...props} />;
}
function BreadcrumbItem({ className, ...props }) {
  return <li className={cn('inline-flex items-center gap-1', className)} {...props} />;
}
function BreadcrumbLink({ className, ...props }) {
  return <a className={cn('transition-colors hover:text-foreground', className)} {...props} />;
}
function BreadcrumbPage({ className, ...props }) {
  return <span aria-current="page" className={cn('font-medium text-foreground', className)} {...props} />;
}
function BreadcrumbSeparator({ children, ...props }) {
  return <li role="presentation" aria-hidden="true" {...props}>{children ?? <IconChevronRight className="size-4" />}</li>;
}

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator };
