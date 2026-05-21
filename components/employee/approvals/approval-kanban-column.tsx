import {
  BadgeCheck,
  CalendarClock,
  CheckCheck,
  CheckCircle,
  Clock,
  RotateCcw,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { EmployeeApprovalKanbanColumnId } from "@/lib/approval-kanban"
import { getEmployeeKanbanStageConfig } from "@/lib/approval-kanban-status"
import { cn } from "@/lib/utils"

type EmployeeApprovalKanbanColumnProps = {
  id: EmployeeApprovalKanbanColumnId
  title: string
  description: string
  count: number
  children: React.ReactNode
}

const stageIcons = {
  Clock,
  CheckCircle,
  BadgeCheck,
  RotateCcw,
  XCircle,
  CalendarClock,
  CheckCheck,
}

export function EmployeeApprovalKanbanColumn({
  id,
  title,
  description,
  count,
  children,
}: EmployeeApprovalKanbanColumnProps) {
  const config = getEmployeeKanbanStageConfig(id)
  const Icon = stageIcons[config.icon as keyof typeof stageIcons]

  return (
    <div className="flex h-full min-h-0 min-w-[290px] w-80 shrink-0 flex-col">
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
            className="min-h-0 flex-1 rounded-lg border border-dashed"
            scrollbars="vertical"
          >
            <div
              className={cn(
                "flex flex-col gap-3 p-2 pr-3",
                count === 0 && "items-center justify-center py-6"
              )}
            >
              {count === 0 ? (
                <p className="text-center text-xs text-muted-foreground">
                  No submissions here.
                </p>
              ) : (
                children
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
