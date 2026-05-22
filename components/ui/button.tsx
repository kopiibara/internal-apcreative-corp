import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-base text-sm font-semibold ring-offset-white transition-all gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-2 border-border bg-blue text-white shadow-[var(--shadow-hard-sm)] hover:translate-x-px hover:translate-y-px hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        noShadow: "border-2 border-border bg-blue text-white shadow-none",
        neutral:
          "border-2 border-border bg-secondary-background text-foreground shadow-[var(--shadow-hard-sm)] hover:translate-x-px hover:translate-y-px hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        secondary:
          "border-2 border-border bg-secondary-background text-foreground shadow-[var(--shadow-hard-sm)] hover:translate-x-px hover:translate-y-px hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        outline:
          "border-2 border-border bg-background text-foreground shadow-none hover:bg-muted/60 active:translate-x-px active:translate-y-px",
        ghost:
          "bg-transparent text-foreground shadow-none hover:bg-muted/60 active:translate-x-px active:translate-y-px",
        destructive:
          "border-2 border-border bg-destructive text-destructive-foreground shadow-[var(--shadow-hard-sm)] hover:translate-x-px hover:translate-y-px hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        reverse:
          "border-2 border-border bg-blue text-white shadow-none hover:shadow-[var(--shadow-hard-sm)] active:translate-x-px active:translate-y-px",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
