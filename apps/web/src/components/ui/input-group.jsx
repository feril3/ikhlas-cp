import { cn } from '@/lib/utils';

function InputGroup({ className, ...props }) {
  return <div className={cn('flex min-h-12 items-center rounded-md border border-input bg-card transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/15', className)} {...props} />;
}
function InputGroupAddon({ className, ...props }) {
  return <div className={cn('flex shrink-0 items-center px-3 text-sm font-semibold text-muted-foreground', className)} {...props} />;
}
function InputGroupInput({ className, ...props }) {
  return <input className={cn('min-w-0 flex-1 border-0 bg-transparent px-0 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground', className)} {...props} />;
}
function InputGroupTextarea({ className, ...props }) {
  return <textarea className={cn('min-w-0 flex-1 resize-y border-0 bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground', className)} {...props} />;
}

export { InputGroup, InputGroupAddon, InputGroupInput, InputGroupTextarea };
