import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ContentReport } from "@/types/content-report"

type ReviewNotesSummaryProps = {
  report: ContentReport
}

function hasText(value: string | null) {
  return Boolean(value?.trim())
}

function NoteBlock({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  if (!hasText(value)) {
    return null
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="rounded-lg border bg-muted/20 p-3 text-sm leading-relaxed">
        <p className="whitespace-pre-wrap break-words">{value}</p>
      </div>
    </div>
  )
}

export function ReviewNotesSummary({ report }: ReviewNotesSummaryProps) {
  const hasAnyNotes =
    hasText(report.supervisorNotes) ||
    hasText(report.directorNotes) ||
    hasText(report.remarksRevisionSummary)

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Review Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasAnyNotes ? (
          <>
            <NoteBlock
              label="Marketing Supervisor Notes"
              value={report.supervisorNotes}
            />
            <NoteBlock label="Director Notes" value={report.directorNotes} />
            <NoteBlock
              label="Remarks / Revision Summary"
              value={report.remarksRevisionSummary}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
