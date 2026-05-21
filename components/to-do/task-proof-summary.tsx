import { ExternalLink } from "lucide-react"

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
    <Card className="rounded-md px-2 py-1">
      <CardHeader className="p-4">
        <CardTitle className="text-sm">Submitted Proof</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 text-sm">
        {hasProof ? (
          <>
            <p>
              <span className="text-muted-foreground">Type:</span>{" "}
              {assignment.proofType ?? "Not provided"}
            </p>
            {assignment.proofUrl ? (
              <Button type="button" size="sm" variant="outline" asChild>
                <a href={assignment.proofUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3" />
                  Open proof link
                </a>
              </Button>
            ) : null}
            {assignment.proofNote ? (
              <p className="rounded-md border bg-muted/20 p-3 text-sm leading-relaxed">
                {assignment.proofNote}
              </p>
            ) : null}
            <p>
              <span className="text-muted-foreground">Submitted:</span>{" "}
              {assignment.submittedAt
                ? dateFormatter.format(new Date(assignment.submittedAt))
                : "Not submitted"}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">No proof has been submitted.</p>
        )}
      </CardContent>
    </Card>
  )
}
