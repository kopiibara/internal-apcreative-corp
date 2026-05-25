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
import { StatusBadge } from "@/components/shared/status-badge"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TaskActivityLogRecord } from "@/lib/tasks/tasks"

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
    <Card className="flex min-h-0 flex-col gap-0 py-0 shadow-none">
      <CardHeader className="shrink-0 items-center border-b-2 border-border px-4 py-3">
        <CardTitle className="text-sm font-semibold">Comments / Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        <ScrollArea
          className="h-[min(360px,45vh)] max-h-[min(360px,45vh)] min-h-0 pr-3"
          scrollbars="vertical"
        >
          {logs.length > 0 ? (
            <Timeline defaultValue={logs.length} className="w-full min-w-0">
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
                    <TimelineContent className="min-w-0 space-y-2">
                      <div className="flex min-w-0 gap-3">
                        <UserAvatar
                          profileId={log.actorProfileId}
                          name={log.actorName}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div>
                            <p className="text-sm font-semibold">
                              {log.actorName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Task activity
                            </p>
                          </div>
                          {log.fromStatus && log.toStatus ? (
                            <div className="flex flex-wrap gap-2 text-xs">
                              <StatusBadge
                                status={log.fromStatus}
                                type="task"
                                prefix="From"
                              />
                              <StatusBadge
                                status={log.toStatus}
                                type="task"
                                prefix="To"
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {log.notes ? (
                        <p className="whitespace-pre-wrap break-words rounded-lg border-2 border-border bg-muted/20 p-3 text-sm leading-relaxed">
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
            <div className="flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No activity yet.
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
