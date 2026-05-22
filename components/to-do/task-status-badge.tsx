import { StatusBadge } from "@/components/shared/status-badge"
import type { TaskAssignmentStatus } from "@/lib/task-statuses"

export function TaskStatusBadge({ status }: { status: TaskAssignmentStatus }) {
  return <StatusBadge status={status} type="task" />
}
