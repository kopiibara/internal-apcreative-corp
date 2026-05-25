import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TaskAssignmentRecord } from "@/lib/tasks/tasks"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Not recorded"
}

export function TaskBlockerSummary({
  assignment,
}: {
  assignment: TaskAssignmentRecord
}) {
  const hasBlocker = Boolean(assignment.blockerNote)

  return (
    <Card className="flex min-h-0 flex-col gap-0 py-0 shadow-none">
      <CardHeader className="shrink-0 items-center border-b-2 border-border px-4 py-3">
        <CardTitle className="text-sm font-semibold">Blocker / Issue Details</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-4 text-sm">
        {hasBlocker ? (
          <div className="space-y-3">
            <p className="whitespace-pre-wrap break-words rounded-lg border-2 border-red-600 bg-red-100 p-3 leading-relaxed text-red-900 dark:bg-red-950/40 dark:text-red-200">
              {assignment.blockerNote}
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reported by
                </p>
                <p>{assignment.blockerReportedByName ?? "Not recorded"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reported at
                </p>
                <p>{formatDate(assignment.blockerReportedAt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Confirmed by
                </p>
                <p>{assignment.blockerConfirmedByName ?? "Not confirmed"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Confirmed at
                </p>
                <p>{formatDate(assignment.blockerConfirmedAt)}</p>
              </div>
            </div>
            {assignment.blockerResolutionNote ? (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Resolution
                </p>
                <p className="whitespace-pre-wrap break-words rounded-lg border-2 border-border bg-muted/20 p-3 leading-relaxed">
                  {assignment.blockerResolutionNote}
                </p>
              </div>
            ) : null}
            {assignment.dueDate ? (
              <p>
                <span className="text-muted-foreground">Current due date:</span>{" "}
                {formatDate(assignment.dueDate)}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-[160px] flex-1 items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No blocker reported.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
