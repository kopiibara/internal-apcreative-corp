import type { ReactNode } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

/** Page wrapper around a kanban board screen. */
export const KANBAN_BOARD_PAGE_CLASS =
  "flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden"

/** White board card — grows to fill remaining viewport height. */
export const KANBAN_BOARD_SECTION_CLASS =
  "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden gap-2"

/** Kanban area below filters inside the board card. */
export const KANBAN_BOARD_CONTENT_CLASS =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-0 pb-0"

/** Max height for a kanban board panel inside a dashboard page. */
export const KANBAN_BOARD_MAX_HEIGHT_CLASS =
  "max-h-[min(65dvh,calc(100dvh-20rem))]"

/** Active kanban tab panel (boards with table/kanban tabs). */
export const KANBAN_BOARD_TAB_PANEL_CLASS =
  "mt-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"

/** Tabs root when the board lives inside a tabbed layout. */
export const KANBAN_BOARD_TABS_CLASS =
  "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"

/** Fixed width columns for boards with many columns (approvals, reminders). */
export const KANBAN_COLUMN_WIDTH_CLASS =
  "flex h-full min-h-0 max-h-full w-[280px] min-w-[280px] max-w-[280px] shrink-0 flex-col overflow-hidden sm:w-[300px] sm:min-w-[300px] sm:max-w-[300px] lg:w-[370px] lg:min-w-[370px] lg:max-w-[370px]"

/** Full-width columns inside a fit grid (to-do tasks: 5 columns). */
export const KANBAN_COLUMN_FIT_CLASS =
  "flex h-full min-h-0 max-h-full min-w-0 w-[280px] max-w-[280px] shrink-0 flex-col overflow-hidden sm:w-[300px] sm:max-w-[300px] xl:w-full xl:min-w-0 xl:max-w-none xl:shrink"

/** Grid row for fit boards — 5 equal columns on xl, columns fill board height. */
export const KANBAN_BOARD_FIT_ROW_CLASS =
  "flex h-full max-h-full min-h-0 min-w-max items-stretch gap-4 xl:grid xl:h-full xl:max-h-full xl:w-full xl:min-w-0 xl:grid-cols-5 xl:grid-rows-1 xl:items-stretch"

/** Grid row for fit boards — 4 equal columns on xl (reminders). */
export const KANBAN_BOARD_FIT_ROW_4_CLASS =
  "flex h-full max-h-full min-h-0 min-w-max items-stretch gap-4 xl:grid xl:h-full xl:max-h-full xl:w-full xl:min-w-0 xl:grid-cols-4 xl:grid-rows-1 xl:items-stretch"

/** Flex row for scroll boards — horizontal overflow inside ScrollArea. */
export const KANBAN_BOARD_FIT_ROW_3_CLASS =
  "flex h-full max-h-full min-h-0 min-w-max items-stretch gap-4 xl:grid xl:h-full xl:max-h-full xl:w-full xl:min-w-0 xl:grid-cols-3 xl:grid-rows-1 xl:items-stretch"

export const KANBAN_BOARD_SCROLL_ROW_CLASS =
  "flex h-full max-h-full min-h-0 min-w-max items-stretch gap-4"

/** Column card: header row + scrollable body row capped to board shell height. */
export const KANBAN_COLUMN_CARD_CLASS =
  "grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-lg py-0 shadow-none"

/** Column ScrollArea root — must fill the grid body row, not grow with cards. */
export const KANBAN_COLUMN_BODY_CLASS = "h-full min-h-0 overflow-hidden"

/** @deprecated Use KANBAN_COLUMN_BODY_CLASS — empty columns use the same scroll host. */
export const KANBAN_COLUMN_EMPTY_BODY_CLASS = KANBAN_COLUMN_BODY_CLASS

/**
 * Overrides ScrollArea viewport defaults (`[&>div]:!block`) so the Radix inner
 * wrapper does not expand to full card-list height (which prevents scrolling).
 */
export const KANBAN_COLUMN_VIEWPORT_CLASS =
  "h-full max-h-full p-3 sm:p-4 [&>div]:!flex [&>div]:h-full [&>div]:min-h-0 [&>div]:w-full [&>div]:min-w-0 [&>div]:flex-col"

/** Kanban card wrapper — stretch to column width (task, reminder, etc.). */
export const KANBAN_COLUMN_ITEM_CLASS = "w-full min-w-0"

/** Board shell viewport — shared height lock for column rows. */
export const KANBAN_BOARD_SHELL_VIEWPORT_CLASS =
  "h-full max-h-full overflow-y-hidden [&>div]:!flex [&>div]:h-full [&>div]:max-h-full [&>div]:min-h-0 [&>div]:items-stretch"

/** Fixed-width columns + horizontal scroll (approvals). */
export const KANBAN_BOARD_SHELL_SCROLL_VIEWPORT_CLASS = cn(
  KANBAN_BOARD_SHELL_VIEWPORT_CLASS,
  "[&>div]:min-w-max",
)

/** Below xl: horizontal scroll; at xl: row spans full board width. */
export const KANBAN_BOARD_SHELL_FIT_VIEWPORT_CLASS = cn(
  KANBAN_BOARD_SHELL_VIEWPORT_CLASS,
  "[&>div]:min-w-max xl:[&>div]:min-w-0 xl:[&>div]:w-full",
)

/** Vertical card list inside a Kanban column. */
export const KANBAN_COLUMN_LIST_CLASS =
  "flex w-full min-w-0 flex-col gap-3 px-0 pt-0 pb-0 after:block after:h-1 after:shrink-0 after:content-['']"

/** Drag overlay while dragging Kanban cards. */
export const KANBAN_OVERLAY_CLASS =
  "rounded-sm border-2 border-dashed bg-muted"

export function kanbanColumnListClass(count: number) {
  return cn(
    KANBAN_COLUMN_LIST_CLASS,
    count === 0
      ? "min-h-full flex-1 items-center justify-center py-6"
      : "min-h-0 [&>[data-slot=kanban-item]]:w-full [&>[data-slot=kanban-item-handle]]:w-full",
  )
}

type KanbanColumnScrollAreaProps = {
  children: ReactNode
  className?: string
  viewportClassName?: string
}

/** Vertical ScrollArea for a kanban column card list. */
export function KanbanColumnScrollArea({
  children,
  className,
  viewportClassName,
}: KanbanColumnScrollAreaProps) {
  return (
    <ScrollArea
      className={cn(KANBAN_COLUMN_BODY_CLASS, className)}
      viewportClassName={cn(KANBAN_COLUMN_VIEWPORT_CLASS, viewportClassName)}
      scrollbars="vertical"
    >
      {children}
    </ScrollArea>
  )
}

type KanbanBoardShellProps = {
  children: ReactNode
  className?: string
  /**
   * `fit` — columns share the board width at xl (task/reminder boards).
   * `scroll` — fixed column widths with horizontal scroll (approvals).
   */
  columnLayout?: "fit" | "scroll"
}

/**
 * Board scroll host: horizontal ScrollArea for Kanban columns.
 * Fills the board body; column height follows the shell, not card count.
 */
export function KanbanBoardShell({
  children,
  className,
  columnLayout = "scroll",
}: KanbanBoardShellProps) {
  return (
    <ScrollArea
      className={cn(
        "h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden",
        className,
      )}
      scrollbars="horizontal"
      viewportClassName={
        columnLayout === "fit"
          ? KANBAN_BOARD_SHELL_FIT_VIEWPORT_CLASS
          : KANBAN_BOARD_SHELL_SCROLL_VIEWPORT_CLASS
      }
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
