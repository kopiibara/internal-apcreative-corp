import { redirect } from "next/navigation";

import { AdminDailyProgressDashboard } from "@/components/daily-progress/admin-daily-progress-dashboard";
import { requireAdmin } from "@/lib/auth/auth-session";
import { can } from "@/lib/permissions";
import {
  getAdminDailyProgressData,
  getYesterdayDateKeyInPhilippines,
} from "@/lib/daily-progress-report/daily-progress-report";
import { getTodayDateKeyInPhilippines } from "@/lib/daily-reports/daily-report-filters";

type AdminDailyProgressPageProps = {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    brandId?: string;
    employeeId?: string;
    status?: string;
    lateApprovalStatus?: string;
  }>;
};

function parseOptionalId(value: string | undefined) {
  if (!value || value === "all") {
    return null;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseDateKey(value: string | undefined, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function getRecentStartDateKey(endDateKey: string, daysBack: number) {
  const date = new Date(`${endDateKey}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() - daysBack);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
  }).format(date);
}

export default async function AdminDailyProgressPage({
  searchParams,
}: AdminDailyProgressPageProps) {
  const { profile } = await requireAdmin();
  const canView =
    (await can(profile.auth_user_id, "daily_progress.view_all")) ||
    (await can(profile.auth_user_id, "daily_progress.manage"));

  if (!canView) {
    redirect("/admin/unauthorized?permission=daily_progress.view_all");
  }

  const params = await searchParams;
  const fallbackEndDate = getTodayDateKeyInPhilippines();
  const fallbackStartDate = getRecentStartDateKey(fallbackEndDate, 13);
  const missedCheckerTargetDate = getYesterdayDateKeyInPhilippines();
  const startDate = parseDateKey(params.startDate, fallbackStartDate);
  const endDate = parseDateKey(params.endDate, fallbackEndDate);
  const data = await getAdminDailyProgressData({
    startDate,
    endDate,
    brandId: parseOptionalId(params.brandId),
    employeeId: parseOptionalId(params.employeeId),
    status: params.status ?? null,
    lateApprovalStatus: params.lateApprovalStatus ?? null,
  });

  return (
    <AdminDailyProgressDashboard
      reports={data.reports}
      summary={data.summary}
      targetDate={missedCheckerTargetDate}
    />
  );
}
