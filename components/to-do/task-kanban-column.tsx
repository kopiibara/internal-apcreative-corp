import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle,
  Clock,
  RotateCcw,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  KanbanColumn,
  KanbanColumnContent,
} from "@/components/reui/kanban"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getTaskKanbanStageConfig } from "@/lib/task-kanban-status"
import type { TaskAssignmentStatus } from "@/lib/task-type"
import { cn } from "@/lib/utils"

type TaskKanbanColumnProps = {
  id: TaskAssignmentStatus
  title: string
  description: string
  count: number
  enableDrag?: boolean
  children: React.ReactNode
}

const stageIcons = {
  Clock,
  AlertTriangle,
  CheckCircle,
  BadgeCheck,
  RotateCcw,
}

const EMPTY_COLUMN_MESSAGES: Record<TaskAssignmentStatus, string> = {
  ASSIGNED: "No assigned tasks.",
  BLOCKER: "No blocker tasks.",
  PENDING: "No pending tasks.",
  REVISION: "No revision tasks.",
  DONE: "No completed tasks.",
}

export function TaskKanbanColumn({
  id,
  title,
  description,
  count,
  enableDrag = false,
  children,
}: TaskKanbanColumnProps) {
  const config = getTaskKanbanStageConfig(id)
  const Icon = stageIcons[config.icon as keyof typeof stageIcons]
  const content = (
      <Card className="flex h-full min-h-0 flex-col rounded-md py-2 px-1">
        <CardHeader className="shrink-0 space-y-2 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md border",
                  config.toneClassName
                )}
              >
                <Icon className="size-4" />
              </span>
              <CardTitle className="truncate text-sm">{title}</CardTitle>
            </div>
            <Badge
              variant="outline"
              className={cn("shrink-0", config.badgeClassName)}
            >
              {count}
            </Badge>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
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
                count === 0 && "items-center justify-center py-6"
              )}
            >
              {count === 0 ? (
                <p className="text-center text-xs text-muted-foreground">
                  {EMPTY_COLUMN_MESSAGES[id]}
                </p>
              ) : enableDrag ? (
                <KanbanColumnContent value={id} className="gap-3">
                  {children}
                </KanbanColumnContent>
              ) : (
                children
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
  )

  if (enableDrag) {
    return (
      <KanbanColumn
        value={id}
        className="flex h-full min-h-0 min-w-[290px] w-80 shrink-0 flex-col"
      >
        {content}
      </KanbanColumn>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-[290px] w-80 shrink-0 flex-col">
      {content}
    </div>
  )
}
