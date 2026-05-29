"use server";

import { revalidatePath } from "next/cache";

import {
  approvalKanbanColumnSchema,
  updateDirectorReviewSchema,
  updatePublishingInfoSchema,
  updateSupervisorReviewSchema,
} from "@/app/admin/approvals/schema";
import {
  canEditPublishingFields,
  type ContentReport,
} from "@/types/content-report";
import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { getApprovalContentReportById } from "@/lib/content-reports";
import { canApprovalAction, canDirectorReview } from "@/lib/permissions";
import { query, transaction } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { insertApprovalActivityLog } from "@/lib/approvals/approval-activity-log";
import { normalizeProofSubmission } from "@/lib/proof/normalize-proof-submission";
import {
  buildRevisionRequestMetadata,
  getApprovalRevisionAreaLabel,
  type ApprovalRevisionAreaId,
  type ApprovalRevisionRole,
} from "@/lib/approvals/approval-revision";
import {
  normalizeRichTextForStorage,
  richTextToPlainText,
} from "@/lib/rich-text/rich-text";

import { APPROVAL_REVALIDATE_PATHS } from "@/lib/dashboard/dashboard-revalidate-paths";

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

type ReviewGateRow = {
  id: number;
  supervisor_status: "Pending" | "Approved" | "Rejected" | "Revision";
  supervisor_notes: string | null;
  director_status: "Pending" | "Approved" | "Rejected" | "Revision";
  director_notes: string | null;
  publish_status: "Pending" | "Scheduled" | "Published" | "Cancelled";
  scheduled_published_date: Date | null;
  publishing_proof_url: string | null;
  remarks_revision_summary: string | null;
};

type ApprovalUpdateData = {
  updatedApproval: ContentReport;
};

function getSupervisorReviewPermissionKey(
  supervisorStatus: "Pending" | "Approved" | "Rejected" | "Revision",
) {
  return supervisorStatus === "Revision"
    ? "approvals.request_revision"
    : "approvals.supervisor_review";
}

function getPermissionDeniedMessage(permissionKey: string) {
  if (permissionKey === "approvals.director_review") {
    return "You do not have permission to update Director Review.";
  }

  if (permissionKey === "approvals.publish_update") {
    return "You do not have permission to update Publishing.";
  }

  if (
    permissionKey === "approvals.supervisor_review" ||
    permissionKey === "approvals.request_revision"
  ) {
    return "You do not have permission to update Supervisor Review.";
  }

  return "You do not have permission to perform this action.";
}

function getKanbanReviewLane({
  accountType,
  canSupervisorReview,
  hasDirectorAccess,
  supervisorStatus,
  position,
}: {
  accountType: string;
  canSupervisorReview: boolean;
  hasDirectorAccess: boolean;
  supervisorStatus: ReviewGateRow["supervisor_status"];
  position?: string | null;
}) {
  if (accountType === "SUPERVISOR") {
    return "supervisor";
  }

  if (accountType === "DIRECTOR" || position?.toLowerCase().includes("director")) {
    return "director";
  }

  if (canSupervisorReview && !hasDirectorAccess) {
    return "supervisor";
  }

  if (hasDirectorAccess && !canSupervisorReview) {
    return "director";
  }

  return supervisorStatus === "Approved" ? "director" : "supervisor";
}

async function authorizeApprovalAction(permissionKey: string) {
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

  const allowed = await canApprovalAction(
    context.profile.auth_user_id,
    context.profile.id,
    permissionKey,
  );

  if (!allowed) {
    return {
      error: {
        success: false,
        message: getPermissionDeniedMessage(permissionKey),
      } satisfies ActionResult,
    };
  }

  return {
    context,
  };
}

async function getReviewGate(reportId: number) {
  const result = await query<ReviewGateRow>(
    `
    SELECT
      id,
      supervisor_status,
      supervisor_notes,
      director_status,
      director_notes,
      publish_status,
      scheduled_published_date,
      publishing_proof_url,
      remarks_revision_summary
    FROM content_report
    WHERE id = $1
    LIMIT 1
    `,
    [reportId],
  );

  return result.rows[0];
}

function revalidateApprovalRoutes() {
  for (const route of APPROVAL_REVALIDATE_PATHS) {
    revalidatePath(route);
  }
}

function serializeStatus(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value == null ? null : String(value);
}

function formatRevisionActivityNotes(input: {
  revisionAreas: ApprovalRevisionAreaId[];
  revisionInstruction: string;
  otherExplanation?: string | null;
}) {
  const areaLabels = input.revisionAreas.map(getApprovalRevisionAreaLabel);
  const otherLine = input.otherExplanation?.trim()
    ? `\nOther details: ${input.otherExplanation.trim()}`
    : "";
  const instructionText = richTextToPlainText(input.revisionInstruction);

  return `Areas:\n- ${areaLabels.join("\n- ")}\nInstruction:\n${instructionText}${otherLine}`;
}

async function logRevisionRequested({
  client,
  reportId,
  actorProfileId,
  revisionRole,
  fromStatus,
  revisionAreas,
  revisionInstruction,
  otherExplanation,
  source,
}: {
  client: Parameters<typeof insertApprovalActivityLog>[0]["client"];
  reportId: number;
  actorProfileId: number;
  revisionRole: ApprovalRevisionRole;
  fromStatus: string;
  revisionAreas: ApprovalRevisionAreaId[];
  revisionInstruction: string;
  otherExplanation?: string | null;
  source: string;
}) {
  const storedRevisionInstruction =
    normalizeRichTextForStorage(revisionInstruction);
  const metadata = buildRevisionRequestMetadata({
    revisionRole,
    revisionAreas,
    revisionInstruction: storedRevisionInstruction,
    otherExplanation,
  });

  await insertApprovalActivityLog({
    client,
    reportId,
    actorProfileId,
    action: "revision_requested",
    fromStatus,
    toStatus: "Revision",
    notes: formatRevisionActivityNotes({
      revisionAreas,
      revisionInstruction: storedRevisionInstruction,
      otherExplanation,
    }),
    metadata: {
      ...metadata,
      source,
    },
  });
}

async function getUpdatedApprovalOrThrow(reportId: number) {
  const updatedApproval = await getApprovalContentReportById(reportId);

  if (!updatedApproval) {
    throw new Error("Content report was not found after update.");
  }

  return updatedApproval;
}

export async function updateSupervisorReview(
  input: unknown,
): Promise<ActionResult<ApprovalUpdateData>> {
  const parsed = updateSupervisorReviewSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid supervisor review.",
    };
  }

  const authorization = await authorizeApprovalAction(
    getSupervisorReviewPermissionKey(parsed.data.supervisorStatus),
  );

  if (authorization.error) {
    return authorization.error;
  }

  if (authorization.context.profile.account_type === "DIRECTOR") {
    return {
      success: false,
      message: "You do not have permission to update Supervisor Review.",
    };
  }

  const rateLimit = await enforceRateLimit({
    bucket: "approval:update",
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  try {
    await transaction(async (client) => {
      const currentResult = await client.query<ReviewGateRow>(
        `
        SELECT
          id,
          supervisor_status,
          supervisor_notes,
          director_status,
          director_notes,
          publish_status,
          scheduled_published_date,
          publishing_proof_url,
          remarks_revision_summary
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

      const isRevisionRequest = parsed.data.supervisorStatus === "Revision";
      const reviewNotes = isRevisionRequest
        ? null
        : parsed.data.supervisorNotes?.trim() || null;

      await client.query(
        `
        UPDATE content_report
        SET
          supervisor_status = $2,
          supervisor_notes = $3,
          supervisor_reviewed_by_profile_id = $4,
          supervisor_reviewed_at = now(),
          publish_status = CASE
            WHEN $2 = 'Approved' AND director_status = 'Approved'
              THEN publish_status
            ELSE 'Pending'
          END,
          scheduled_published_date = CASE
            WHEN $2 = 'Approved' AND director_status = 'Approved'
              THEN scheduled_published_date
            ELSE NULL
          END,
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.reportId,
          parsed.data.supervisorStatus,
          reviewNotes,
          authorization.context.profile.id,
        ],
      );

      if (isRevisionRequest) {
        await logRevisionRequested({
          client,
          reportId: parsed.data.reportId,
          actorProfileId: authorization.context.profile.id,
          revisionRole: "supervisor",
          fromStatus: current.supervisor_status,
          revisionAreas: parsed.data.revisionAreas ?? [],
          revisionInstruction: parsed.data.revisionInstruction ?? "",
          otherExplanation: parsed.data.otherExplanation,
          source: "approval_form",
        });
      } else {
        await insertApprovalActivityLog({
          client,
          reportId: parsed.data.reportId,
          actorProfileId: authorization.context.profile.id,
          action: "supervisor_review_update",
          fromStatus: current.supervisor_status,
          toStatus: parsed.data.supervisorStatus,
          notes: parsed.data.supervisorNotes ?? "",
          metadata: {
            previousNotes: current.supervisor_notes,
            confirmationAccepted: parsed.data.confirmationAccepted,
            source: "approval_form",
          },
        });
      }

      if (
        parsed.data.supervisorStatus === "Approved" &&
        current.director_status === "Approved"
      ) {
        await insertApprovalActivityLog({
          client,
          reportId: parsed.data.reportId,
          actorProfileId: authorization.context.profile.id,
          action: "ready_to_publish",
          fromStatus: current.publish_status,
          toStatus: "Ready to Publish",
          notes: "Supervisor and Director approvals are complete.",
          metadata: { source: "approval_form" },
        });
      }
    });

    revalidateApprovalRoutes();
    const updatedApproval = await getUpdatedApprovalOrThrow(
      parsed.data.reportId,
    );

    return {
      success: true,
      message: "Supervisor review updated successfully.",
      data: { updatedApproval },
    };
  } catch (error) {
    console.error("updateSupervisorReview failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function updateDirectorReview(
  input: unknown,
): Promise<ActionResult<ApprovalUpdateData>> {
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

  const parsed = updateDirectorReviewSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid director review.",
    };
  }

  const hasDirectorAccess = await canDirectorReview(
    context.profile.auth_user_id,
    context.profile.id,
  );

  if (!hasDirectorAccess) {
    return {
      success: false,
      message: "You do not have permission to update Director Review.",
    };
  }

  const rateLimit = await enforceRateLimit({
    bucket: "approval:update",
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  try {
    await transaction(async (client) => {
      const currentResult = await client.query<ReviewGateRow>(
        `
        SELECT
          id,
          supervisor_status,
          supervisor_notes,
          director_status,
          director_notes,
          publish_status,
          scheduled_published_date,
          publishing_proof_url,
          remarks_revision_summary
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

      if (context.profile.account_type === "SUPERVISOR") {
        throw new Error("You do not have permission to update Director Review.");
      }

      const isRevisionRequest = parsed.data.directorStatus === "Revision";
      const reviewNotes = isRevisionRequest
        ? null
        : parsed.data.directorNotes?.trim() || null;

      await client.query(
        `
        UPDATE content_report
        SET
          director_status = $2,
          director_notes = $3,
          director_reviewed_by_profile_id = $4,
          director_reviewed_at = now(),
          publish_status = CASE
            WHEN supervisor_status = 'Approved' AND $2 = 'Approved'
              THEN publish_status
            ELSE 'Pending'
          END,
          scheduled_published_date = CASE
            WHEN supervisor_status = 'Approved' AND $2 = 'Approved'
              THEN scheduled_published_date
            ELSE NULL
          END,
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.reportId,
          parsed.data.directorStatus,
          reviewNotes,
          context.profile.id,
        ],
      );

      if (isRevisionRequest) {
        await logRevisionRequested({
          client,
          reportId: parsed.data.reportId,
          actorProfileId: context.profile.id,
          revisionRole: "director",
          fromStatus: current.director_status,
          revisionAreas: parsed.data.revisionAreas ?? [],
          revisionInstruction: parsed.data.revisionInstruction ?? "",
          otherExplanation: parsed.data.otherExplanation,
          source: "approval_form",
        });
      } else {
        await insertApprovalActivityLog({
          client,
          reportId: parsed.data.reportId,
          actorProfileId: context.profile.id,
          action: "director_review_update",
          fromStatus: current.director_status,
          toStatus: parsed.data.directorStatus,
          notes: parsed.data.directorNotes ?? "",
          metadata: {
            previousNotes: current.director_notes,
            confirmationAccepted: parsed.data.confirmationAccepted,
            source: "approval_form",
          },
        });
      }

      if (
        current.supervisor_status === "Approved" &&
        parsed.data.directorStatus === "Approved"
      ) {
        await insertApprovalActivityLog({
          client,
          reportId: parsed.data.reportId,
          actorProfileId: context.profile.id,
          action: "ready_to_publish",
          fromStatus: current.publish_status,
          toStatus: "Ready to Publish",
          notes: "Supervisor and Director approvals are complete.",
          metadata: { source: "approval_form" },
        });
      }
    });

    revalidateApprovalRoutes();
    const updatedApproval = await getUpdatedApprovalOrThrow(
      parsed.data.reportId,
    );

    return {
      success: true,
      message: "Director review updated successfully.",
      data: { updatedApproval },
    };
  } catch (error) {
    console.error("updateDirectorReview failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function updatePublishingInfo(
  input: unknown,
): Promise<ActionResult<ApprovalUpdateData>> {
  const authorization = await authorizeApprovalAction(
    "approvals.publish_update",
  );

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimit = await enforceRateLimit({
    bucket: "approval:update",
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  const parsed = updatePublishingInfoSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid publishing details.",
    };
  }

  const reviewGate = await getReviewGate(parsed.data.reportId);

  if (!reviewGate) {
    return {
      success: false,
      message: "Content report was not found.",
    };
  }

  if (
    !canEditPublishingFields({
      supervisorStatus: reviewGate.supervisor_status,
      directorStatus: reviewGate.director_status,
    })
  ) {
    return {
      success: false,
      message:
        "Publishing fields are locked until supervisor and director are approved.",
    };
  }

  try {
    await transaction(async (client) => {
      const currentResult = await client.query<ReviewGateRow>(
        `
        SELECT
          id,
          supervisor_status,
          supervisor_notes,
          director_status,
          director_notes,
          publish_status,
          scheduled_published_date,
          publishing_proof_url,
          remarks_revision_summary
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

      if (
        !canEditPublishingFields({
          supervisorStatus: current.supervisor_status,
          directorStatus: current.director_status,
        })
      ) {
        throw new Error(
          "Publishing fields are locked until supervisor and director are approved.",
        );
      }

      const publishedProof =
        parsed.data.publishStatus === "Published"
          ? normalizeProofSubmission(
              parsed.data.proofType,
              parsed.data.proofUrl,
              parsed.data.proofNote,
            )
          : { proofUrl: null, proofNote: null };

      await client.query(
        `
        UPDATE content_report
        SET
          publish_status = $2,
          scheduled_published_date = $3,
          remarks_revision_summary = $4,
          publishing_proof_url = CASE
            WHEN $2 = 'Published' THEN $5
            ELSE publishing_proof_url
          END,
          publishing_proof_note = CASE
            WHEN $2 = 'Published' THEN $6
            ELSE publishing_proof_note
          END,
          publishing_proof_submitted_by_profile_id = CASE
            WHEN $2 = 'Published' THEN $7
            ELSE publishing_proof_submitted_by_profile_id
          END,
          publishing_proof_submitted_at = CASE
            WHEN $2 = 'Published' THEN now()
            ELSE publishing_proof_submitted_at
          END,
          published_by_profile_id = CASE
            WHEN $2 = 'Published' THEN $7
            ELSE published_by_profile_id
          END,
          published_at = CASE
            WHEN $2 = 'Published' THEN now()
            ELSE published_at
          END,
          scheduled_by_profile_id = CASE
            WHEN $2 = 'Scheduled' THEN $7
            ELSE scheduled_by_profile_id
          END,
          scheduled_at = CASE
            WHEN $2 = 'Scheduled' THEN now()
            ELSE scheduled_at
          END,
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.reportId,
          parsed.data.publishStatus,
          parsed.data.scheduledPublishedDate,
          parsed.data.remarksRevisionSummary,
          publishedProof.proofUrl,
          publishedProof.proofNote,
          authorization.context.profile.id,
        ],
      );

      await insertApprovalActivityLog({
        client,
        reportId: parsed.data.reportId,
        actorProfileId: authorization.context.profile.id,
        action: "publishing_update",
        fromStatus: current.publish_status,
        toStatus: parsed.data.publishStatus,
        notes: parsed.data.remarksRevisionSummary,
        metadata: {
          previousScheduledPublishedDate: serializeStatus(
            current.scheduled_published_date,
          ),
          scheduledPublishedDate: serializeStatus(
            parsed.data.scheduledPublishedDate,
          ),
          proofUrl: publishedProof.proofUrl,
          proofNote: publishedProof.proofNote,
          previousRemarksRevisionSummary: current.remarks_revision_summary,
          confirmationAccepted: parsed.data.confirmationAccepted,
          source: "approval_form",
        },
      });
    });

    revalidateApprovalRoutes();
    const updatedApproval = await getUpdatedApprovalOrThrow(
      parsed.data.reportId,
    );

    return {
      success: true,
      message: "Publishing details updated successfully.",
      data: { updatedApproval },
    };
  } catch (error) {
    console.error("updatePublishingInfo failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function updateApprovalKanbanColumn(
  input: unknown,
): Promise<ActionResult<ApprovalUpdateData>> {
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
    bucket: "approval:update",
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  const parsed = approvalKanbanColumnSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ?? "Invalid approval workflow update.",
    };
  }

  const canSupervisorReview = await canApprovalAction(
    context.profile.auth_user_id,
    context.profile.id,
    "approvals.supervisor_review",
  );
  const canRequestRevision = await canApprovalAction(
    context.profile.auth_user_id,
    context.profile.id,
    "approvals.request_revision",
  );
  const hasDirectorAccess = await canDirectorReview(
    context.profile.auth_user_id,
    context.profile.id,
  );

  try {
    await transaction(async (client) => {
      const currentResult = await client.query<ReviewGateRow>(
        `
        SELECT
          id,
          supervisor_status,
          supervisor_notes,
          director_status,
          director_notes,
          publish_status,
          scheduled_published_date,
          publishing_proof_url,
          remarks_revision_summary
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

      const isRevisionMove = parsed.data.toColumn === "revision";
      const notes = isRevisionMove
        ? (parsed.data.revisionInstruction ?? "")
        : (parsed.data.notes ?? "");
      const baseLog = {
        client,
        reportId: parsed.data.reportId,
        actorProfileId: context.profile.id,
        notes,
        metadata: {
          fromColumn: parsed.data.fromColumn,
          toColumn: parsed.data.toColumn,
          confirmationAccepted: parsed.data.confirmationAccepted,
          source: "kanban_drag",
        },
      };

      const nextStatusByColumn = {
        pending: "Pending",
        approved: "Approved",
        "ready-to-publish": "Approved",
        revision: "Revision",
        rejected: "Rejected",
        published: null,
      } as const;
      const nextStatus = nextStatusByColumn[parsed.data.toColumn];

      if (!nextStatus) {
        throw new Error(
          "Use the publishing form to schedule or publish approval requests.",
        );
      }

      const reviewLane = getKanbanReviewLane({
        accountType: context.profile.account_type,
        position: context.profile.position,
        canSupervisorReview,
        hasDirectorAccess,
        supervisorStatus: current.supervisor_status,
      });

      if (reviewLane === "director") {
        if (!hasDirectorAccess) {
          throw new Error(
            "You do not have permission to update Director Review.",
          );
        }

        await client.query(
          `
          UPDATE content_report
          SET
            director_status = $2,
            director_notes = $3,
            director_reviewed_by_profile_id = $4,
            director_reviewed_at = now(),
            publish_status = 'Pending',
            scheduled_published_date = NULL,
            updated_at = now()
          WHERE id = $1
          `,
          [
            parsed.data.reportId,
            nextStatus,
            isRevisionMove ? null : notes,
            context.profile.id,
          ],
        );

        if (isRevisionMove) {
          await logRevisionRequested({
            client,
            reportId: parsed.data.reportId,
            actorProfileId: context.profile.id,
            revisionRole: "director",
            fromStatus: current.director_status,
            revisionAreas: parsed.data.revisionAreas ?? [],
            revisionInstruction: parsed.data.revisionInstruction ?? "",
            otherExplanation: parsed.data.otherExplanation,
            source: "kanban_drag",
          });
        } else {
          await insertApprovalActivityLog({
            ...baseLog,
            action: "kanban_director_status_update",
            fromStatus: current.director_status,
            toStatus: nextStatus,
          });
        }

        if (
          current.supervisor_status === "Approved" &&
          nextStatus === "Approved"
        ) {
          await insertApprovalActivityLog({
            ...baseLog,
            action: "ready_to_publish",
            fromStatus: current.publish_status,
            toStatus: "Ready to Publish",
            notes: "Supervisor and Director approvals are complete.",
            metadata: {
              ...baseLog.metadata,
              source: "kanban_drag",
            },
          });
        }
        return;
      }

      const canApplySupervisorDecision =
        nextStatus === "Revision" ? canRequestRevision : canSupervisorReview;

      if (!canApplySupervisorDecision) {
        throw new Error(
          "You do not have permission to update Supervisor Review.",
        );
      }

      await client.query(
        `
        UPDATE content_report
        SET
          supervisor_status = $2,
          supervisor_notes = $3,
          supervisor_reviewed_by_profile_id = $4,
          supervisor_reviewed_at = now(),
          publish_status = 'Pending',
          scheduled_published_date = NULL,
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.reportId,
          nextStatus,
          isRevisionMove ? null : notes,
          context.profile.id,
        ],
      );

      if (isRevisionMove) {
        await logRevisionRequested({
          client,
          reportId: parsed.data.reportId,
          actorProfileId: context.profile.id,
          revisionRole: "supervisor",
          fromStatus: current.supervisor_status,
          revisionAreas: parsed.data.revisionAreas ?? [],
          revisionInstruction: parsed.data.revisionInstruction ?? "",
          otherExplanation: parsed.data.otherExplanation,
          source: "kanban_drag",
        });
      } else {
        await insertApprovalActivityLog({
          ...baseLog,
          action: "kanban_supervisor_status_update",
          fromStatus: current.supervisor_status,
          toStatus: nextStatus,
        });
      }

      if (
        nextStatus === "Approved" &&
        current.director_status === "Approved"
      ) {
        await insertApprovalActivityLog({
          ...baseLog,
          action: "ready_to_publish",
          fromStatus: current.publish_status,
          toStatus: "Ready to Publish",
          notes: "Supervisor and Director approvals are complete.",
          metadata: {
            ...baseLog.metadata,
            source: "kanban_drag",
          },
        });
      }
    });

    revalidateApprovalRoutes();
    const updatedApproval = await getUpdatedApprovalOrThrow(
      parsed.data.reportId,
    );

    return {
      success: true,
      message: "Approval workflow updated successfully.",
      data: { updatedApproval },
    };
  } catch (error) {
    console.error("updateApprovalKanbanColumn failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}
