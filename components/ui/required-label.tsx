"use client"

import * as React from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type RequiredLabelProps = React.ComponentProps<typeof Label> & {
  required?: boolean
}

export function RequiredLabel({
  children,
  className,
  required = false,
  ...props
}: RequiredLabelProps) {
  return (
    <Label className={cn("gap-1", className)} {...props}>
      {children}
      {required ? (
        <span aria-hidden="true" className="font-bold text-destructive">
          *
        </span>
      ) : null}
    </Label>
  )
}
