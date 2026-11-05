import * as React from 'react';
import { cn } from '@/lib/utils';

function Card({ className, ...props }) {
  return <section className={cn('rounded-2xl bg-card text-card-foreground shadow-card', className)} {...props} />;
}
function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />;
}
function CardTitle({ className, ...props }) {
  return <h2 className={cn('text-md font-semibold tracking-tight', className)} {...props} />;
}
function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}
function CardContent({ className, ...props }) {
  return <div className={cn('p-5 pt-2', className)} {...props} />;
}
function CardFooter({ className, ...props }) {
  return <div className={cn('flex items-center p-5 pt-0', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
