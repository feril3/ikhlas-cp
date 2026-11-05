import { cn } from "@/lib/utils"
import { IconLoader } from "@/components/icons.jsx"

function Spinner({
  className,
  ...props
}) {
  return (
    <IconLoader data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
