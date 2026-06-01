import { z } from "zod";

import {
  PR_COLLABORATION_STATUSES,
  PR_CONTACT_STATUSES,
  PR_INFLUENCER_SIZES,
  PR_REQUEST_TYPES,
  type PRCollaborationStatus,
  type PRContactStatus,
  type PRInfluencerSize,
  type PRRequestType,
} from "@/lib/pr/pr-constants";
import { sanitizeOptionalText, sanitizeRequiredText } from "@/lib/security/sanitize-text";

export {
  PR_COLLABORATION_STATUSES,
  PR_CONTACT_STATUSES,
  PR_INFLUENCER_SIZES,
  PR_REQUEST_TYPES,
  type PRCollaborationStatus,
  type PRContactStatus,
  type PRInfluencerSize,
  type PRRequestType,
};

const optionalNotesSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().max(4000).nullable());

const prRequestFieldsRefinement = (
  value: {
    requestType: PRRequestType;
    influencerSize?: PRInfluencerSize | null;
    contactStatus: PRContactStatus;
    declinedReason?: string | null;
    followUpNotes?: string | null;
  },
  context: z.RefinementCtx,
) => {
  if (value.requestType === "INFLUENCER" && !value.influencerSize) {
    context.addIssue({
      code: "custom",
      path: ["influencerSize"],
      message: "Select Micro or Macro for influencer requests.",
    });
  }

  if (value.requestType === "BRAND_PARTNERSHIP" && value.influencerSize) {
    context.addIssue({
      code: "custom",
      path: ["influencerSize"],
      message: "Brand partnership requests cannot include influencer size.",
    });
  }

  if (
    value.contactStatus === "DECLINED" &&
    !value.declinedReason?.trim() &&
    !value.followUpNotes?.trim()
  ) {
    context.addIssue({
      code: "custom",
      path: ["followUpNotes"],
      message: "Add a decline reason or follow-up note when declined.",
    });
  }
};

export const createPRRequestSchema = z
  .object({
    brandId: z.coerce.number().int().positive("Select a branch."),
    requestedByProfileId: z.coerce
      .number()
      .int()
      .positive("Select who requested this PR request."),
    requestType: z.enum(PR_REQUEST_TYPES),
    influencerSize: z.enum(PR_INFLUENCER_SIZES).nullable().optional(),
    recommendation: z
      .string()
      .trim()
      .min(1, "Recommendation link or name is required.")
      .max(500),
    initialDetails: optionalNotesSchema,
    contactStatus: z.enum(PR_CONTACT_STATUSES).default("PENDING"),
    dateOfVisit: z.string().nullable().optional(),
    collaborationStatus: z.enum(PR_COLLABORATION_STATUSES).default("PENDING"),
    followUpNotes: optionalNotesSchema,
    declinedReason: optionalNotesSchema,
  })
  .superRefine(prRequestFieldsRefinement);

export const updatePRRequestActionSchema = z
  .object({
    requestId: z.coerce.number().int().positive(),
    brandId: z.coerce.number().int().positive("Select a branch."),
    requestedByProfileId: z.coerce
      .number()
      .int()
      .positive("Select who requested this PR request."),
    requestType: z.enum(PR_REQUEST_TYPES),
    influencerSize: z.enum(PR_INFLUENCER_SIZES).nullable().optional(),
    recommendation: z
      .string()
      .trim()
      .min(1, "Recommendation link or name is required.")
      .max(500),
    initialDetails: optionalNotesSchema,
    contactStatus: z.enum(PR_CONTACT_STATUSES),
    dateOfVisit: z.string().nullable().optional(),
    collaborationStatus: z.enum(PR_COLLABORATION_STATUSES),
    followUpNotes: optionalNotesSchema,
    declinedReason: optionalNotesSchema,
  })
  .superRefine(prRequestFieldsRefinement);

export const duplicatePRRequestSchema = z.object({
  requestId: z.coerce.number().int().positive(),
});

export function sanitizePRRequestInput<T extends {
  recommendation: string;
  initialDetails?: string | null;
  followUpNotes?: string | null;
  declinedReason?: string | null;
}>(input: T) {
  return {
    ...input,
    recommendation: sanitizeRequiredText(input.recommendation, 500),
    initialDetails: sanitizeOptionalText(input.initialDetails ?? null, 4000),
    followUpNotes: sanitizeOptionalText(input.followUpNotes ?? null, 4000),
    declinedReason: sanitizeOptionalText(input.declinedReason ?? null, 4000),
  };
}
