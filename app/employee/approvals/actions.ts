"use server";

import { revalidatePath } from "next/cache";

import {
  createContentReportSchema,
  deleteContentReportSchema,
  publishContentReportSchema,
  scheduleContentReportSchema,
  updateContentReportSchema,
} from "@/app/employee/approvals/schema";
import {
  resolveContentReportBrandId,
} from "@/lib/content-reports";
import { canEmployeeEditReport } from "@/types/content-report";
import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { query, transaction } from "@/lib/db";
import { can } from "@/lib/permissions";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  canUserPublishApprovalRequest,
  canUserScheduleApprovalRequest,
} from "@/lib/approvals/approval-permissions";
import { insertApprovalActivityLog } from "@/lib/approvals/approval-activity-log";

import { APPROVAL_REVALIDATE_PATHS } from "@/lib/dashboard/dashboard-revalidate-paths";

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

type ReportOwnershipRow = {
  submitted_by_profile_id: number;
  brand_id: number | null;
  supervisor_status: "Pending" | "Approved" | "Rejected" | "Revision";
  director_status: "Pending" | "Approved" | "Rejected" | "Revision";
  publish_status: "Pending" | "Scheduled" | "Published" | "Cancelled";
  publishing_proof_url: string | null;
};

function revalidateApprovalRoutes() {
  for (const route of APPROVAL_REVALIDATE_PATHS) {
    revalidatePath(route);
  }
}

async function authorizeContentReportAction(permissionKey: string) {
  const context = await getCurrentProfileContext();

  if (!context) {
    return {
      error: {
        success: false,
        message: "You must be signed in to perform this action.",
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

  const allowed = await can(context.profile.auth_user_id, permissionKey);

  if (!allowed) {
    return {
      error: {
        success: false,
        message: "You do not have permission to perform this action.",
      } satisfies ActionResult,
    };
  }

  return {
    context,
  };
}

async function getReportOwnership(reportId: number) {
  const result = await query<ReportOwnershipRow>(
    `
    SELECT
      submitted_by_profile_id,
      brand_id,
      supervisor_status,
      director_status,
      publish_status,
      publishing_proof_url
    FROM content_report
    WHERE id = $1
    LIMIT 1
    `,
    [reportId],
  );

  return result.rows[0];
}

export async function createContentReport(
  input: unknown,
): Promise<ActionResult> {
  const authorization = await authorizeContentReportAction(
    "content_reports.create",
  );

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimit = await enforceRateLimit({
    bucket: "content-report:create",
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  const parsed = createContentReportSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid content report.",
    };
  }

  const { profile } = authorization.context;
  const brandResolution = await resolveContentReportBrandId(
    profile.id,
    parsed.data.brandId,
  );

  if (!brandResolution.ok) {
    return {
      success: false,
      message: brandResolution.message,
    };
  }

  const brandId = brandResolution.brandId;

  try {
    await query(
      `
      WITH inserted_report AS (
        INSERT INTO content_report (
          submitted_by_profile_id,
          brand_id,
          content_type,
          platform,
          content_inspo,
          caption,
          asset_link,
          employee_comments
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      )
      INSERT INTO approval_activity_log (
        content_report_id,
        actor_profile_id,
        action,
        from_status,
        to_status,
        notes,
        metadata
      )
      SELECT
        id,
        $1,
        'content_report_created',
        NULL,
        'Pending',
        'Approval request created.',
        jsonb_build_object('brandId', $2, 'source', 'approval_form')
      FROM inserted_report
      `,
      [
        profile.id,
        brandId,
        parsed.data.contentType,
        parsed.data.platform,
        parsed.data.contentInspo,
        parsed.data.caption,
        parsed.data.assetLink,
        parsed.data.employeeComments,
      ],
    );

    for (const route of APPROVAL_REVALIDATE_PATHS) {
      revalidatePath(route);
    }

    return {
      success: true,
      message: "Content report submitted successfully.",
    };
  } catch (error) {
    console.error("createContentReport failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function updateContentReport(
  input: unknown,
): Promise<ActionResult> {
  const authorization = await authorizeContentReportAction(
    "content_reports.update",
  );

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimit = await enforceRateLimit({
    bucket: "content-report:update",
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  const parsed = updateContentReportSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid content report.",
    };
  }

  const { profile } = authorization.context;
  const report = await getReportOwnership(parsed.data.reportId);

  if (!report || report.submitted_by_profile_id !== profile.id) {
    return {
      success: false,
      message: "Content report was not found.",
    };
  }

  if (
    !canEmployeeEditReport({
      supervisorStatus: report.supervisor_status,
      directorStatus: report.director_status,
      publishStatus: report.publish_status,
    })
  ) {
    return {
      success: false,
      message: "This report can no longer be edited.",
    };
  }

  const brandResolution = await resolveContentReportBrandId(
    profile.id,
    parsed.data.brandId,
    report.brand_id,
  );

  if (!brandResolution.ok) {
    return {
      success: false,
      message: brandResolution.message,
    };
  }

  try {
    await query(
      `
      UPDATE content_report
      SET
        brand_id = $2,
        content_type = $3,
        platform = $4,
        content_inspo = $5,
        caption = $6,
        asset_link = $7,
        employee_comments = $8,
        updated_at = now()
      WHERE id = $1
      `,
      [
        parsed.data.reportId,
        brandResolution.brandId,
        parsed.data.contentType,
        parsed.data.platform,
        parsed.data.contentInspo,
        parsed.data.caption,
        parsed.data.assetLink,
        parsed.data.employeeComments,
      ],
    );

    for (const route of APPROVAL_REVALIDATE_PATHS) {
      revalidatePath(route);
    }

    return {
      success: true,
      message: "Content report updated successfully.",
    };
  } catch (error) {
    console.error("updateContentReport failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function cancelContentReport(
  input: unknown,
): Promise<ActionResult> {
  const authorization = await authorizeContentReportAction(
    "content_reports.update",
  );

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimit = await enforceRateLimit({
    bucket: "content-report:update",
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  const parsed = deleteContentReportSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid content report.",
    };
  }

  const { profile } = authorization.context;

  try {
    await transaction(async (client) => {
      const reportResult = await client.query<ReportOwnershipRow>(
        `
        SELECT
          submitted_by_profile_id,
          brand_id,
          supervisor_status,
          director_status,
          publish_status
        FROM content_report
        WHERE id = $1
        LIMIT 1
        `,
        [parsed.data.reportId],
      );
      const report = reportResult.rows[0];

      if (!report || report.submitted_by_profile_id !== profile.id) {
        throw new Error("Content report was not found.");
      }

      if (
        !canEmployeeEditReport({
          supervisorStatus: report.supervisor_status,
          directorStatus: report.director_status,
          publishStatus: report.publish_status,
        })
      ) {
        throw new Error("This report can no longer be cancelled.");
      }

      await client.query(
        `
        UPDATE content_report
        SET publish_status = 'Cancelled',
            remarks_revision_summary = COALESCE(
              remarks_revision_summary,
              'Cancelled by submitter'
            ),
            updated_at = now()
        WHERE id = $1
        `,
        [parsed.data.reportId],
      );
    });

    for (const route of APPROVAL_REVALIDATE_PATHS) {
      revalidatePath(route);
    }

    return {
      success: true,
      message: "Content report cancelled successfully.",
    };
  } catch (error) {
    console.error("cancelContentReport failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function publishContentReportNow(
  input: unknown,
): Promise<ActionResult> {
  const context = await getCurrentProfileContext();

  if (!context) {
    return { success: false, message: "You must be signed in to publish." };
  }

  if (context.profile.status !== "ACTIVE") {
    return { success: false, message: "Your account is not active." };
  }

  const parsed = publishContentReportSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ?? "Publishing proof is required.",
    };
  }

  const rateLimit = await enforceRateLimit({
    bucket: "content-report:publish",
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  try {
    await transaction(async (client) => {
      const currentResult = await client.query<ReportOwnershipRow>(
        `
        SELECT
          submitted_by_profile_id,
          brand_id,
          supervisor_status,
          director_status,
          publish_status,
          publishing_proof_url
        FROM content_report
        WHERE id = $1
        FOR UPDATE
        `,
        [parsed.data.reportId],
      );
      const current = currentResult.rows[0];

      if (!current) {
        throw new Error("Content report was not found.");
      }

      const allowed = await canUserPublishApprovalRequest(
        context.profile,
        {
          brandId: current.brand_id,
          supervisorStatus: current.supervisor_status,
          directorStatus: current.director_status,
          publishStatus: current.publish_status,
          publishingProofUrl: current.publishing_proof_url,
        },
      );

      if (!allowed) {
        throw new Error("You do not have permission to publish this request.");
      }

      await client.query(
        `
        UPDATE content_report
        SET
          publish_status = 'Published',
          publishing_proof_url = $2,
          publishing_proof_note = $3,
          publishing_proof_submitted_by_profile_id = $4,
          publishing_proof_submitted_at = now(),
          published_by_profile_id = $4,
          published_at = now(),
          scheduled_published_date = COALESCE(scheduled_published_date, now()),
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.reportId,
          parsed.data.proofUrl,
          parsed.data.proofNote,
          context.profile.id,
        ],
      );

      await insertApprovalActivityLog({
        client,
        reportId: parsed.data.reportId,
        actorProfileId: context.profile.id,
        action: "publishing_proof_submitted",
        fromStatus: current.publish_status,
        toStatus: "Published",
        notes: parsed.data.proofNote ?? parsed.data.proofUrl,
        metadata: {
          proofUrl: parsed.data.proofUrl,
          source: "brand_officer_publish_now",
        },
      });

      await insertApprovalActivityLog({
        client,
        reportId: parsed.data.reportId,
        actorProfileId: context.profile.id,
        action: "brand_officer_published",
        fromStatus: current.publish_status,
        toStatus: "Published",
        notes: "Brand Officer published the request. Proof submitted.",
        metadata: {
          proofUrl: parsed.data.proofUrl,
          source: "brand_officer_publish_now",
        },
      });
    });

    revalidateApprovalRoutes();
    return { success: true, message: "Approval request published." };
  } catch (error) {
    console.error("publishContentReportNow failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function scheduleContentReportPublishing(
  input: unknown,
): Promise<ActionResult> {
  const context = await getCurrentProfileContext();

  if (!context) {
    return { success: false, message: "You must be signed in to schedule." };
  }

  if (context.profile.status !== "ACTIVE") {
    return { success: false, message: "Your account is not active." };
  }

  const parsed = scheduleContentReportSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ?? "Scheduled publish date is required.",
    };
  }

  const rateLimit = await enforceRateLimit({
    bucket: "content-report:schedule",
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  try {
    await transaction(async (client) => {
      const currentResult = await client.query<ReportOwnershipRow>(
        `
        SELECT
          submitted_by_profile_id,
          brand_id,
          supervisor_status,
          director_status,
          publish_status,
          publishing_proof_url
        FROM content_report
        WHERE id = $1
        FOR UPDATE
        `,
        [parsed.data.reportId],
      );
      const current = currentResult.rows[0];

      if (!current) {
        throw new Error("Content report was not found.");
      }

      const allowed = await canUserScheduleApprovalRequest(
        context.profile,
        {
          brandId: current.brand_id,
          supervisorStatus: current.supervisor_status,
          directorStatus: current.director_status,
          publishStatus: current.publish_status,
          publishingProofUrl: current.publishing_proof_url,
        },
      );

      if (!allowed) {
        throw new Error("You do not have permission to schedule this request.");
      }

      await client.query(
        `
        UPDATE content_report
        SET
          publish_status = 'Scheduled',
          scheduled_published_date = $2,
          scheduled_by_profile_id = $3,
          scheduled_at = now(),
          publishing_proof_url = COALESCE($4, publishing_proof_url),
          publishing_proof_note = COALESCE($5, publishing_proof_note),
          publishing_proof_submitted_by_profile_id = CASE
            WHEN $4::text IS NULL THEN publishing_proof_submitted_by_profile_id
            ELSE $3
          END,
          publishing_proof_submitted_at = CASE
            WHEN $4::text IS NULL THEN publishing_proof_submitted_at
            ELSE now()
          END,
          remarks_revision_summary = COALESCE($5, remarks_revision_summary),
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.reportId,
          parsed.data.scheduledPublishedDate,
          context.profile.id,
          parsed.data.proofUrl,
          parsed.data.notes,
        ],
      );

      await insertApprovalActivityLog({
        client,
        reportId: parsed.data.reportId,
        actorProfileId: context.profile.id,
        action: "brand_officer_scheduled_publish",
        fromStatus: current.publish_status,
        toStatus: "Scheduled",
        notes: parsed.data.notes ?? "Brand Officer scheduled publishing.",
        metadata: {
          scheduledPublishedDate:
            parsed.data.scheduledPublishedDate.toISOString(),
          proofUrl: parsed.data.proofUrl,
          source: "brand_officer_schedule_publish",
        },
      });

      if (parsed.data.proofUrl) {
        await insertApprovalActivityLog({
          client,
          reportId: parsed.data.reportId,
          actorProfileId: context.profile.id,
          action: "publishing_proof_submitted",
          fromStatus: current.publish_status,
          toStatus: "Scheduled",
          notes: parsed.data.notes ?? parsed.data.proofUrl,
          metadata: {
            proofUrl: parsed.data.proofUrl,
            source: "brand_officer_schedule_publish",
          },
        });
      }
    });

    revalidateApprovalRoutes();
    return { success: true, message: "Approval request scheduled." };
  } catch (error) {
    console.error("scheduleContentReportPublishing failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}
