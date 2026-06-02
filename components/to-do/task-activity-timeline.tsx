import { ProofDisplay } from "@/components/shared/proof-display"
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
import { UserAvatar } from "@/components/shared/user-avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  formatAbsoluteDateTime,
  formatRecentOrDateTime,
} from "@/lib/date-time/relative-timestamp"
import type { ProofSubmitType } from "@/lib/proof/proof-types"
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
  TASK_REJECTED: "Task rejected",
  TASK_REOPENED: "Task reopened",
  DEADLINE_CHANGED: "Deadline changed",
  SELF_TASK_SUBMITTED: "Self-submitted task",
}

const PROOF_ACTIVITY_ACTIONS = new Set([
  "PROOF_SUBMITTED",
  "PROOF_RESUBMITTED",
  "TASK_MARKED_DONE",
])

function getMetadataString(
  metadata: Record<string, unknown> | null,
  key: string,
) {
  const value = metadata?.[key]
  return typeof value === "string" ? value : null
}

function getProofType(value: string | null): ProofSubmitType | null {
  return value === "LINK" || value === "IMAGE" || value === "NOTE"
    ? value
    : null
}

function getProofActivity(log: TaskActivityLogRecord) {
  const proofType = getProofType(getMetadataString(log.metadata, "proofType"))
  const metadataProofUrl = getMetadataString(log.metadata, "proofUrl")
  const notes = log.notes?.trim() ?? ""
  const notesLookLikeProofUrl =
    notes.startsWith("data:image/") || /^https?:\/\//i.test(notes)
  const proofUrl = metadataProofUrl ?? (notesLookLikeProofUrl ? notes : null)

  if (!proofType && !proofUrl) {
    return null
  }

  return {
    proofType: proofType ?? null,
    proofUrl,
    proofNote: proofType === "NOTE" || !notesLookLikeProofUrl ? log.notes : null,
  }
}

function formatMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata) {
    return null
  }

  const from = metadata.deadline_changed_from
  const to = metadata.deadline_changed_to

  if (typeof from === "string" || typeof to === "string") {
    const fromLabel =
      typeof from === "string" ? formatAbsoluteDateTime(from, dateFormatter) : "None"
    const toLabel =
      typeof to === "string" ? formatAbsoluteDateTime(to, dateFormatter) : "None"

    return `Deadline: ${fromLabel} to ${toLabel}`
  }

  return null
}

function getTimelineTitle(log: TaskActivityLogRecord) {
  const label = ACTION_LABELS[log.action] ?? log.action

  if (log.fromStatus && log.toStatus) {
    return `${label} from ${log.fromStatus} to ${log.toStatus}`
  }

  return label
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
                const proofActivity = PROOF_ACTIVITY_ACTIONS.has(log.action)
                  ? getProofActivity(log)
                  : null
                const shouldShowNotesAsText =
                  Boolean(log.notes) && !proofActivity

                return (
                  <TimelineItem key={log.id} step={index + 1}>
                    <TimelineHeader className="flex min-w-0 items-start justify-between gap-3">
                      <TimelineTitle className="min-w-0 break-words">
                        {getTimelineTitle(log)}
                      </TimelineTitle>
                      <TimelineDate className="mb-0 shrink-0 text-right">
                        {formatRecentOrDateTime(log.createdAt, dateFormatter)}
                      </TimelineDate>
                    </TimelineHeader>
                    <TimelineIndicator />
                    <TimelineSeparator />
                    <TimelineContent className="min-w-0 space-y-2">
                      <div className="flex min-w-0 gap-3">
                        <UserAvatar
                          profileId={log.actorProfileId}
                          name={log.actorName}
                          imageUrl={log.actorImageUrl}
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
                        </div>
                      </div>

                      {shouldShowNotesAsText ? (
                        <p className="whitespace-pre-wrap break-words rounded-lg border-2 border-border bg-muted/20 p-3 text-sm leading-relaxed">
                          {log.notes}
                        </p>
                      ) : null}

                      {proofActivity ? (
                        <ProofDisplay
                          proofType={proofActivity.proofType}
                          proofUrl={proofActivity.proofUrl}
                          proofNote={proofActivity.proofNote}
                          mediaClassName="max-h-52"
                        />
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
