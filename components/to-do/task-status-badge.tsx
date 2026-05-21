import { Badge } from "@/components/ui/badge"
import {
  getTaskStatusColorClass,
  getTaskStatusLabel,
  type TaskAssignmentStatus,
} from "@/lib/task-statuses"

export function TaskStatusBadge({ status }: { status: TaskAssignmentStatus }) {
  return (
    <Badge variant="outline" className={getTaskStatusColorClass(status)}>
      {getTaskStatusLabel(status)}
    </Badge>
  )
}
