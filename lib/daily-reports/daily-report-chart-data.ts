import type {
  DailyBrandSummary,
  DailyEmployeeSummary,
} from "@/lib/daily-reports/daily-report-types";
import { truncateChartLabel } from "@/lib/chart-layout";

export type BrandChartItem = {
  brandName: string;
  chartLabel: string;
  graded: number;
  done: number;
  pending: number;
  blockers: number;
  approvals: number;
  approved: number;
  completionRate: number;
  approvalRate: number;
};

export type EmployeeChartItem = {
  profileId: number;
  employeeName: string;
  email: string;
  imageUrl: string | null;
  graded: number;
  done: number;
  pending: number;
  blockers: number;
  revisions: number;
  approvals: number;
  approved: number;
  completionRate: number;
  taskPoints: number;
  chartLabel: string;
};

export function toBrandChartItems(
  summaries: DailyBrandSummary[],
): BrandChartItem[] {
  return summaries.map((summary) => ({
    brandName: summary.brandName,
    chartLabel: truncateChartLabel(summary.brandName),
    graded: summary.gradedTotal,
    done: summary.gradedDone,
    pending: summary.pendingTasks,
    blockers: summary.blockerTasks,
    approvals: summary.approvalsSubmitted,
    approved: summary.fullyApproved,
    completionRate: summary.completionRate,
    approvalRate: summary.approvalRate,
  }));
}

export function toEmployeeChartItems(
  summaries: DailyEmployeeSummary[],
): EmployeeChartItem[] {
  return summaries.map((summary) => ({
    profileId: summary.profileId,
    employeeName: summary.fullName,
    email: summary.email,
    imageUrl: summary.imageUrl,
    graded: summary.assignedGradedTasks,
    done: summary.doneGradedTasks,
    pending: summary.pendingTasks,
    blockers: summary.blockerTasks,
    revisions: summary.revisionTasks,
    approvals: summary.approvalsSubmitted,
    approved: summary.approvalsApproved,
    completionRate: summary.gradedCompletionRate,
    taskPoints: summary.taskPoints,
    chartLabel: truncateChartLabel(summary.fullName),
  }));
}
