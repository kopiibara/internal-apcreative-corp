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
  canEmployeeCreateContentReport,
  canUserCreateApprovalForBrand,
  canUserPublishApprovalRequest,
  canUserScheduleApprovalRequest,
} from "@/lib/approvals/approval-permissions";
import { isEmployeeAccountType } from "@/lib/auth/account-type";
import { insertApprovalActivityLog } from "@/lib/approvals/approval-activity-log";
import { normalizeProofSubmission } from "@/lib/proof/normalize-proof-submission";
import {
  buildRevisionAddressedMetadata,
  getOpenRevisionRequestsFromLogs,
} from "@/lib/approvals/approval-revision";
import { normalizeRichTextForStorage } from "@/lib/rich-text/rich-text";

import { APPROVAL_REVALIDATE_PATHS } from "@/lib/dashboard/dashboard-revalidate-paths";

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

type ReportOwnershipRow = {
  submitted_by_profile_id: number;
  brand_id: number | null;
  content_type: string;
  platform: string;
  content_inspo: string | null;
  caption: string;
  asset_link: string | null;
  employee_comments: string | null;
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

function formatNullableText(value: string | null) {
  return value ?? "";
}

function getChangedApprovalFields(
  current: ReportOwnershipRow,
  next: {
    brandId: number;
    contentType: string;
    platform: string;
    contentInspo: string | null;
    caption: string;
    assetLink: string | null;
    employeeComments: string | null;
  },
) {
  const fields = [
    {
      field: "brandId",
      label: "Brand",
      from: current.brand_id == null ? null : String(current.brand_id),
      to: String(next.brandId),
    },
    {
      field: "contentType",
      label: "Content type",
      from: current.content_type,
      to: next.contentType,
    },
    {
      field: "platform",
      label: "Platform",
      from: current.platform,
      to: next.platform,
    },
    {
      field: "contentInspo",
      label: "Content inspo",
      from: formatNullableText(current.content_inspo),
      to: formatNullableText(next.contentInspo),
    },
    {
      field: "caption",
      label: "Caption",
      from: current.caption,
      to: next.caption,
    },
    {
      field: "assetLink",
      label: "Asset link",
      from: formatNullableText(current.asset_link),
      to: formatNullableText(next.assetLink),
    },
    {
      field: "employeeComments",
      label: "Employee notes",
      from: formatNullableText(current.employee_comments),
      to: formatNullableText(next.employeeComments),
    },
  ];

  return fields.filter((field) => field.from !== field.to);
}

const CONTENT_REPORT_PERMISSION_MESSAGES: Record<string, string> = {
  "content_reports.create":
    "You need an active brand assignment before you can create approval requests.",
  "content_reports.update":
    "You do not have permission to update this approval request.",
  "content_reports.view":
    "You do not have permission to view approval requests.",
};

async function authorizeContentReportAction(
  permissionKey: string,
  brandId?: number,
) {
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

  const allowed = await can(
    context.profile.auth_user_id,
    permissionKey,
    brandId,
  );

  if (!allowed) {
    return {
      error: {
        success: false,
        message:
          CONTENT_REPORT_PERMISSION_MESSAGES[permissionKey] ??
          "You do not have permission to perform this action.",
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
      content_type,
      platform,
      content_inspo,
      caption,
      asset_link,
      employee_comments,
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
  const context = await getCurrentProfileContext();

  if (!context) {
    return {
      success: false,
      message: "You must be signed in to perform this action.",
    };
  }

  if (context.profile.status !== "ACTIVE") {
    return {
      success: false,
      message: "Your account is not active.",
    };
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

  const { profile } = context;
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

  if (!isEmployeeAccountType(profile.account_type)) {
    return {
      success: false,
      message: "Only employee accounts can create approval requests.",
    };
  }

  const canCreate = await canEmployeeCreateContentReport(profile, brandId);

  if (!canCreate) {
    return {
      success: false,
      message: CONTENT_REPORT_PERMISSION_MESSAGES["content_reports.create"],
    };
  }

  try {
    const normalizedContentInspo = parsed.data.contentInspo
      ? normalizeRichTextForStorage(parsed.data.contentInspo)
      : null;
    const normalizedEmployeeComments = parsed.data.employeeComments
      ? normalizeRichTextForStorage(parsed.data.employeeComments)
      : null;

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
        normalizedContentInspo,
        parsed.data.caption,
        parsed.data.assetLink,
        normalizedEmployeeComments,
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
  const context = await getCurrentProfileContext();

  if (!context) {
    return {
      success: false,
      message: "You must be signed in to perform this action.",
    };
  }

  if (context.profile.status !== "ACTIVE") {
    return {
      success: false,
      message: "Your account is not active.",
    };
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

  const { profile } = context;
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

  const brandId = brandResolution.brandId;

  if (!isEmployeeAccountType(profile.account_type)) {
    return {
      success: false,
      message: "Only employee accounts can update approval requests.",
    };
  }

  const canUpdate = await canUserCreateApprovalForBrand(profile.id, brandId);

  if (!canUpdate) {
    return {
      success: false,
      message: CONTENT_REPORT_PERMISSION_MESSAGES["content_reports.update"],
    };
  }
  const brandChanged = report.brand_id !== brandId;
  const reviewStarted =
    report.supervisor_status !== "Pending" ||
    report.director_status !== "Pending";

  if (brandChanged && reviewStarted) {
    return {
      success: false,
      message:
        "Brand can only be changed before Supervisor or Director review starts.",
    };
  }

  const normalizedContentInspo = parsed.data.contentInspo
    ? normalizeRichTextForStorage(parsed.data.contentInspo)
    : null;
  const normalizedEmployeeComments = parsed.data.employeeComments
    ? normalizeRichTextForStorage(parsed.data.employeeComments)
    : null;
  const changedFields = getChangedApprovalFields(report, {
    brandId,
    contentType: parsed.data.contentType,
    platform: parsed.data.platform,
    contentInspo: normalizedContentInspo,
    caption: parsed.data.caption,
    assetLink: parsed.data.assetLink,
    employeeComments: normalizedEmployeeComments,
  });
  const hadSupervisorRevision = report.supervisor_status === "Revision";
  const hadDirectorRevision = report.director_status === "Revision";

  try {
    await transaction(async (client) => {
      const activityLogsResult = await client.query<{
        id: number;
        content_report_id: number;
        actor_profile_id: number;
        actor_name: string;
        actor_image_url: string | null;
        actor_account_type: string;
        actor_position: string | null;
        action: string;
        from_status: string | null;
        to_status: string | null;
        notes: string;
        metadata: Record<string, unknown> | null;
        created_at: Date;
      }>(
        `
        SELECT
          aal.id,
          aal.content_report_id,
          aal.actor_profile_id,
          actor.full_name AS actor_name,
          actor_user.image AS actor_image_url,
          actor.account_type AS actor_account_type,
          actor.position AS actor_position,
          aal.action,
          aal.from_status,
          aal.to_status,
          aal.notes,
          aal.metadata,
          aal.created_at
        FROM approval_activity_log aal
        JOIN profile actor ON actor.id = aal.actor_profile_id
        JOIN "user" actor_user ON actor_user.id = actor.auth_user_id
        WHERE aal.content_report_id = $1
        ORDER BY aal.created_at ASC
        `,
        [parsed.data.reportId],
      );

      const activityLogs = activityLogsResult.rows.map((row) => ({
        id: row.id,
        contentReportId: row.content_report_id,
        actorProfileId: row.actor_profile_id,
        actorName: row.actor_name,
        actorImageUrl: row.actor_image_url,
        actorAccountType: row.actor_account_type,
        actorPosition: row.actor_position,
        action: row.action,
        fromStatus: row.from_status,
        toStatus: row.to_status,
        notes: row.notes,
        metadata: row.metadata,
        createdAt: row.created_at.toISOString(),
      }));

      const openRevisionRequests = getOpenRevisionRequestsFromLogs(activityLogs, {
        supervisorStatus: report.supervisor_status,
        directorStatus: report.director_status,
      });

      await client.query(
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
          supervisor_status = CASE
            WHEN $9 THEN 'Pending'
            ELSE supervisor_status
          END,
          director_status = CASE
            WHEN $10 THEN 'Pending'
            ELSE director_status
          END,
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.reportId,
          brandId,
          parsed.data.contentType,
          parsed.data.platform,
          normalizedContentInspo,
          parsed.data.caption,
          parsed.data.assetLink,
          normalizedEmployeeComments,
          hadSupervisorRevision,
          hadDirectorRevision,
        ],
      );

      if (changedFields.length > 0) {
        await insertApprovalActivityLog({
          client,
          reportId: parsed.data.reportId,
          actorProfileId: profile.id,
          action: "approval_request_edited",
          fromStatus: report.publish_status,
          toStatus: report.publish_status,
          notes: `Approval request edited. Changed fields: ${changedFields
            .map((field) => field.label)
            .join(", ")}.`,
          metadata: {
            changedFields,
            source: "approval_form",
          },
        });
      }

      for (const revisionRequest of openRevisionRequests) {
        await insertApprovalActivityLog({
          client,
          reportId: parsed.data.reportId,
          actorProfileId: profile.id,
          action: "revision_addressed",
          fromStatus: "Revision",
          toStatus: "Pending",
          notes: [
            `Creator addressed revision requested by ${revisionRequest.requestedByName}.`,
            `Addressed areas: ${revisionRequest.areaLabels.join(", ") || "Updated fields"}`,
            changedFields.length > 0
              ? `Changed fields:\n${changedFields
                  .map(
                    (field) =>
                      `- ${field.label}: "${field.from || "Empty"}" → "${field.to || "Empty"}"`,
                  )
                  .join("\n")}`
              : null,
            `${revisionRequest.roleLabel} status reset from Revision to Pending.`,
          ]
            .filter(Boolean)
            .join("\n"),
          metadata: buildRevisionAddressedMetadata({
            revisionRole: revisionRequest.role,
            revisionAreas: revisionRequest.areas,
            revisionInstruction: revisionRequest.instruction,
            addressedByProfileId: profile.id,
            addressedByName: profile.full_name,
            changedFields,
          }),
        });
      }
    });

    revalidateApprovalRoutes();

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
  const context = await getCurrentProfileContext();

  if (!context) {
    return {
      success: false,
      message: "You must be signed in to perform this action.",
    };
  }

  if (context.profile.status !== "ACTIVE") {
    return {
      success: false,
      message: "Your account is not active.",
    };
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

  const { profile } = context;

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
      message: "Approval deleted successfully.",
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

  const { proofUrl, proofNote } = normalizeProofSubmission(
    parsed.data.proofType,
    parsed.data.proofUrl,
    parsed.data.proofNote,
  );

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
        [parsed.data.reportId, proofUrl, proofNote, context.profile.id],
      );

      await insertApprovalActivityLog({
        client,
        reportId: parsed.data.reportId,
        actorProfileId: context.profile.id,
        action: "publishing_proof_submitted",
        fromStatus: current.publish_status,
        toStatus: "Published",
        notes: proofNote ?? proofUrl ?? "Publishing proof submitted.",
        metadata: {
          proofUrl,
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
          proofUrl,
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

  const hasScheduleProofInput =
    parsed.data.proofType === "NOTE"
      ? Boolean(parsed.data.proofNote?.trim())
      : Boolean(parsed.data.proofUrl?.trim() || parsed.data.proofNote?.trim());
  const scheduleProof = hasScheduleProofInput
    ? normalizeProofSubmission(
        parsed.data.proofType,
        parsed.data.proofUrl ?? "",
        parsed.data.proofNote,
      )
    : { proofUrl: null, proofNote: null };
  const hasScheduleProof = Boolean(
    scheduleProof.proofUrl || scheduleProof.proofNote,
  );

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
            WHEN $4::text IS NULL AND $5::text IS NULL
              THEN publishing_proof_submitted_by_profile_id
            ELSE $3
          END,
          publishing_proof_submitted_at = CASE
            WHEN $4::text IS NULL AND $5::text IS NULL
              THEN publishing_proof_submitted_at
            ELSE now()
          END,
          remarks_revision_summary = COALESCE($6, remarks_revision_summary),
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.reportId,
          parsed.data.scheduledPublishedDate,
          context.profile.id,
          scheduleProof.proofUrl,
          scheduleProof.proofNote,
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
          proofUrl: scheduleProof.proofUrl,
          source: "brand_officer_schedule_publish",
        },
      });

      if (hasScheduleProof) {
        await insertApprovalActivityLog({
          client,
          reportId: parsed.data.reportId,
          actorProfileId: context.profile.id,
          action: "publishing_proof_submitted",
          fromStatus: current.publish_status,
          toStatus: "Scheduled",
          notes:
            scheduleProof.proofNote ??
            scheduleProof.proofUrl ??
            "Publishing proof submitted.",
          metadata: {
            proofUrl: scheduleProof.proofUrl,
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
