import { StatusBadge } from "@/components/shared/status-badge"
import type { TaskType } from "@/lib/tasks/task-type"

type TaskTypeBadgeProps = {
  taskType: TaskType
}

export function TaskTypeBadge({ taskType }: TaskTypeBadgeProps) {
  return <StatusBadge status={taskType} type="default" />
}
