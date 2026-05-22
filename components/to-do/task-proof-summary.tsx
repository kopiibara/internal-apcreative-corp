import { ExternalLink } from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TaskAssignmentRecord } from "@/lib/tasks"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

export function TaskProofSummary({
  assignment,
}: {
  assignment: TaskAssignmentRecord
}) {
  const hasProof = Boolean(assignment.proofUrl || assignment.proofNote)

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="items-center border-b-2 border-border px-4 py-3">
        <CardTitle className="text-sm font-semibold">Submitted Proof</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 text-sm">
        {hasProof ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Proof type
                </p>
                <div>{assignment.proofType ?? "Not provided"}</div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Submitted date
                </p>
                <div>
                  {assignment.submittedAt
                    ? dateFormatter.format(new Date(assignment.submittedAt))
                    : "Not submitted"}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Submitted by
                </p>
                <div>{assignment.assignedToName}</div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Proof status
                </p>
                <StatusBadge status="SUBMITTED" type="proof" />
              </div>
            </div>
            {assignment.proofUrl ? (
              <Button type="button" size="sm" variant="neutral" asChild>
                <a href={assignment.proofUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3" />
                  Open proof link
                </a>
              </Button>
            ) : null}
            {assignment.proofNote ? (
              <p className="whitespace-pre-wrap break-words rounded-lg border-2 border-border bg-muted/20 p-3 text-sm leading-relaxed">
                {assignment.proofNote}
              </p>
            ) : null}
          </>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No proof has been submitted.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
