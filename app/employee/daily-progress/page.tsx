import { redirect } from "next/navigation";

import { EmployeeDailyProgressDashboard } from "@/components/daily-progress/employee-daily-progress-dashboard";
import { requireEmployee } from "@/lib/auth/auth-session";
import { can } from "@/lib/permissions";
import { getOwnDailyProgressPageData } from "@/lib/daily-progress-report/daily-progress-report";

export default async function EmployeeDailyProgressPage() {
  const { profile } = await requireEmployee();
  const allowed =
    (await can(profile.auth_user_id, "daily_progress.submit")) ||
    (await can(profile.auth_user_id, "daily_progress.view_own"));

  if (!allowed) {
    redirect("/employee/unauthorized?permission=daily_progress.submit");
  }

  const pageData = await getOwnDailyProgressPageData(profile.id);

  return <EmployeeDailyProgressDashboard {...pageData} />;
}
