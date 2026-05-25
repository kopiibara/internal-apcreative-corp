"use client"

import type { ReactNode } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type FilterBadgeGroupProps = {
  label: string
  children: ReactNode
  className?: string
  scrollable?: boolean
}

function FilterBadgeGroup({
  label,
  children,
  className,
  scrollable = true,
}: FilterBadgeGroupProps) {
  const content = (
    <div className="flex w-max min-w-full items-center gap-2 pr-3">
      {children}
    </div>
  )

  return (
    <section className={cn("min-w-0", label && "space-y-2", className)}>
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
      ) : null}
      {scrollable ? (
        <ScrollArea className={cn("w-full", label && "pb-2")} scrollbars="horizontal">
          {content}
        </ScrollArea>
      ) : (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </section>
  )
}

export { FilterBadgeGroup }
