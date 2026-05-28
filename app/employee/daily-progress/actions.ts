"use server";

import { revalidatePath } from "next/cache";

import { submitDailyProgressSchema } from "@/app/employee/daily-progress/schema";
import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { isEmployeeAccountType } from "@/lib/auth/account-type";
import { transaction } from "@/lib/db";
import { can } from "@/lib/permissions";
import {
  toDateKey,
} from "@/lib/daily-progress-report/daily-progress-report";
import {
  calculateDailyProgressPoints,
  getDailyProgressExcuseReason,
  isWeekendPH,
} from "@/lib/daily-progress-report/scoring";
import { formatDateKeyInPhilippines } from "@/lib/daily-reports/daily-report-filters";
import { rejectIfRateLimited } from "@/lib/security/rate-limit-guards";
import { normalizeRichTextForStorage } from "@/lib/rich-text/rich-text";
import {
  sanitizeOptionalText,
  sanitizeRequiredText,
} from "@/lib/security/sanitize-text";

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

function revalidateDailyProgressRoutes() {
  revalidatePath("/employee/daily-progress");
  revalidatePath("/admin/daily-progress");
  revalidatePath("/admin/staff-accountability");
}

export async function submitDailyProgressReport(
  input: unknown,
): Promise<ActionResult> {
  const context = await getCurrentProfileContext();

  if (!context) {
    return { success: false, message: "You must be signed in." };
  }

  if (context.profile.status !== "ACTIVE") {
    return { success: false, message: "Your account is not active." };
  }

  if (
    !isEmployeeAccountType(context.profile.account_type) &&
    context.profile.account_type !== "FULL_STACK_DEVELOPER"
  ) {
    return {
      success: false,
      message: "Use the admin Daily Progress page for management actions.",
    };
  }

  const allowed =
    (await can(context.profile.auth_user_id, "daily_progress.submit")) ||
    (await can(context.profile.auth_user_id, "daily_progress.view_own"));

  if (!allowed) {
    return {
      success: false,
      message: "You do not have permission to submit Daily Progress Reports.",
    };
  }

  const rateLimitError = await rejectIfRateLimited({
    bucket: "daily-progress:submit",
    limit: 20,
    windowMs: 60_000,
  });

  if (rateLimitError) {
    return { success: false, message: rateLimitError.message };
  }

  const parsed = submitDailyProgressSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid report details.",
    };
  }

  const todayDateKey = formatDateKeyInPhilippines(new Date());
  const reportDateKey = toDateKey(parsed.data.reportDate);

  if (reportDateKey > todayDateKey) {
    return { success: false, message: "Future reports are not allowed." };
  }

  const reportDate = new Date(`${reportDateKey}T12:00:00+08:00`);

  if (isWeekendPH(reportDate)) {
    return {
      success: false,
      message: "Daily Progress Reports are not required on weekends.",
    };
  }

  const excuseReason = await getDailyProgressExcuseReason(
    context.profile.id,
    reportDateKey,
  );

  if (excuseReason) {
    return {
      success: false,
      message: `Daily Progress Report is excused for this date: ${excuseReason}.`,
    };
  }

  const isLateRequest = reportDateKey < todayDateKey;

  if (isLateRequest && !parsed.data.lateReasonCategory) {
    return {
      success: false,
      message: "A reason is required for previous-date report requests.",
    };
  }

  if (
    isLateRequest &&
    parsed.data.lateReasonCategory === "Others" &&
    !parsed.data.lateReason?.trim()
  ) {
    return {
      success: false,
      message: "Reason details are required when Others is selected.",
    };
  }

  const status = isLateRequest ? "Late" : "Submitted";
  const lateApprovalStatus = isLateRequest ? "Pending" : null;
  const points = calculateDailyProgressPoints(status, lateApprovalStatus);
  const normalizedSummary = normalizeRichTextForStorage(parsed.data.summary);
  const normalizedBlockers = parsed.data.blockers
    ? normalizeRichTextForStorage(parsed.data.blockers)
    : null;
  const lateReason = isLateRequest
    ? parsed.data.lateReasonCategory === "Others"
      ? `Others: ${sanitizeRequiredText(parsed.data.lateReason ?? "", 1900)}`
      : parsed.data.lateReason?.trim()
        ? `${parsed.data.lateReasonCategory}: ${sanitizeRequiredText(parsed.data.lateReason, 1800)}`
        : parsed.data.lateReasonCategory
    : null;

  try {
    await transaction(async (client) => {
      const existing = await client.query<{
        id: number;
        status: string;
        late_approval_status: string | null;
      }>(
        `
        SELECT id, status, late_approval_status
        FROM daily_progress_report
        WHERE profile_id = $1
          AND report_date = $2::date
        LIMIT 1
        `,
        [context.profile.id, reportDateKey],
      );
      const existingReport = existing.rows[0];
      const canEditSameDayReport =
        existingReport &&
        reportDateKey === todayDateKey &&
        existingReport.status === "Submitted";

      if (
        existingReport &&
        !canEditSameDayReport &&
        !(
          isLateRequest &&
          existingReport.status === "Missed" &&
          existingReport.late_approval_status !== "Rejected"
        )
      ) {
        throw new Error("You already have a Daily Progress Report for this date.");
      }

      if (canEditSameDayReport) {
        await client.query(
          `
          UPDATE daily_progress_report
          SET
            brand_id = $2,
            summary = $3,
            blockers = $4,
            proof_link = $5,
            updated_by_profile_id = $6,
            updated_at = now()
          WHERE id = $1
            AND report_date = $7::date
            AND status = 'Submitted'
          `,
          [
            existingReport.id,
            parsed.data.brandId ?? null,
            sanitizeRequiredText(normalizedSummary, 8000),
            sanitizeOptionalText(normalizedBlockers, 8000),
            sanitizeOptionalText(parsed.data.proofLink, 1000),
            context.profile.id,
            todayDateKey,
          ],
        );

        return;
      }

      if (existingReport) {
        await client.query(
          `
          UPDATE daily_progress_report
          SET
            brand_id = $2,
            summary = $3,
            blockers = $4,
            proof_link = $5,
            submitted_at = now(),
            status = 'Late',
            points_awarded = 0,
            deduction_applied = 0,
            excused_reason = NULL,
            late_reason = $6,
            late_approval_status = 'Pending',
            late_requested_at = now(),
            late_reviewed_by_profile_id = NULL,
            late_reviewed_at = NULL,
            late_review_notes = NULL,
            updated_by_profile_id = $7,
            updated_at = now()
          WHERE id = $1
          `,
          [
            existingReport.id,
            parsed.data.brandId ?? null,
            sanitizeRequiredText(normalizedSummary, 8000),
            sanitizeOptionalText(normalizedBlockers, 8000),
            sanitizeOptionalText(parsed.data.proofLink, 1000),
            sanitizeRequiredText(lateReason ?? "", 2000),
            context.profile.id,
          ],
        );

        return;
      }

      await client.query(
        `
        INSERT INTO daily_progress_report (
          profile_id,
          brand_id,
          report_date,
          summary,
          blockers,
          proof_link,
          submitted_at,
          status,
          points_awarded,
          deduction_applied,
          late_reason,
          late_approval_status,
          late_requested_at,
          created_by_profile_id,
          updated_by_profile_id
        )
        VALUES (
          $1,
          $2,
          $3::date,
          $4,
          $5,
          $6,
          now(),
          $7,
          $8,
          $9,
          $10,
          $11,
          CASE WHEN $11::text IS NULL THEN NULL ELSE now() END,
          $12,
          $12
        )
        `,
        [
          context.profile.id,
          parsed.data.brandId ?? null,
          reportDateKey,
          sanitizeRequiredText(normalizedSummary, 8000),
          sanitizeOptionalText(normalizedBlockers, 8000),
          sanitizeOptionalText(parsed.data.proofLink, 1000),
          status,
          points.pointsAwarded,
          points.deductionApplied,
          lateReason ? sanitizeRequiredText(lateReason, 2000) : null,
          lateApprovalStatus,
          context.profile.id,
        ],
      );
    });

    revalidateDailyProgressRoutes();

    return {
      success: true,
      message:
        reportDateKey === todayDateKey
          ? "Today's Daily Progress Report was saved."
          : "Previous-date report was submitted for supervisor approval.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Daily Progress Report could not be submitted.",
    };
  }
}
