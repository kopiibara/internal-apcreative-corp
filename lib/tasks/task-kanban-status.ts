import type { TaskAssignmentStatus } from "@/lib/tasks/task-type";

export const TASK_KANBAN_STAGE_CONFIG = {
  ASSIGNED: {
    icon: "Clock",
    toneClassName:
      "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
    badgeClassName: "border-muted-foreground/30 bg-muted/40",
  },
  BLOCKER: {
    icon: "AlertTriangle",
    toneClassName: "border-destructive/40 bg-destructive/10 text-destructive",
    badgeClassName: "border-destructive/40 bg-destructive/10",
  },
  PENDING: {
    icon: "CheckCircle",
    toneClassName:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    badgeClassName: "border-sky-500/30 bg-sky-500/10",
  },
  DONE: {
    icon: "BadgeCheck",
    toneClassName:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    badgeClassName: "border-emerald-500/30 bg-emerald-500/10",
  },
  REVISION: {
    icon: "RotateCcw",
    toneClassName:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
    badgeClassName: "border-yellow-500/30 bg-yellow-500/10",
  },
} satisfies Record<
  TaskAssignmentStatus,
  {
    icon: string;
    toneClassName: string;
    badgeClassName: string;
  }
>;

export function getTaskKanbanStageConfig(status: TaskAssignmentStatus) {
  return TASK_KANBAN_STAGE_CONFIG[status];
}
