import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RichTextRenderer } from "@/components/ui/rich-text-renderer"
import { Separator } from "@/components/ui/separator"
import { TaskAssigneeBrands } from "@/components/to-do/task-assignee-brands"
import { TaskStatusBadge } from "@/components/to-do/task-status-badge"
import { TaskTypeBadge } from "@/components/to-do/task-type-badge"
import { formatRecentOrDateTime } from "@/lib/date-time/relative-timestamp"
import type { TaskAssignmentRecord } from "@/lib/tasks/tasks"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function formatDate(value: string | null) {
  return value ? formatRecentOrDateTime(value, dateFormatter) : "Not set"
}

function DetailField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

export function TaskDetailsSummary({
  assignment,
}: {
  assignment: TaskAssignmentRecord
}) {
  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="items-center border-b-2 border-border px-4 py-3">
        <CardTitle className="text-sm font-semibold">Task Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <div>
            <p className="text-lg font-bold leading-snug">{assignment.title}</p>
            <RichTextRenderer
              value={assignment.description}
              emptyText="No task description provided."
              className="mt-1 text-md text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <TaskTypeBadge taskType={assignment.taskType} />
            <TaskStatusBadge status={assignment.status} />
            {assignment.priority ? (
              <StatusBadge
                status={assignment.priority}
                type="priority"
                prefix="Priority"
              />
            ) : null}
            <StatusBadge
              status={assignment.proofUrl || assignment.proofNote ? "SUBMITTED" : "MISSING"}
              type="proof"
              prefix="Proof"
            />
            <TaskAssigneeBrands brands={assignment.assigneeBrands} />

          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailField label="Assignee">{assignment.assignedToName}</DetailField>
          <DetailField label="Created by">{assignment.createdByName}</DetailField>
          <DetailField label="Due date">{formatDate(assignment.dueDate)}</DetailField>
          <DetailField label="Proof status">
            {assignment.proofUrl || assignment.proofNote ? "Submitted" : "Not submitted"}
          </DetailField>

        </div>

        <Separator />

        {assignment.revisionNote ? (
          <div className="rounded-lg border-2 border-orange-500 bg-orange-100 p-3 text-sm leading-relaxed text-orange-950 dark:bg-orange-950/40 dark:text-orange-200">
            <p className="text-xs font-medium uppercase tracking-wide">
              Revision note
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words">
              {assignment.revisionNote}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
