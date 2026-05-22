"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FilterBadgeProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
}

function FilterBadge({
  active = false,
  className,
  type = "button",
  ...props
}: FilterBadgeProps) {
  return (
    <Button
      type={type}
      variant={active ? "default" : "outline"}
      size="sm"
      aria-pressed={active}
      data-active={active}
      className={cn(
        "h-9 shrink-0 rounded-full px-3 shadow-none hover:translate-x-0 hover:translate-y-0 hover:shadow-none active:translate-x-0 active:translate-y-0",
        className
      )}
      {...props}
    />
  )
}

export { FilterBadge }
