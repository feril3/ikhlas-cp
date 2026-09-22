import { cn } from '@/lib/utils';

function FieldGroup({ className, ...props }) {
  return <div className={cn('flex flex-col gap-4', className)} {...props} />;
}
function Field({ className, ...props }) {
  return <div className={cn('flex min-w-0 flex-col gap-1.5', className)} {...props} />;
}
function FieldLabel({ className, ...props }) {
  return <label className={cn('text-xs font-semibold text-foreground', className)} {...props} />;
}
function FieldDescription({ className, ...props }) {
  return <span className={cn('text-[11px] leading-4 text-muted-foreground', className)} {...props} />;
}
function FieldError({ className, ...props }) {
  return <span className={cn('text-[11px] leading-4 text-destructive', className)} {...props} />;
}
function FieldSet({ className, ...props }) {
  return <fieldset className={cn('m-0 min-w-0 border-0 p-0', className)} {...props} />;
}
function FieldLegend({ className, ...props }) {
  return <legend className={cn('mb-1.5 text-xs font-semibold text-foreground', className)} {...props} />;
}

export { FieldGroup, Field, FieldLabel, FieldDescription, FieldError, FieldSet, FieldLegend };
