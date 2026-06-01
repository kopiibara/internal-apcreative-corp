import type { TaskPermissionFlags } from "@/components/to-do/types";
import type { TaskAssignmentRecord } from "@/lib/tasks/tasks";
import { isPersonalTaskType } from "@/lib/tasks/task-type";

export function getGradedTaskReviewBlockReason(
  assignment: Pick<
    TaskAssignmentRecord,
    "taskType" | "assignedToProfileId"
  >,
  actorProfileId: number,
) {
  if (isPersonalTaskType(assignment.taskType)) {
    return "Personal tasks are only visible to the assignee and cannot be reviewed by admins.";
  }

  if (assignment.assignedToProfileId === actorProfileId) {
    return "You cannot approve or review your own task.";
  }

  return null;
}

type TaskReviewScopeOptions = {
  isEmployeeReviewer?: boolean;
  canManageAll?: boolean;
};

export function getTaskReviewBlockReason(
  assignment: Pick<
    TaskAssignmentRecord,
    "taskType" | "assignedToProfileId" | "createdByProfileId"
  >,
  actorProfileId: number,
  options: TaskReviewScopeOptions = {},
) {
  const { isEmployeeReviewer = false, canManageAll = false } = options;
  const gradedBlockReason = getGradedTaskReviewBlockReason(
    assignment,
    actorProfileId,
  );

  if (gradedBlockReason) {
    return gradedBlockReason;
  }

  if (
    isEmployeeReviewer &&
    !canManageAll &&
    assignment.createdByProfileId !== actorProfileId
  ) {
    return "You can only review tasks you assigned to other team members.";
  }

  return null;
}

export function canReviewTaskAssignment({
  assignment,
  actorProfileId,
  permissions,
}: {
  assignment: Pick<
    TaskAssignmentRecord,
    "taskType" | "assignedToProfileId" | "createdByProfileId"
  >;
  actorProfileId: number;
  permissions: Pick<TaskPermissionFlags, "canReview" | "canManageAll" | "isEmployee">;
}) {
  if (!permissions.canReview && !permissions.canManageAll) {
    return false;
  }

  return (
    getTaskReviewBlockReason(assignment, actorProfileId, {
      isEmployeeReviewer: permissions.isEmployee,
      canManageAll: permissions.canManageAll,
    }) === null
  );
}
