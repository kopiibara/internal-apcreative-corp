"use client"

import type { ReactNode } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export const DATA_TABLE_SCROLL_AREA_CLASS =
  "h-[calc(100vh-24rem)] min-h-[320px] max-h-[620px] w-full rounded-lg border-2 border-border bg-card"

/** Fills remaining height in a flex dashboard panel (wide-layout pages). */
export const DATA_TABLE_FILL_CLASS =
  "h-full min-h-0 max-h-full w-full min-w-0 flex-1 overflow-hidden rounded-lg border-2 border-border bg-card"

export const DATA_TABLE_VIEWPORT_CLASS =
  "h-full max-h-full rounded-lg [&>div]:min-h-0"

export const DATA_TABLE_HEADER_CLASS =
  "sticky top-0 z-20 bg-card shadow-[0_2px_0_0_var(--border)]"

export const DATA_TABLE_BODY_CLASS = "bg-card"

type DataTableScrollAreaProps = {
  children: ReactNode
  className?: string
  /** Use flex height from parent instead of a fixed viewport calc height. */
  fill?: boolean
  viewportClassName?: string
}

export function DataTableScrollArea({
  children,
  className,
  fill = false,
  viewportClassName,
}: DataTableScrollAreaProps) {
  return (
    <ScrollArea
      className={cn(
        fill ? DATA_TABLE_FILL_CLASS : DATA_TABLE_SCROLL_AREA_CLASS,
        className,
      )}
      scrollbars="both"
      viewportClassName={cn(DATA_TABLE_VIEWPORT_CLASS, viewportClassName)}
    >
      {children}
    </ScrollArea>
  )
}
