import type { ReactNode } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

/** Fixed width columns for boards with many columns (approvals, reminders). */
export const KANBAN_COLUMN_WIDTH_CLASS =
  "w-[280px] min-w-[280px] max-w-[280px] shrink-0 sm:w-[300px] sm:min-w-[300px] sm:max-w-[300px] lg:w-[320px] lg:min-w-[320px] lg:max-w-[320px]"

/** Full-width columns inside a fit grid (to-do tasks: 5 columns). */
export const KANBAN_COLUMN_FIT_CLASS =
  "flex w-[280px] min-w-[280px] max-w-[280px] shrink-0 flex-col self-start sm:w-[300px] sm:min-w-[300px] sm:max-w-[300px] xl:w-full xl:min-w-0 xl:max-w-none"

/** Grid row for fit boards — 5 equal columns on xl, columns size to content. */
export const KANBAN_BOARD_FIT_ROW_CLASS =
  "flex min-w-max items-start gap-4 xl:grid xl:w-full xl:min-w-0 xl:auto-rows-auto xl:grid-cols-5"

/** Grid row for fit boards — 4 equal columns on xl (reminders). */
export const KANBAN_BOARD_FIT_ROW_4_CLASS =
  "flex min-w-max items-start gap-4 xl:grid xl:w-full xl:min-w-0 xl:auto-rows-auto xl:grid-cols-4"

/** Flex row for scroll boards — horizontal overflow inside ScrollArea. */
export const KANBAN_BOARD_SCROLL_ROW_CLASS =
  "flex min-w-max items-start gap-4"

/** Column card shell: fixed header, internal scrolling body. */
export const KANBAN_COLUMN_CARD_CLASS =
  "flex h-[55vh] min-h-[220px]  w-full flex-col gap-0 overflow-hidden rounded-lg py-0 shadow-none md:h-[calc(100vh-290px)]"

/** Column body wrapper around the vertical ScrollArea. */
export const KANBAN_COLUMN_BODY_CLASS = "min-h-0 flex-1 overflow-hidden"

/** Padding inside the vertical column ScrollArea viewport. */
export const KANBAN_COLUMN_VIEWPORT_CLASS = "h-full p-3 sm:p-4"

/** Vertical card list inside a Kanban column. */
export const KANBAN_COLUMN_LIST_CLASS =
  "flex min-h-full flex-col gap-3 p-0"

/** Drag overlay while dragging Kanban cards. */
export const KANBAN_OVERLAY_CLASS =
  "rounded-lg border-2 border-dashed bg-muted/20"

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
      className={cn("w-full min-w-0 pb-2", className)}
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
