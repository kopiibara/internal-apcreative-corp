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
