
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border border-transparent px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm gap-1.5",
  {
    variants: {
      variant: {
        default:
          "bg-primary/30 text-primary-foreground hover:bg-primary/40",
        secondary:
          "bg-muted text-muted-foreground hover:bg-muted/80",
        destructive:
          "border-transparent bg-destructive/80 text-destructive-foreground hover:bg-destructive/90",
        outline: "text-foreground border-border",
        success:
          "border-transparent bg-success/80 text-success-foreground hover:bg-success/90",
        warning:
          "border-transparent bg-warning/80 text-warning-foreground hover:bg-warning/90",
        info:
          "border-transparent bg-info/80 text-info-foreground hover:bg-info/90",
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
