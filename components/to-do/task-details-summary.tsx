import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TaskAssigneeBrands } from "@/components/to-do/task-assignee-brands"
import { TaskStatusBadge } from "@/components/to-do/task-status-badge"
import { TaskTypeBadge } from "@/components/to-do/task-type-badge"
import type { TaskAssignmentRecord } from "@/lib/tasks"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Not set"
}

export function TaskDetailsSummary({
  assignment,
}: {
  assignment: TaskAssignmentRecord
}) {
  return (
    <Card className="rounded-md px-2 py-1">
      <CardHeader className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="mr-auto text-base">{assignment.title}</CardTitle>
          <TaskTypeBadge taskType={assignment.taskType} />
          <TaskStatusBadge status={assignment.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 text-sm">
        {assignment.description ? (
          <p className="leading-relaxed text-muted-foreground">
            {assignment.description}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Assignee:</span>{" "}
            {assignment.assignedToName}
          </p>
          <p>
            <span className="text-muted-foreground">Created by:</span>{" "}
            {assignment.createdByName}
          </p>
          <p>
            <span className="text-muted-foreground">Due:</span>{" "}
            {formatDate(assignment.dueDate)}
          </p>
          <p>
            <span className="text-muted-foreground">Created:</span>{" "}
            {formatDate(assignment.createdAt)}
          </p>
          <p>
            <span className="text-muted-foreground">Reviewed by:</span>{" "}
            {assignment.reviewedByName ?? "Not reviewed"}
          </p>
          <p>
            <span className="text-muted-foreground">Reviewed at:</span>{" "}
            {formatDate(assignment.reviewedAt)}
          </p>
        </div>

        {assignment.priority ? (
          <Badge variant="outline">Priority: {assignment.priority}</Badge>
        ) : null}

        <TaskAssigneeBrands brands={assignment.assigneeBrands} />

        {assignment.revisionNote ? (
          <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-300">
            {assignment.revisionNote}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
