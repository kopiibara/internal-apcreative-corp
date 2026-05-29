import { isAdminAccountType, type AccountType } from "@/lib/auth/account-type";
import {
  TASK_KANBAN_COLUMNS,
  TASK_STATUSES,
  type TaskAssignmentStatus,
} from "@/lib/tasks/task-statuses";

export const TASK_TYPES = ["GRADED", "NON_GRADED"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export { TASK_KANBAN_COLUMNS, TASK_STATUSES as TASK_ASSIGNMENT_STATUSES };
export type { TaskAssignmentStatus };

export const TASK_PROOF_TYPES = ["IMAGE", "VIDEO", "LINK", "NOTE"] as const;
export type TaskProofType = (typeof TASK_PROOF_TYPES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

type DetermineTaskTypeInput = {
  creatorAccountType: AccountType;
  creatorProfileId: number;
  assignedToProfileIds: number[];
  canAssignTeamTasks?: boolean;
};

export function determineTaskType({
  creatorAccountType,
  creatorProfileId,
  assignedToProfileIds,
  canAssignTeamTasks = false,
}: DetermineTaskTypeInput): TaskType {
  const uniqueAssignees = [...new Set(assignedToProfileIds)];

  if (uniqueAssignees.length === 1 && uniqueAssignees[0] === creatorProfileId) {
    return "NON_GRADED";
  }

  if (
    (isAdminAccountType(creatorAccountType) || canAssignTeamTasks) &&
    uniqueAssignees.some((assigneeId) => assigneeId !== creatorProfileId)
  ) {
    return "GRADED";
  }

  return "NON_GRADED";
}

export function isPersonalTaskType(taskType: TaskType) {
  return taskType === "NON_GRADED";
}

export function canAssignGradedTasks(accountType: AccountType) {
  return (
    isAdminAccountType(accountType) && accountType !== "FULL_STACK_DEVELOPER"
  );
}

export function canReviewTaskAssignments(accountType: AccountType) {
  return (
    isAdminAccountType(accountType) && accountType !== "FULL_STACK_DEVELOPER"
  );
}

export function isAssignmentCompletedOnTime(
  completedAt: string | null,
  dueDate: string | null,
) {
  if (!completedAt || !dueDate) {
    return null;
  }

  return new Date(completedAt).getTime() <= new Date(dueDate).getTime();
}

/** Employee proof submission time — used for late task point deductions. */
export function isAssignmentSubmittedOnTime(
  submittedAt: string | null,
  dueDate: string | null,
) {
  if (!submittedAt || !dueDate) {
    return null;
  }

  return new Date(submittedAt).getTime() <= new Date(dueDate).getTime();
}
