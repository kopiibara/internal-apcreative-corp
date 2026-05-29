"use client"

import type { ReactNode } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export const DATA_TABLE_SCROLL_AREA_CLASS =
  "h-[calc(100vh-24rem)] min-h-[320px] max-h-[620px] w-full rounded-lg border-2 border-border"

export const DATA_TABLE_HEADER_CLASS =
  "sticky top-0 z-20 bg-card shadow-[0_2px_0_0_var(--border)]"

export const DATA_TABLE_BODY_CLASS = "bg-card"

type DataTableScrollAreaProps = {
  children: ReactNode
  className?: string
}

export function DataTableScrollArea({
  children,
  className,
}: DataTableScrollAreaProps) {
  return (
    <ScrollArea
      className={cn(DATA_TABLE_SCROLL_AREA_CLASS, className)}
      scrollbars="both"
      viewportClassName="rounded-lg"
    >
      {children}
    </ScrollArea>
  )
}
