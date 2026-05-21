import { isAdminAccountType, type AccountType } from "@/lib/account-type"
import {
  TASK_KANBAN_COLUMNS,
  TASK_STATUSES,
  type TaskAssignmentStatus,
} from "@/lib/task-statuses"

export const TASK_TYPES = ["GRADED", "NON_GRADED"] as const
export type TaskType = (typeof TASK_TYPES)[number]

export { TASK_KANBAN_COLUMNS, TASK_STATUSES as TASK_ASSIGNMENT_STATUSES }
export type { TaskAssignmentStatus }

export const TASK_PROOF_TYPES = ["IMAGE", "VIDEO", "LINK", "NOTE"] as const
export type TaskProofType = (typeof TASK_PROOF_TYPES)[number]

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

type DetermineTaskTypeInput = {
  creatorAccountType: AccountType
  creatorProfileId: number
  assignedToProfileIds: number[]
}

export function determineTaskType({
  creatorAccountType,
  creatorProfileId,
  assignedToProfileIds,
}: DetermineTaskTypeInput): TaskType {
  const uniqueAssignees = [...new Set(assignedToProfileIds)]

  if (
    uniqueAssignees.length === 1 &&
    uniqueAssignees[0] === creatorProfileId
  ) {
    return "NON_GRADED"
  }

  if (
    isAdminAccountType(creatorAccountType) &&
    uniqueAssignees.some((assigneeId) => assigneeId !== creatorProfileId)
  ) {
    return "GRADED"
  }

  return "NON_GRADED"
}

export function canAssignGradedTasks(accountType: AccountType) {
  return isAdminAccountType(accountType)
}

export function canReviewTaskAssignments(accountType: AccountType) {
  return isAdminAccountType(accountType)
}

export function isAssignmentCompletedOnTime(
  completedAt: string | null,
  dueDate: string | null
) {
  if (!completedAt || !dueDate) {
    return null
  }

  return new Date(completedAt).getTime() <= new Date(dueDate).getTime()
}
