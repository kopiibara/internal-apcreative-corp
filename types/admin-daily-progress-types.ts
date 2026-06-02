import type { EmployeeDailyProgressDashboardProps } from "@/components/daily-progress/employee-daily-progress-dashboard";
import type {
  DailyProgressReportRecord,
  DailyProgressSummary,
} from "@/lib/daily-progress-report/daily-progress-report";

export type AdminDailyProgressDashboardProps = {
  reports: DailyProgressReportRecord[];
  summary: DailyProgressSummary;
  /** Report date shown on the kanban board (typically today). */
  boardDate: string;
  /** Date used as the default anchor for DPR date selectors. */
  targetDate: string;
  ownDailyProgressData?: EmployeeDailyProgressDashboardProps | null;
};

export type DailyProgressStatusFilter =
  | "all"
  | "Submitted"
  | "Late Pending"
  | "Missed";

export type DailyProgressReviewDecision = "Approved" | "Rejected";

export type DailyProgressKanbanColumnConfig = {
  key: Exclude<DailyProgressStatusFilter, "all">;
  title: string;
  badgeClassName: string;
};

export type DailyProgressReviewDrafts = {
  reviewNotesById: Record<number, string>;
  awardPointsById: Record<number, string>;
  reviewDecisionById: Record<number, DailyProgressReviewDecision | undefined>;
};
