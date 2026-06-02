//admin/daily-progress/actions.ts

"use server";

import { revalidatePath } from "next/cache";

import {
  markMissedDailyProgressSchema,
  reviewLateDailyProgressSchema,
} from "@/app/admin/daily-progress/schema";
import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { can } from "@/lib/permissions";
import { query, transaction } from "@/lib/db";
import {
  getDailyProgressReportById,
  getYesterdayDateKeyInPhilippines,
  upsertMissedDailyProgressForDate,
} from "@/lib/daily-progress-report/daily-progress-report";
import {
  DAILY_PROGRESS_SCORING_START_DATE_KEY,
  isBeforeDailyProgressScoringStart,
} from "@/lib/daily-progress-report/constants";
import { calculateDailyProgressPoints } from "@/lib/daily-progress-report/scoring";
import { isWeekendDateKeyInPhilippines } from "@/lib/daily-reports/daily-report-filters";
import { rejectIfRateLimited } from "@/lib/security/rate-limit-guards";
import {
  sanitizeOptionalText,
  sanitizeRequiredText,
} from "@/lib/security/sanitize-text";

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

async function authorizeDailyProgressAdmin(permissionKey: string) {
  const context = await getCurrentProfileContext();

  if (!context) {
    return {
      error: {
        success: false,
        message: "You must be signed in.",
      } satisfies ActionResult,
    };
  }

  if (context.profile.status !== "ACTIVE") {
    return {
      error: {
        success: false,
        message: "Your account is not active.",
      } satisfies ActionResult,
    };
  }

  if (!(await can(context.profile.auth_user_id, permissionKey))) {
    return {
      error: {
        success: false,
        message: "You do not have permission to perform this action.",
      } satisfies ActionResult,
    };
  }

  return { context };
}

function revalidateDailyProgressRoutes() {
  revalidatePath("/admin/daily-progress");
  revalidatePath("/employee/daily-progress");
  revalidatePath("/admin/staff-accountability");
}

export async function reviewLateDailyProgressReport(
  input: unknown,
): Promise<ActionResult> {
  const authorization = await authorizeDailyProgressAdmin(
    "daily_progress.approve_late",
  );

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimitError = await rejectIfRateLimited({
    bucket: "daily-progress:review-late",
    limit: 60,
    windowMs: 60_000,
  });

  if (rateLimitError) {
    return { success: false, message: rateLimitError.message };
  }

  const parsed = reviewLateDailyProgressSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid review details.",
    };
  }

  if (parsed.data.decision === "Rejected" && !parsed.data.reviewNotes?.trim()) {
    return {
      success: false,
      message: "A review note is required when rejecting a late report.",
    };
  }

  const report = await getDailyProgressReportById(parsed.data.reportId);

  if (!report) {
    return { success: false, message: "Late report request was not found." };
  }

  if (report.profileId === authorization.context.profile.id) {
    return {
      success: false,
      message: "You cannot approve your own late Daily Progress request.",
    };
  }

  if (report.status !== "Late" || report.lateApprovalStatus !== "Pending") {
    return {
      success: false,
      message: "Only pending late report requests can be reviewed.",
    };
  }

  const nextStatus = parsed.data.decision === "Approved" ? "Late" : "Missed";
  const isWeekendReport = isWeekendDateKeyInPhilippines(report.reportDate);
  const points = isWeekendReport
    ? { pointsAwarded: 0, deductionApplied: 0 }
    : calculateDailyProgressPoints(nextStatus, parsed.data.decision);
  const pointsAwarded =
    parsed.data.decision === "Approved" && !isWeekendReport
      ? (parsed.data.pointsAwarded ?? points.pointsAwarded)
      : points.pointsAwarded;

  await transaction(async (client) => {
    await client.query(
      `
      UPDATE daily_progress_report
      SET
        status = $2,
        late_approval_status = $3,
        points_awarded = $4,
        deduction_applied = $5,
        late_reviewed_by_profile_id = $6,
        late_reviewed_at = now(),
        late_review_notes = $7,
        updated_by_profile_id = $6,
        updated_at = now()
      WHERE id = $1
        AND status = 'Late'
        AND late_approval_status = 'Pending'
      `,
      [
        parsed.data.reportId,
        nextStatus,
        parsed.data.decision,
        pointsAwarded,
        points.deductionApplied,
        authorization.context.profile.id,
        parsed.data.decision === "Rejected"
          ? sanitizeRequiredText(parsed.data.reviewNotes ?? "", 2000)
          : sanitizeOptionalText(parsed.data.reviewNotes, 2000),
      ],
    );
  });

  revalidateDailyProgressRoutes();

  return {
    success: true,
    message:
      parsed.data.decision === "Approved"
        ? `Late report approved. +${pointsAwarded} points awarded.`
        : isWeekendReport
          ? "Late report rejected. Weekend reports have no deduction."
          : "Late report rejected. Missed deduction applied.",
  };
}

export async function markMissedDailyProgressReports(input: unknown): Promise<
  ActionResult<{
    createdMissed: number;
    createdExcused: number;
    skipped: number;
  }>
> {
  const authorization = await authorizeDailyProgressAdmin(
    "daily_progress.mark_missed",
  );

  if (authorization.error) {
    return authorization.error;
  }

  const parsed = markMissedDailyProgressSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid target date.",
    };
  }

  const targetDateKey =
    parsed.data.targetDate ?? getYesterdayDateKeyInPhilippines();

  if (isBeforeDailyProgressScoringStart(targetDateKey)) {
    return {
      success: true,
      message: `Daily Progress scoring starts on ${DAILY_PROGRESS_SCORING_START_DATE_KEY}. No missed deductions were created for ${targetDateKey}.`,
      data: { createdMissed: 0, createdExcused: 0, skipped: 0 },
    };
  }

  await query("SELECT 1");
  const result = await upsertMissedDailyProgressForDate({
    targetDateKey,
    actorProfileId: authorization.context.profile.id,
  });

  revalidateDailyProgressRoutes();

  return {
    success: true,
    message: `Missed checker completed for ${targetDateKey}.`,
    data: result,
  };
}
