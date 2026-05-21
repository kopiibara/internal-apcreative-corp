import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TaskAssignmentRecord } from "@/lib/tasks"

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
  return (
    <Card className="rounded-md px-2 py-1">
      <CardHeader className="p-4">
        <CardTitle className="text-sm">Blocker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 text-sm">
        {assignment.blockerNote ? (
          <>
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 leading-relaxed text-destructive">
              {assignment.blockerNote}
            </p>
            <p>
              <span className="text-muted-foreground">Reported by:</span>{" "}
              {assignment.blockerReportedByName ?? "Not recorded"}
            </p>
            <p>
              <span className="text-muted-foreground">Reported at:</span>{" "}
              {formatDate(assignment.blockerReportedAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Confirmed by:</span>{" "}
              {assignment.blockerConfirmedByName ?? "Not confirmed"}
            </p>
            <p>
              <span className="text-muted-foreground">Confirmed at:</span>{" "}
              {formatDate(assignment.blockerConfirmedAt)}
            </p>
            {assignment.blockerResolutionNote ? (
              <p className="rounded-md border bg-muted/20 p-3 leading-relaxed">
                {assignment.blockerResolutionNote}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground">No blocker has been reported.</p>
        )}
      </CardContent>
    </Card>
  )
}
