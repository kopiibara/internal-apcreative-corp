import type { ReactNode } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

/** Page wrapper around a kanban board screen. */
export const KANBAN_BOARD_PAGE_CLASS =
  "flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden"

/** White board card — grows to fill remaining viewport height. */
export const KANBAN_BOARD_SECTION_CLASS =
  "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden gap-2 pb-1"

/** Kanban area below filters inside the board card. */
export const KANBAN_BOARD_CONTENT_CLASS =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-0 pb-0"

/** Active kanban tab panel (boards with table/kanban tabs). */
export const KANBAN_BOARD_TAB_PANEL_CLASS =
  "mt-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"

/** Tabs root when the board lives inside a tabbed layout. */
export const KANBAN_BOARD_TABS_CLASS =
  "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"

/** Fixed width columns for boards with many columns (approvals, reminders). */
export const KANBAN_COLUMN_WIDTH_CLASS =
  "flex h-auto max-h-full w-[280px] min-w-[280px] max-w-[280px] shrink-0 flex-col self-start sm:w-[300px] sm:min-w-[300px] sm:max-w-[300px] lg:w-[370px] lg:min-w-[370px] lg:max-w-[370px]"

/** Full-width columns inside a fit grid (to-do tasks: 5 columns). */
export const KANBAN_COLUMN_FIT_CLASS =
  "flex h-auto max-h-full w-[280px] min-w-[280px] max-w-[280px] shrink-0 flex-col self-start sm:w-[300px] sm:min-w-[300px] sm:max-w-[300px] xl:w-full xl:min-w-0 xl:max-w-none"

/** Grid row for fit boards — 5 equal columns on xl, columns align top. */
export const KANBAN_BOARD_FIT_ROW_CLASS =
  "flex min-w-max items-start gap-4 xl:grid xl:w-full xl:min-w-0 xl:auto-rows-auto xl:grid-cols-5"

/** Grid row for fit boards — 4 equal columns on xl (reminders). */
export const KANBAN_BOARD_FIT_ROW_4_CLASS =
  "flex min-w-max items-start gap-4 xl:grid xl:w-full xl:min-w-0 xl:auto-rows-auto xl:grid-cols-4"

/** Flex row for scroll boards — horizontal overflow inside ScrollArea. */
export const KANBAN_BOARD_SCROLL_ROW_CLASS =
  "flex min-w-max items-start gap-4"

/** Column card: minimum height when empty, grows with cards, capped by board panel. */
export const KANBAN_COLUMN_CARD_CLASS =
  "flex h-auto max-h-full min-h-40 w-full flex-col gap-0 overflow-hidden rounded-lg py-0 shadow-none"

/** Column body when the column has cards (scrollable). */
export const KANBAN_COLUMN_BODY_CLASS = "min-h-0 flex-1 overflow-hidden"

/** Column body when the column is empty (no flex growth). */
export const KANBAN_COLUMN_EMPTY_BODY_CLASS = "overflow-hidden"

/** Padding inside the vertical column ScrollArea viewport. */
export const KANBAN_COLUMN_VIEWPORT_CLASS = "p-3 sm:p-4"

/** Vertical card list inside a Kanban column. */
export const KANBAN_COLUMN_LIST_CLASS = "flex flex-col gap-3 p-0"

/** Drag overlay while dragging Kanban cards. */
export const KANBAN_OVERLAY_CLASS =
  "rounded-sm border-2 border-dashed bg-muted"

export function kanbanColumnListClass(count: number) {
  return cn(
    KANBAN_COLUMN_LIST_CLASS,
    count === 0 ? "min-h-0 items-center justify-center py-6" : "min-h-0",
  )
}

type KanbanBoardShellProps = {
  children: ReactNode
  className?: string
}

/**
 * Board scroll host: horizontal ScrollArea for Kanban columns.
 * Fills the board body; columns align to the top and do not stretch when empty.
 */
export function KanbanBoardShell({
  children,
  className,
}: KanbanBoardShellProps) {
  return (
    <ScrollArea
      className={cn(
        "h-full min-h-0 w-full min-w-0 flex-1",
        className,
      )}
      scrollbars="horizontal"
      viewportClassName="h-full max-h-full"
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
