import { Badge } from "@/components/ui/badge"
import type { TaskType } from "@/lib/task-type"

type TaskTypeBadgeProps = {
  taskType: TaskType
}

export function TaskTypeBadge({ taskType }: TaskTypeBadgeProps) {
  return (
    <Badge variant={taskType === "GRADED" ? "default" : "secondary"}>
      {taskType === "GRADED" ? "Graded" : "Personal"}
    </Badge>
  )
}
