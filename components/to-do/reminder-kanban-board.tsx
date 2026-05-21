"use client"

import { useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Archive,
  Bell,
  CheckCircle2,
  ClockAlert,
} from "lucide-react"
import { toast } from "sonner"

import { updateReminderStatus } from "@/app/admin/to-do/reminders/actions"
import { ReminderCard } from "@/components/to-do/reminder-card"
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanMoveEvent,
} from "@/components/reui/kanban"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  REMINDER_KANBAN_COLUMNS,
  type ReminderStatus,
} from "@/lib/reminder-statuses"
import type { ReminderRecord } from "@/lib/reminders"
import { cn } from "@/lib/utils"

const icons = {
  PENDING: Bell,
  DUE: ClockAlert,
  DONE: CheckCircle2,
  ARCHIVED: Archive,
}

type ReminderKanbanBoardProps = {
  reminders: ReminderRecord[]
}

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
    <ScrollArea
      className="h-full min-h-0 w-full min-w-0 flex-1 pb-3"
      scrollbars="horizontal"
    >
      <Kanban
        value={columns}
        onValueChange={() => undefined}
        getItemValue={(reminder) => String(reminder.id)}
        onMove={handleMove}
      >
        <KanbanBoard className="flex h-full min-w-max gap-4 p-1">
          {REMINDER_KANBAN_COLUMNS.map((column) => {
            const Icon = icons[column.id]
            const items = columns[column.id] ?? []

            return (
              <KanbanColumn
                value={column.id}
                key={column.id}
                className="flex h-full min-h-0 min-w-[290px] w-80 shrink-0 flex-col"
              >
                <Card className="flex h-full min-h-0 flex-col rounded-md py-2 px-1">
                  <CardHeader className="shrink-0 space-y-2 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/30 text-muted-foreground">
                          <Icon className="size-4" />
                        </span>
                        <CardTitle className="truncate text-sm">
                          {column.title}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {items.length}
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {column.description}
                    </p>
                  </CardHeader>
                  <CardContent className="flex min-h-0 flex-1 flex-col px-3 py-2 pt-0">
                    <ScrollArea
                      className="h-full min-h-0 flex-1 rounded-lg border border-dashed"
                      scrollbars="vertical"
                    >
                      <div
                        className={cn(
                          "flex min-h-full flex-col gap-3 p-2 pr-3",
                          items.length === 0 &&
                            "items-center justify-center py-6"
                        )}
                      >
                        {items.length === 0 ? (
                          <p className="text-center text-xs text-muted-foreground">
                            No reminders.
                          </p>
                        ) : (
                          <KanbanColumnContent value={column.id} className="gap-3">
                            {items.map((reminder) => (
                              <KanbanItem
                                key={reminder.id}
                                value={String(reminder.id)}
                              >
                                <KanbanItemHandle>
                                  <ReminderCard reminder={reminder} />
                                </KanbanItemHandle>
                              </KanbanItem>
                            ))}
                          </KanbanColumnContent>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </KanbanColumn>
            )
          })}
        </KanbanBoard>
        <KanbanOverlay className="rounded-md border-2 border-dashed bg-muted/20" />
      </Kanban>
    </ScrollArea>
  )
}
