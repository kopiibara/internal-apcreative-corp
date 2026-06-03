import {
  buildTaskPerformanceCounts,
  calculateTaskPriorityPoints,
  calculateTaskPerformancePoints,
  getLateSubmissionDeductionForAssignment,
  getTaskPointsFromCompletionRate,
} from "@/lib/performance-scoring";
import { isAssignmentSubmittedOnTime } from "@/lib/tasks/task-type";
import type { TaskPriority } from "@/lib/tasks/task-type";

export type GradedAssignmentMetricInput = {
  status: string;
  priority: TaskPriority | null;
  dueDate: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  taskType?: string;
  pointsAwardedOverride?: number | null;
  lateDeductionOverride?: number | null;
};

export function computeSimpleCompletionRate(done: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((done / total) * 10000) / 100;
}

export function computeApprovalRate(approved: number, total: number) {
  return computeSimpleCompletionRate(approved, total);
}

export function countGradedAssignmentMetrics(
  assignments: GradedAssignmentMetricInput[],
) {
  let done = 0;
  let pending = 0;
  let blockers = 0;
  let revisions = 0;
  let rejected = 0;
  let completedOnTime = 0;
  let completedLate = 0;
  let completedTaskPriorityPoints = 0;
  let lateTaskDeductionPoints = 0;
  let lateSubmissionCount = 0;
  let lateSubmissionMinutesTotal = 0;

  for (const assignment of assignments) {
    if (assignment.status === "DONE") {
      done += 1;
      completedTaskPriorityPoints += calculateTaskPriorityPoints(assignment);

      const onTime = isAssignmentSubmittedOnTime(
        assignment.submittedAt,
        assignment.dueDate,
      );

      if (onTime === true) {
        completedOnTime += 1;
      } else if (onTime === false) {
        completedLate += 1;
      }

      const lateSubmission = getLateSubmissionDeductionForAssignment({
        taskType: assignment.taskType ?? "GRADED",
        status: assignment.status,
        dueDate: assignment.dueDate,
        submittedAt: assignment.submittedAt,
        lateDeductionOverride: assignment.lateDeductionOverride,
      });

      if (lateSubmission.deductionPoints > 0) {
        lateSubmissionCount += 1;
        lateSubmissionMinutesTotal += lateSubmission.lateMinutes;
        lateTaskDeductionPoints += lateSubmission.deductionPoints;
      }
    } else if (assignment.status === "BLOCKER") {
      blockers += 1;
      pending += 1;
    } else if (assignment.status === "REVISION") {
      revisions += 1;
      pending += 1;
    } else if (assignment.status === "REJECTED") {
      rejected += 1;
    } else {
      pending += 1;
    }
  }

  const total = assignments.length;
  const performance = calculateTaskPerformancePoints(
    buildTaskPerformanceCounts({
      totalAssignedTasks: total,
      completedOnTimeTasks: completedOnTime,
      completedLateTasks: completedLate,
      completedTaskPriorityPoints,
      lateTaskDeductionPoints,
      lateSubmissionCount,
      lateSubmissionMinutesTotal,
    }),
  );

  return {
    total,
    done,
    pending,
    blockers,
    revisions,
    rejected,
    completionRate: computeSimpleCompletionRate(done, total),
    adjustedCompletionRate: performance.adjustedCompletionRate,
    completedTaskPriorityPoints,
    grossTaskPoints: performance.grossTaskPoints,
    lateTaskDeductionPoints: performance.lateTaskDeductionPoints,
    taskPoints: performance.taskPoints,
    lateSubmissionCount: performance.lateSubmissionCount,
    lateSubmissionMinutesTotal: performance.lateSubmissionMinutesTotal,
    completedOnTime,
    completedLate,
  };
}

export function getGradedTaskPointsFromRate(completionRate: number) {
  return getTaskPointsFromCompletionRate(completionRate);
}

export function isContentReportFullyApproved(
  supervisorStatus: string,
  directorStatus: string,
) {
  return supervisorStatus === "Approved" && directorStatus === "Approved";
}

export function isContentReportPending(
  supervisorStatus: string,
  directorStatus: string,
) {
  return !isContentReportFullyApproved(supervisorStatus, directorStatus);
}
