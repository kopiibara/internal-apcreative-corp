import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getTaskStatusLabel } from "@/lib/task-statuses"
import type { TaskActivityLogRecord } from "@/lib/tasks"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

const ACTION_LABELS: Record<string, string> = {
  TASK_CREATED: "Task created",
  TASK_UPDATED: "Task updated",
  TASK_DELETED: "Task deleted",
  TASK_ARCHIVED: "Task archived",
  ASSIGNMENT_CREATED: "Assignment created",
  STATUS_CHANGED: "Status changed",
  PROOF_SUBMITTED: "Proof submitted",
  PROOF_RESUBMITTED: "Proof resubmitted",
  BLOCKER_REPORTED: "Blocker reported",
  BLOCKER_CONFIRMED: "Blocker confirmed",
  BLOCKER_RESOLVED: "Blocker resolved",
  REVISION_REQUESTED: "Revision requested",
  TASK_MARKED_DONE: "Task marked done",
  TASK_REOPENED: "Task reopened",
  DEADLINE_CHANGED: "Deadline changed",
}

function formatMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata) {
    return null
  }

  const from = metadata.deadline_changed_from
  const to = metadata.deadline_changed_to

  if (typeof from === "string" || typeof to === "string") {
    const fromLabel =
      typeof from === "string" ? dateFormatter.format(new Date(from)) : "None"
    const toLabel =
      typeof to === "string" ? dateFormatter.format(new Date(to)) : "None"

    return `Deadline: ${fromLabel} to ${toLabel}`
  }

  return null
}

export function TaskActivityTimeline({
  logs,
}: {
  logs: TaskActivityLogRecord[]
}) {
  return (
    <Card className="rounded-md px-2 py-1">
      <CardHeader className="p-4">
        <CardTitle className="text-sm">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <ScrollArea className="max-h-80 pr-3" scrollbars="vertical">
          {logs.length > 0 ? (
            <Timeline defaultValue={logs.length} className="w-full">
              {logs.map((log, index) => {
                const metadataSummary = formatMetadata(log.metadata)

                return (
                  <TimelineItem key={log.id} step={index + 1}>
                    <TimelineHeader>
                      <TimelineDate>
                        {dateFormatter.format(new Date(log.createdAt))}
                      </TimelineDate>
                      <TimelineTitle>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </TimelineTitle>
                    </TimelineHeader>
                    <TimelineIndicator />
                    <TimelineSeparator />
                    <TimelineContent className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">
                          {log.actorName}
                        </span>
                        {log.fromStatus && log.toStatus ? (
                          <>
                            <Badge variant="secondary">
                              From {getTaskStatusLabel(log.fromStatus)}
                            </Badge>
                            <Badge variant="secondary">
                              To {getTaskStatusLabel(log.toStatus)}
                            </Badge>
                          </>
                        ) : null}
                      </div>

                      {log.notes ? (
                        <p className="whitespace-pre-wrap break-words rounded-md bg-muted/20 p-2 leading-relaxed">
                          {log.notes}
                        </p>
                      ) : null}

                      {metadataSummary ? (
                        <p className="text-xs text-muted-foreground">
                          {metadataSummary}
                        </p>
                      ) : null}
                    </TimelineContent>
                  </TimelineItem>
                )
              })}
            </Timeline>
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
