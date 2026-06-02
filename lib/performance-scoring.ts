import type { TaskPriority } from "@/lib/tasks/task-type";

export type TaskPerformanceCounts = {
  totalAssignedTasks: number;
  completedOnTimeTasks: number;
  completedLateTasks: number;
  notCompletedTasks: number;
  completedTaskPriorityPoints: number;
  lateTaskDeductionPoints: number;
  lateSubmissionCount: number;
  lateSubmissionMinutesTotal: number;
};

export type TaskPerformanceResult = {
  adjustedCompletionRate: number;
  completedTaskPriorityPoints: number;
  grossTaskPoints: number;
  lateTaskDeductionPoints: number;
  taskPoints: number;
  lateSubmissionCount: number;
  lateSubmissionMinutesTotal: number;
};

export const TASK_COMPLETION_POINTS = 15;

/** @deprecated Task score is now flat per completed task. Keep this for legacy imports. */
export const TASK_PRIORITY_POINTS: Record<TaskPriority, number> = {
  LOW: TASK_COMPLETION_POINTS,
  MEDIUM: TASK_COMPLETION_POINTS,
  HIGH: TASK_COMPLETION_POINTS,
  URGENT: TASK_COMPLETION_POINTS,
};

export const LATE_TASK_DEDUCTION_MINUTES_PER_BLOCK = 30;
export const LATE_TASK_DEDUCTION_POINTS_PER_BLOCK = 2;

const TASK_POINTS_TABLE: { minRate: number; points: number }[] = [
  { minRate: 95, points: 70 },
  { minRate: 90, points: 63 },
  { minRate: 85, points: 56 },
  { minRate: 80, points: 50 },
  { minRate: 75, points: 45 },
  { minRate: 70, points: 40 },
  { minRate: 65, points: 35 },
  { minRate: 60, points: 30 },
];

export type LateSubmissionAssignmentInput = {
  taskType?: string;
  status: string;
  dueDate: string | null;
  submittedAt: string | null;
};

export function calculateLateMinutes(
  submittedAt: string | Date | null,
  dueDate: string | Date | null,
) {
  if (!submittedAt || !dueDate) {
    return 0;
  }

  const submittedMs = new Date(submittedAt).getTime();
  const dueMs = new Date(dueDate).getTime();

  if (submittedMs <= dueMs) {
    return 0;
  }

  return Math.max(0, Math.floor((submittedMs - dueMs) / (60 * 1000)));
}

export function calculateLateTaskDeductionPoints(lateMinutes: number) {
  if (lateMinutes <= 0) {
    return 0;
  }

  return (
    Math.ceil(lateMinutes / LATE_TASK_DEDUCTION_MINUTES_PER_BLOCK) *
    LATE_TASK_DEDUCTION_POINTS_PER_BLOCK
  );
}

export function getLateSubmissionDeductionForAssignment(
  assignment: LateSubmissionAssignmentInput,
) {
  if (assignment.taskType !== undefined && assignment.taskType !== "GRADED") {
    return { lateMinutes: 0, deductionPoints: 0 };
  }

  if (assignment.status !== "DONE") {
    return { lateMinutes: 0, deductionPoints: 0 };
  }

  const lateMinutes = calculateLateMinutes(
    assignment.submittedAt,
    assignment.dueDate,
  );

  return {
    lateMinutes,
    deductionPoints: calculateLateTaskDeductionPoints(lateMinutes),
  };
}

export function formatLateDuration(minutes: number) {
  if (minutes <= 0) {
    return "0 mins";
  }

  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }

  return `${hours} hr${hours === 1 ? "" : "s"} ${remainingMinutes} min${remainingMinutes === 1 ? "" : "s"}`;
}

export function calculateAdjustedCompletionRate({
  totalAssignedTasks,
  completedOnTimeTasks,
  completedLateTasks,
}: Pick<
  TaskPerformanceCounts,
  "totalAssignedTasks" | "completedOnTimeTasks" | "completedLateTasks"
>) {
  if (totalAssignedTasks <= 0) {
    return 0;
  }

  const weightedCompleted =
    completedOnTimeTasks * 1 + completedLateTasks * 0.75;

  const rate = (weightedCompleted / totalAssignedTasks) * 100;

  return Math.round(rate * 100) / 100;
}

export function getTaskPointsFromCompletionRate(
  adjustedCompletionRate: number,
) {
  if (adjustedCompletionRate <= 0) {
    return 0;
  }

  for (const tier of TASK_POINTS_TABLE) {
    if (adjustedCompletionRate >= tier.minRate) {
      return tier.points;
    }
  }

  return 20;
}

export function getPriorityPoints(_priority: TaskPriority | null | undefined) {
  return TASK_COMPLETION_POINTS;
}

export function calculateTaskPriorityPoints({
  status,
}: {
  status: string;
  priority: TaskPriority | null | undefined;
}) {
  return status === "DONE" ? TASK_COMPLETION_POINTS : 0;
}

export function calculateTaskPerformancePoints(
  counts: TaskPerformanceCounts,
): TaskPerformanceResult {
  const adjustedCompletionRate = calculateAdjustedCompletionRate({
    totalAssignedTasks: counts.totalAssignedTasks,
    completedOnTimeTasks: counts.completedOnTimeTasks,
    completedLateTasks: counts.completedLateTasks,
  });

  const grossTaskPoints =
    counts.totalAssignedTasks <= 0 ? 0 : counts.completedTaskPriorityPoints;
  const lateTaskDeductionPoints = counts.lateTaskDeductionPoints;
  const taskPoints = Math.max(grossTaskPoints - lateTaskDeductionPoints, 0);

  return {
    adjustedCompletionRate,
    completedTaskPriorityPoints: counts.completedTaskPriorityPoints,
    grossTaskPoints,
    lateTaskDeductionPoints,
    taskPoints,
    lateSubmissionCount: counts.lateSubmissionCount,
    lateSubmissionMinutesTotal: counts.lateSubmissionMinutesTotal,
  };
}

export function buildTaskPerformanceCounts({
  totalAssignedTasks,
  completedOnTimeTasks,
  completedLateTasks,
  completedTaskPriorityPoints = 0,
  lateTaskDeductionPoints = 0,
  lateSubmissionCount = 0,
  lateSubmissionMinutesTotal = 0,
}: Omit<
  TaskPerformanceCounts,
  "notCompletedTasks"
> &
  Partial<
    Pick<
      TaskPerformanceCounts,
      | "completedTaskPriorityPoints"
      | "lateTaskDeductionPoints"
      | "lateSubmissionCount"
      | "lateSubmissionMinutesTotal"
    >
  >): TaskPerformanceCounts {
  return {
    totalAssignedTasks,
    completedOnTimeTasks,
    completedLateTasks,
    completedTaskPriorityPoints,
    lateTaskDeductionPoints,
    lateSubmissionCount,
    lateSubmissionMinutesTotal,
    notCompletedTasks: Math.max(
      0,
      totalAssignedTasks - completedOnTimeTasks - completedLateTasks,
    ),
  };
}
