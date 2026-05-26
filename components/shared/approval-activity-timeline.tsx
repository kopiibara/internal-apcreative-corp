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
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { ApprovalActivityLog } from "@/types/content-report"

type ApprovalActivityTimelineProps = {
  logs: ApprovalActivityLog[]
  className?: string
  maxHeightClassName?: string
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
    content_report_created: "Approval request created",
    ready_to_publish: "Moved to Ready to Publish",
    brand_officer_scheduled_publish: "Brand Officer scheduled publishing",
    publishing_proof_submitted: "Proof submitted",
    brand_officer_published: "Brand Officer published the request",
    kanban_supervisor_status_update: "Supervisor status changed",
    kanban_director_status_update: "Director status changed",
    kanban_publishing_update: "Publishing status changed",
  }

  return labels[action] ?? action.replaceAll("_", " ")
}

function getActorRole(log: ApprovalActivityLog) {
  return log.actorPosition || log.actorAccountType
}

export function ApprovalActivityTimeline({
  logs,
  className,
  maxHeightClassName = "h-[min(320px,45vh)] max-h-[min(320px,45vh)] min-h-0",
}: ApprovalActivityTimelineProps) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity logged yet.</p>
    )
  }

  return (
    <ScrollArea
      className={cn("w-full min-h-0", maxHeightClassName)}
      viewportClassName="min-h-0"
      scrollbars="vertical"
    >
      <Timeline defaultValue={logs.length} className={className ?? "w-full min-w-0 pr-3"}>
        {logs.map((log, index) => (
          <TimelineItem key={log.id} step={index + 1}>
            <TimelineHeader>
              <TimelineDate>
                {dateTimeFormatter.format(new Date(log.createdAt))}
              </TimelineDate>
              <TimelineTitle className="flex flex-row w-full justify-between">
                {getActionLabel(log.action)}
                <div className="flex flex-wrap gap-2 text-xs">
                  {log.fromStatus ? (
                    <StatusBadge
                      status={log.fromStatus}
                      type="approval"
                      prefix="From"
                    />
                  ) : null}
                  {log.toStatus ? (
                    <StatusBadge
                      status={log.toStatus}
                      type="approval"
                      prefix="To"
                    />
                  ) : null}
                </div>
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
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-semibold">{log.actorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.actorPosition || log.actorAccountType}
                  </p>
                </div>
              </div>

              {log.notes ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {log.notes}
                </p>
              ) : null}
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </ScrollArea>
  )
}
