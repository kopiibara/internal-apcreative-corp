import {
  formatLateDuration,
  getLateSubmissionDeductionForAssignment,
} from "@/lib/performance-scoring";
import type { TaskType } from "@/lib/tasks/task-type";
import type { TaskAssignmentStatus } from "@/lib/tasks/task-statuses";

export type TaskLateSubmissionDisplay = {
  lateMinutes: number;
  deductionPoints: number;
  durationLabel: string;
  summaryLabel: string;
};

export function getTaskLateSubmissionDisplay({
  taskType,
  status,
  dueDate,
  submittedAt,
}: {
  taskType: TaskType;
  status: TaskAssignmentStatus;
  dueDate: string | null;
  submittedAt: string | null;
}): TaskLateSubmissionDisplay | null {
  const lateSubmission = getLateSubmissionDeductionForAssignment({
    taskType,
    status,
    dueDate,
    submittedAt,
  });

  if (lateSubmission.deductionPoints <= 0) {
    return null;
  }

  const durationLabel = formatLateDuration(lateSubmission.lateMinutes);

  return {
    lateMinutes: lateSubmission.lateMinutes,
    deductionPoints: lateSubmission.deductionPoints,
    durationLabel,
    summaryLabel: `Submitted late by ${durationLabel} · Deduction: -${lateSubmission.deductionPoints} pts`,
  };
}
