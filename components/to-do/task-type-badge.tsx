import { StatusBadge } from "@/components/shared/status-badge"
import type { TaskType } from "@/lib/task-type"

type TaskTypeBadgeProps = {
  taskType: TaskType
}

export function TaskTypeBadge({ taskType }: TaskTypeBadgeProps) {
  return <StatusBadge status={taskType} type="default" />
}
