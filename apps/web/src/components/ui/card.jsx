import * as React from 'react';
import { cn } from '@/lib/utils';

function Card({ className, ...props }) {
  return <section className={cn('rounded-xl border bg-card text-card-foreground shadow-[0_1px_2px_rgba(23,33,30,0.04)]', className)} {...props} />;
}
function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1.5 p-5 pb-3', className)} {...props} />;
}
function CardTitle({ className, ...props }) {
  return <h2 className={cn('text-base font-semibold tracking-[-0.01em]', className)} {...props} />;
}
function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm leading-5 text-muted-foreground', className)} {...props} />;
}
function CardContent({ className, ...props }) {
  return <div className={cn('p-5 pt-2', className)} {...props} />;
}
function CardFooter({ className, ...props }) {
  return <div className={cn('flex items-center p-5 pt-0', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
