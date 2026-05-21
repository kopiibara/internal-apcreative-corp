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
import type { ApprovalActivityLog } from "@/types/content-report"

type ApprovalActivityTimelineProps = {
  logs: ApprovalActivityLog[]
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function getActionLabel(action: string) {
  const labels: Record<string, string> = {
    supervisor_review_update: "Marketing Supervisor updated review",
    director_review_update: "Director updated review",
    publishing_update: "Publishing details updated",
    kanban_supervisor_status_update: "Kanban supervisor status changed",
    kanban_director_status_update: "Kanban director status changed",
    kanban_publishing_update: "Kanban publish status changed",
  }

  return labels[action] ?? action.replaceAll("_", " ")
}

function getActorRole(log: ApprovalActivityLog) {
  return log.actorPosition || log.actorAccountType
}

export function ApprovalActivityTimeline({
  logs,
}: ApprovalActivityTimelineProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Approval Timeline / Activity Logs</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <Timeline defaultValue={logs.length} className="w-full">
            {logs.map((log, index) => (
              <TimelineItem key={log.id} step={index + 1}>
                <TimelineHeader>
                  <TimelineDate>
                    {dateTimeFormatter.format(new Date(log.createdAt))}
                  </TimelineDate>
                  <TimelineTitle>{getActionLabel(log.action)}</TimelineTitle>
                </TimelineHeader>
                <TimelineIndicator />
                <TimelineSeparator />
                <TimelineContent className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {log.actorName}
                    </span>
                    <Badge variant="outline">{getActorRole(log)}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {log.fromStatus ? (
                      <Badge variant="secondary">From {log.fromStatus}</Badge>
                    ) : null}
                    {log.toStatus ? (
                      <Badge variant="secondary">To {log.toStatus}</Badge>
                    ) : null}
                  </div>

                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {log.notes}
                  </p>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </CardContent>
    </Card>
  )
}
