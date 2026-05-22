import type { EmployeeApprovalKanbanColumnId } from "@/lib/approval-kanban"
import type { ApprovalKanbanColumnId } from "@/lib/approval-statuses"

export const KANBAN_STAGE_CONFIG = {
  pending: {
    icon: "Clock",
    toneClassName:
      "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
    badgeClassName: "border-muted-foreground/30 bg-muted/40",
  },
  "supervisor-approved": {
    icon: "Clock",
    toneClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    badgeClassName: "border-amber-500/30 bg-amber-500/10",
  },
  "ready-to-publish": {
    icon: "BadgeCheck",
    toneClassName:
      "border-lime-500/30 bg-lime-500/10 text-lime-700 dark:text-lime-300",
    badgeClassName: "border-lime-500/30 bg-lime-500/10",
  },
  revision: {
    icon: "RotateCcw",
    toneClassName:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
    badgeClassName: "border-yellow-500/30 bg-yellow-500/10",
  },
  rejected: {
    icon: "XCircle",
    toneClassName:
      "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    badgeClassName: "border-red-500/30 bg-red-500/10",
  },
  scheduled: {
    icon: "CalendarClock",
    toneClassName:
      "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    badgeClassName: "border-violet-500/30 bg-violet-500/10",
  },
  published: {
    icon: "CheckCheck",
    toneClassName:
      "border-lime-500/30 bg-lime-500/10 text-lime-700 dark:text-lime-300",
    badgeClassName: "border-lime-500/30 bg-lime-500/10",
  },
} satisfies Record<
  ApprovalKanbanColumnId,
  {
    icon: string
    toneClassName: string
    badgeClassName: string
  }
>

const EMPLOYEE_KANBAN_STAGE_CONFIG = {
  pending: KANBAN_STAGE_CONFIG.pending,
  "supervisor-review": {
    icon: "Clock",
    toneClassName:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    badgeClassName: "border-sky-500/30 bg-sky-500/10",
  },
  "director-review": {
    icon: "Clock",
    toneClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    badgeClassName: "border-amber-500/30 bg-amber-500/10",
  },
  revision: KANBAN_STAGE_CONFIG.revision,
  rejected: KANBAN_STAGE_CONFIG.rejected,
  "ready-to-publish": KANBAN_STAGE_CONFIG["ready-to-publish"],
  scheduled: KANBAN_STAGE_CONFIG.scheduled,
  published: KANBAN_STAGE_CONFIG.published,
} satisfies Record<
  EmployeeApprovalKanbanColumnId,
  {
    icon: string
    toneClassName: string
    badgeClassName: string
  }
>

export function getKanbanStageConfig(stage: ApprovalKanbanColumnId) {
  return KANBAN_STAGE_CONFIG[stage]
}

export function getEmployeeKanbanStageConfig(stage: EmployeeApprovalKanbanColumnId) {
  return EMPLOYEE_KANBAN_STAGE_CONFIG[stage]
}
