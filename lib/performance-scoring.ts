import type { TaskPriority } from "@/lib/task-type";

export type TaskPerformanceCounts = {
  totalAssignedTasks: number;
  completedOnTimeTasks: number;
  completedLateTasks: number;
  notCompletedTasks: number;
  completedTaskPriorityPoints: number;
};

export type TaskPerformanceResult = {
  adjustedCompletionRate: number;
  taskPoints: number;
};

export const TASK_PRIORITY_POINTS: Record<TaskPriority, number> = {
  LOW: 2,
  MEDIUM: 5,
  HIGH: 10,
  URGENT: 15,
};

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

export function getPriorityPoints(priority: TaskPriority | null | undefined) {
  return priority ? (TASK_PRIORITY_POINTS[priority] ?? 0) : 0;
}

export function calculateTaskPriorityPoints({
  status,
  priority,
}: {
  status: string;
  priority: TaskPriority | null | undefined;
}) {
  return status === "DONE" ? getPriorityPoints(priority) : 0;
}

export function calculateTaskPerformancePoints(
  counts: TaskPerformanceCounts,
): TaskPerformanceResult {
  const adjustedCompletionRate = calculateAdjustedCompletionRate({
    totalAssignedTasks: counts.totalAssignedTasks,
    completedOnTimeTasks: counts.completedOnTimeTasks,
    completedLateTasks: counts.completedLateTasks,
  });

  const taskPoints =
    counts.totalAssignedTasks <= 0 ? 0 : counts.completedTaskPriorityPoints;

  return {
    adjustedCompletionRate,
    taskPoints,
  };
}

export function buildTaskPerformanceCounts({
  totalAssignedTasks,
  completedOnTimeTasks,
  completedLateTasks,
  completedTaskPriorityPoints = 0,
}: Omit<
  TaskPerformanceCounts,
  "notCompletedTasks" | "completedTaskPriorityPoints"
> &
  Pick<
    Partial<TaskPerformanceCounts>,
    "completedTaskPriorityPoints"
  >): TaskPerformanceCounts {
  return {
    totalAssignedTasks,
    completedOnTimeTasks,
    completedLateTasks,
    completedTaskPriorityPoints,
    notCompletedTasks: Math.max(
      0,
      totalAssignedTasks - completedOnTimeTasks - completedLateTasks,
    ),
  };
}
