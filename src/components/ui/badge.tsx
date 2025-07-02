
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-transparent px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-md gap-1.5",
  {
    variants: {
      variant: {
        default:
          "bg-primary/20 text-primary-foreground hover:bg-primary/30",
        secondary:
          "bg-muted text-muted-foreground hover:bg-muted/80",
        destructive:
          "bg-destructive/20 text-destructive hover:bg-destructive/30",
        outline: "text-foreground",
        success:
          "bg-success/20 text-success hover:bg-success/30",
        warning:
          "bg-warning/20 text-warning-foreground hover:bg-warning/30",
        info:
          "bg-info/20 text-info hover:bg-info/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
