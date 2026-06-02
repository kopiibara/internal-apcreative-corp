"use client"

import { UserAvatar } from "@/components/shared/user-avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { formatRecentOrDateTime } from "@/lib/date-time/relative-timestamp"
import type { AccountControlLogItem } from "@/lib/auth/accounts"

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not recorded"
  }

  return formatRecentOrDateTime(value, dateTimeFormatter)
}

function formatAction(action: string) {
  if (action === "PASSWORD_RESET_TO_DEFAULT") {
    return "Password reset to default"
  }

  return action
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ")
}

function isPasswordResetLog(action: string) {
  return (
    action === "PASSWORD_RESET_TO_DEFAULT" ||
    action === "PASSWORD_FORCE_CHANGED"
  )
}

type AccountTimelineSectionProps = {
  logs: AccountControlLogItem[]
  targetFullName: string
}

export function AccountTimelineSection({
  logs,
  targetFullName,
}: AccountTimelineSectionProps) {
  if (logs.length === 0) {
    return (
      <p className="rounded-lg border-2 border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        No account activity logs yet.
      </p>
    )
  }

  return (
    <ScrollArea
      className="h-[min(360px,45vh)] min-h-0 pr-3"
      scrollbars="vertical"
    >
      <Timeline defaultValue={logs.length} className="w-full min-w-0">
        {logs.map((log, index) => (
          <TimelineItem key={log.id} step={index + 1}>
            <TimelineHeader className="flex min-w-0 items-start justify-between gap-3">
              <TimelineTitle className="min-w-0 break-words">
                {formatAction(log.action)}
              </TimelineTitle>
              <TimelineDate className="mb-0 shrink-0 text-right">
                {formatDateTime(log.createdAt)}
              </TimelineDate>
            </TimelineHeader>
            <TimelineIndicator />
            <TimelineSeparator />
            <TimelineContent className="min-w-0 space-y-2">
              <div className="flex min-w-0 gap-3">
                <UserAvatar name={log.actorName} size="sm" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="text-sm font-semibold">{log.actorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.actorAccountType}
                    </p>
                  </div>
                  <p className="whitespace-pre-wrap break-words rounded-lg border-2 border-border bg-muted/20 p-3 text-sm leading-relaxed">
                    {log.summary}
                  </p>
                  {isPasswordResetLog(log.action) ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Target account: {targetFullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Require password change on next login:{" "}
                        {log.metadata?.requirePasswordChange === false
                          ? "No"
                          : "Yes"}
                      </p>
                    </>
                  ) : null}
                  {log.metadata &&
                  typeof log.metadata.reason === "string" &&
                  log.metadata.reason ? (
                    <p className="text-xs text-muted-foreground">
                      Reason: {log.metadata.reason}
                    </p>
                  ) : null}
                </div>
              </div>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </ScrollArea>
  )
}
