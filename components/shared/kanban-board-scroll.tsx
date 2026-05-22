import type { ReactNode } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

/** Fixed width columns for boards with many columns (approvals, reminders). */
export const KANBAN_COLUMN_WIDTH_CLASS =
  "w-[300px] min-w-[300px] max-w-[300px] shrink-0"

/** Full-width columns inside a fit grid (to-do tasks: 5 columns). */
export const KANBAN_COLUMN_FIT_CLASS =
  "flex w-full min-w-0 flex-col self-start"

/** Grid row for fit boards — 5 equal columns on xl, columns size to content. */
export const KANBAN_BOARD_FIT_ROW_CLASS =
  "grid w-full min-w-0 auto-rows-auto items-start grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"

/** Grid row for fit boards — 4 equal columns on xl (reminders). */
export const KANBAN_BOARD_FIT_ROW_4_CLASS =
  "grid w-full min-w-0 auto-rows-auto items-start grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"

/** Flex row for scroll boards — horizontal overflow inside ScrollArea. */
export const KANBAN_BOARD_SCROLL_ROW_CLASS =
  "flex min-w-max items-start gap-4"

/** Drag overlay while dragging Kanban cards. */
export const KANBAN_OVERLAY_CLASS =
  "rounded-md border-2 border-dashed bg-muted/20"

type KanbanBoardShellProps = {
  children: ReactNode
  className?: string
}

/**
 * Board scroll host: horizontal ScrollArea for Kanban columns.
 */
export function KanbanBoardShell({
  children,
  className,
}: KanbanBoardShellProps) {
  return (
    <ScrollArea
      className={cn("w-full min-w-0 pb-4", className)}
      scrollbars="horizontal"
    >
      {children}
    </ScrollArea>
  )
}

/** @deprecated Use KanbanBoardShell — kept for approval/reminder imports */
export function KanbanBoardScroll({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <KanbanBoardShell className={className}>{children}</KanbanBoardShell>
}

type KanbanColumnsRowProps = {
  children: ReactNode
  className?: string
}

export function KanbanColumnsRow({
  children,
  className,
}: KanbanColumnsRowProps) {
  return (
    <div className={cn(KANBAN_BOARD_SCROLL_ROW_CLASS, className)}>
      {children}
    </div>
  )
}
