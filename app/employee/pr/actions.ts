"use server";

import { revalidatePath } from "next/cache";

import {
  createPRRequestSchema,
  duplicatePRRequestSchema,
  sanitizePRRequestInput,
  updatePRRequestActionSchema,
} from "@/lib/pr/pr-schema";
import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { query } from "@/lib/db";
import {
  canCreatePRRequest,
  canManagePRRequests,
} from "@/lib/pr/pr-permissions";
import {
  getPRRequestById,
  getPRRequesterOptionById,
  profileHasBrandAccess,
} from "@/lib/pr/pr-requests";

export type PRActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

const PR_REVALIDATE_PATHS = ["/employee/pr", "/admin/pr"] as const;

function revalidatePRRoutes() {
  for (const route of PR_REVALIDATE_PATHS) {
    revalidatePath(route);
  }
}

function parseDateOfVisit(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

async function requirePRProfile() {
  const context = await getCurrentProfileContext();

  if (!context || context.profile.status !== "ACTIVE") {
    return {
      error: {
        success: false,
        message: "You must be signed in to perform this action.",
      } satisfies PRActionResult,
    };
  }

  return { context };
}

export async function createPRRequest(
  input: unknown,
): Promise<PRActionResult<{ requestId: number }>> {
  const auth = await requirePRProfile();

  if (auth.error) {
    return auth.error;
  }

  const { context } = auth;

  if (!(await canCreatePRRequest(context.profile))) {
    return {
      success: false,
      message: "You do not have permission to create PR requests.",
    };
  }

  const parsed = createPRRequestSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid PR request.",
    };
  }

  const sanitized = sanitizePRRequestInput(parsed.data);

  const brandResult = await query<{ id: number }>(
    `
    SELECT id
    FROM brand
    WHERE id = $1
      AND is_active = true
    LIMIT 1
    `,
    [sanitized.brandId],
  );

  if (!brandResult.rows[0]) {
    return { success: false, message: "Selected branch is not available." };
  }

  const canManage = await canManagePRRequests(context.profile);
  const requester = await getPRRequesterOptionById(
    parsed.data.requestedByProfileId,
  );

  if (!requester) {
    return {
      success: false,
      message: "Selected requester is not available for PR requests.",
    };
  }

  if (
    !canManage &&
    !(await profileHasBrandAccess(context.profile.id, sanitized.brandId))
  ) {
    return {
      success: false,
      message: "You do not have access to the selected branch.",
    };
  }

  const contactStatus = canManage ? parsed.data.contactStatus : "PENDING";
  const collaborationStatus = canManage
    ? parsed.data.collaborationStatus
    : "PENDING";

  try {
    const result = await query<{ id: number }>(
      `
      INSERT INTO pr_request (
        brand_id,
        request_type,
        influencer_size,
        recommendation,
        initial_details,
        requested_by_profile_id,
        requested_by_name_snapshot,
        contact_status,
        date_of_visit,
        collaboration_status,
        follow_up_notes,
        declined_reason,
        created_by_profile_id,
        updated_by_profile_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
      RETURNING id
      `,
      [
        sanitized.brandId,
        parsed.data.requestType,
        parsed.data.requestType === "INFLUENCER"
          ? parsed.data.influencerSize
          : null,
        sanitized.recommendation,
        sanitized.initialDetails,
        requester.id,
        requester.fullName,
        contactStatus,
        canManage ? parseDateOfVisit(parsed.data.dateOfVisit) : null,
        collaborationStatus,
        canManage ? sanitized.followUpNotes : null,
        canManage ? sanitized.declinedReason : null,
        context.profile.id,
      ],
    );

    revalidatePRRoutes();

    return {
      success: true,
      message: "PR request created successfully.",
      data: { requestId: result.rows[0]?.id ?? 0 },
    };
  } catch (error) {
    console.error("createPRRequest failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function updatePRRequestAction(
  input: unknown,
): Promise<PRActionResult> {
  const auth = await requirePRProfile();

  if (auth.error) {
    return auth.error;
  }

  const { context } = auth;

  if (!(await canManagePRRequests(context.profile))) {
    return {
      success: false,
      message: "You do not have permission to manage PR requests.",
    };
  }

  const parsed = updatePRRequestActionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid PR update.",
    };
  }

  const existing = await getPRRequestById(parsed.data.requestId);

  if (!existing) {
    return { success: false, message: "PR request was not found." };
  }

  const sanitized = sanitizePRRequestInput(parsed.data);
  const requester = await getPRRequesterOptionById(
    parsed.data.requestedByProfileId,
  );

  if (!requester) {
    return {
      success: false,
      message: "Selected requester is not available for PR requests.",
    };
  }

  const brandResult = await query<{ id: number }>(
    `
    SELECT id
    FROM brand
    WHERE id = $1
      AND is_active = true
    LIMIT 1
    `,
    [parsed.data.brandId],
  );

  if (!brandResult.rows[0]) {
    return { success: false, message: "Selected branch is not available." };
  }

  try {
    await query(
      `
      UPDATE pr_request
      SET
        brand_id = $2,
        requested_by_profile_id = $3,
        requested_by_name_snapshot = $4,
        request_type = $5,
        influencer_size = $6,
        recommendation = $7,
        initial_details = $8,
        contact_status = $9,
        date_of_visit = $10,
        collaboration_status = $11,
        follow_up_notes = $12,
        declined_reason = $13,
        updated_by_profile_id = $14,
        updated_at = now()
      WHERE id = $1
      `,
      [
        parsed.data.requestId,
        parsed.data.brandId,
        requester.id,
        requester.fullName,
        parsed.data.requestType,
        parsed.data.requestType === "INFLUENCER"
          ? parsed.data.influencerSize
          : null,
        sanitized.recommendation,
        sanitized.initialDetails,
        parsed.data.contactStatus,
        parseDateOfVisit(parsed.data.dateOfVisit),
        parsed.data.collaborationStatus,
        sanitized.followUpNotes,
        sanitized.declinedReason,
        context.profile.id,
      ],
    );

    revalidatePRRoutes();

    return { success: true, message: "PR request updated successfully." };
  } catch (error) {
    console.error("updatePRRequestAction failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function duplicatePRRequest(
  input: unknown,
): Promise<PRActionResult<{ requestId: number }>> {
  const auth = await requirePRProfile();

  if (auth.error) {
    return auth.error;
  }

  const { context } = auth;

  if (!(await canCreatePRRequest(context.profile))) {
    return {
      success: false,
      message: "You do not have permission to duplicate PR requests.",
    };
  }

  const parsed = duplicatePRRequestSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid duplicate request.",
    };
  }

  const existing = await getPRRequestById(parsed.data.requestId);

  if (!existing) {
    return { success: false, message: "PR request was not found." };
  }

  return createPRRequest({
    brandId: existing.brandId,
    requestedByProfileId: existing.requestedByProfileId,
    requestType: existing.requestType,
    influencerSize: existing.influencerSize,
    recommendation: existing.recommendation,
    initialDetails: existing.initialDetails,
    contactStatus: "PENDING",
    collaborationStatus: "PENDING",
    followUpNotes: null,
    declinedReason: null,
    dateOfVisit: null,
  });
}
