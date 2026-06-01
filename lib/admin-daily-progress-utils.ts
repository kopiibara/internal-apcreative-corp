import type { DailyProgressReportRecord } from "@/lib/daily-progress-report/daily-progress-report";
import { DAILY_PROGRESS_SCORING_START_DATE_KEY } from "@/lib/daily-progress-report/constants";
import type {
  DailyProgressKanbanColumnConfig,
  DailyProgressStatusFilter,
} from "@/types/admin-daily-progress-types";

export const DAILY_PROGRESS_STATUS_COLUMNS: DailyProgressKanbanColumnConfig[] =
  [
    {
      key: "Submitted",
      title: "Submitted",
      badgeClassName: "border-green-700 bg-green-100 text-green-900",
    },
    {
      key: "Late Pending",
      title: "Late Pending",
      badgeClassName: "border-yellow-700 bg-yellow-100 text-yellow-950",
    },
    {
      key: "Missed",
      title: "Missed",
      badgeClassName: "border-red-700 bg-red-100 text-red-900",
    },
  ];

export function getDailyProgressTone(report: DailyProgressReportRecord) {
  if (report.status === "Submitted") {
    return "green" as const;
  }

  if (report.status === "Late" && report.lateApprovalStatus === "Pending") {
    return "yellow" as const;
  }

  if (report.status === "Missed") {
    return "red" as const;
  }

  return "blue" as const;
}

export function getDailyProgressStatusKey(
  report: DailyProgressReportRecord,
): DailyProgressStatusFilter {
  if (report.status === "Late" && report.lateApprovalStatus === "Pending") {
    return "Late Pending";
  }

  if (report.status === "Missed") {
    return "Missed";
  }

  if (
    report.status === "Submitted" ||
    (report.status === "Late" && report.lateApprovalStatus === "Approved")
  ) {
    return "Submitted";
  }

  return "all";
}

export function getRecentDailyProgressDateOptions(
  anchorDateKey: string,
  days = 14,
) {
  const anchorDate = new Date(`${anchorDateKey}T12:00:00+08:00`);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(anchorDate);
    date.setUTCDate(anchorDate.getUTCDate() - index);

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
    }).format(date);
  }).filter((dateKey) => dateKey >= DAILY_PROGRESS_SCORING_START_DATE_KEY);
}

export function getDailyProgressReportBrandNames(
  report: DailyProgressReportRecord,
) {
  return report.brandNames.length > 0
    ? report.brandNames
    : [report.brandName ?? "No brand"];
}
