"use client"

import { useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updateReminderStatus } from "@/app/admin/to-do/reminders/actions"
import { ReminderCard } from "@/components/to-do/reminder-card"
import { ReminderKanbanColumn } from "@/components/to-do/reminder-kanban-column"
import {
  Kanban,
  KanbanBoard,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanMoveEvent,
} from "@/components/reui/kanban"
import {
  KanbanBoardShell,
  KANBAN_BOARD_FIT_ROW_4_CLASS,
  KANBAN_OVERLAY_CLASS,
} from "@/components/shared/kanban-board-scroll"
import {
  REMINDER_KANBAN_COLUMNS,
  type ReminderStatus,
} from "@/lib/reminders/reminder-statuses"
import type { ReminderRecord } from "@/lib/reminders/reminders"
import { cn } from "@/lib/utils"

type ReminderKanbanBoardProps = {
  reminders: ReminderRecord[]
}

const REMINDER_BOARD_ROW_CLASS = cn(KANBAN_BOARD_FIT_ROW_4_CLASS, "px-3 pb-1 sm:px-6")

export function ReminderKanbanBoard({ reminders }: ReminderKanbanBoardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const columns = useMemo(() => {
    return REMINDER_KANBAN_COLUMNS.reduce<Record<ReminderStatus, ReminderRecord[]>>(
      (result, column) => {
        result[column.id] = reminders.filter(
          (reminder) => reminder.status === column.id
        )
        return result
      },
      {
        PENDING: [],
        DUE: [],
        DONE: [],
        ARCHIVED: [],
      }
    )
  }, [reminders])

  function handleMove({
    activeContainer,
    overContainer,
    activeIndex,
  }: KanbanMoveEvent) {
    if (activeContainer === overContainer || isPending) {
      return
    }

    const reminder = columns[activeContainer as ReminderStatus]?.[activeIndex]

    if (!reminder) {
      return
    }

    const nextStatus = overContainer as ReminderStatus

    startTransition(async () => {
      const result = await updateReminderStatus({
        reminderId: reminder.id,
        status: nextStatus,
      })

      if (result.success) {
        toast.success(result.message)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <KanbanBoardShell>
      <Kanban
        value={columns}
        onValueChange={() => undefined}
        getItemValue={(reminder) => String(reminder.id)}
        onMove={handleMove}
      >
        <KanbanBoard className={REMINDER_BOARD_ROW_CLASS}>
          {REMINDER_KANBAN_COLUMNS.map((column) => {
            const items = columns[column.id] ?? []

            return (
              <ReminderKanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                count={items.length}
              >
                {items.map((reminder) => (
                  <KanbanItem key={reminder.id} value={String(reminder.id)}>
                    <KanbanItemHandle>
                      <ReminderCard reminder={reminder} />
                    </KanbanItemHandle>
                  </KanbanItem>
                ))}
              </ReminderKanbanColumn>
            )
          })}
        </KanbanBoard>
        <KanbanOverlay className={KANBAN_OVERLAY_CLASS} />
      </Kanban>
    </KanbanBoardShell>
  )
}
