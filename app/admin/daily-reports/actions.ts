"use server";

import { fetchDailyReportSchema } from "@/app/admin/daily-reports/schema";
import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import {
  parseDailyReportFilters,
  type DailyReportFiltersInput,
} from "@/lib/daily-reports/daily-report-filters";
import type { DailyReportData } from "@/lib/daily-reports/daily-report-types";
import { getDailyReportData } from "@/lib/daily-reports/daily-reports";
import { can } from "@/lib/permissions";
import { rejectIfRateLimited } from "@/lib/security/rate-limit-guards";

export type DailyReportActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

async function authorizeDailyReportView(): Promise<DailyReportActionResult<DailyReportData> | null> {
  const context = await getCurrentProfileContext();

  if (!context) {
    return {
      success: false,
      message: "You must be signed in to view daily reports.",
    };
  }

  if (context.profile.status !== "ACTIVE") {
    return {
      success: false,
      message: "Your account is not active.",
    };
  }

  const allowed = await can(context.profile.auth_user_id, "daily_reports.view");

  if (!allowed) {
    return {
      success: false,
      message: "You do not have permission to view daily reports.",
    };
  }

  return null;
}

export async function fetchDailyReportAction(
  input: DailyReportFiltersInput,
): Promise<
  DailyReportActionResult<Awaited<ReturnType<typeof getDailyReportData>>>
> {
  const authError = await authorizeDailyReportView();

  if (authError) {
    return authError;
  }

  const rateLimitError = await rejectIfRateLimited({
    bucket: "daily-reports:fetch",
    limit: 60,
    windowMs: 60_000,
  });

  if (rateLimitError) {
    return rateLimitError;
  }

  const parsed = fetchDailyReportSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid filter values.",
    };
  }

  try {
    const bounds = parseDailyReportFilters(parsed.data);
    const data = await getDailyReportData(bounds);

    return {
      success: true,
      message: "Daily report loaded.",
      data,
    };
  } catch {
    return {
      success: false,
      message: "Unable to load daily report data.",
    };
  }
}
