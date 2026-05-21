export const TASK_STATUSES = [
  "ASSIGNED",
  "BLOCKER",
  "PENDING",
  "REVISION",
  "DONE",
] as const

export type TaskAssignmentStatus = (typeof TASK_STATUSES)[number]

export const TASK_STATUS_LABELS: Record<TaskAssignmentStatus, string> = {
  ASSIGNED: "Assigned",
  BLOCKER: "Blocker",
  PENDING: "Pending",
  REVISION: "Revision",
  DONE: "Done",
}

export const TASK_STATUS_BADGE_CLASS_NAMES: Record<TaskAssignmentStatus, string> = {
  ASSIGNED: "border-border bg-muted/30 text-muted-foreground",
  BLOCKER: "border-destructive/40 bg-destructive/10 text-destructive",
  PENDING: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  REVISION: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  DONE: "border-green-500/40 bg-green-500/10 text-green-300",
}

export const TASK_KANBAN_COLUMNS: {
  id: TaskAssignmentStatus
  title: string
  description: string
}[] = [
  {
    id: "ASSIGNED",
    title: "Assigned",
    description: "Waiting for employee action.",
  },
  {
    id: "BLOCKER",
    title: "Blocker",
    description: "Blocked by a dependency or clarification.",
  },
  {
    id: "PENDING",
    title: "Pending",
    description: "Proof submitted, awaiting review.",
  },
  {
    id: "REVISION",
    title: "Revision",
    description: "Proof needs changes before resubmission.",
  },
  {
    id: "DONE",
    title: "Done",
    description: "Reviewer confirmed completion.",
  },
]

export function getTaskStatusLabel(status: TaskAssignmentStatus) {
  return TASK_STATUS_LABELS[status]
}

export function getTaskStatusColorClass(status: TaskAssignmentStatus) {
  return TASK_STATUS_BADGE_CLASS_NAMES[status]
}
