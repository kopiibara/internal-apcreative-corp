import { z } from "zod";

import {
  MAX_PROOF_IMAGES,
  PROOF_IMAGE_DATA_URL_MAX_LENGTH,
  validateProofUrl,
} from "@/lib/proof/proof-media";
import { PROOF_SUBMIT_TYPES } from "@/lib/proof/proof-types";
import { richTextToPlainText } from "@/lib/rich-text/rich-text";

export const proofUrlFieldSchema = z.preprocess(
  (value) => (value === null || value === undefined ? "" : value),
  z
    .string()
    .trim()
    .max(PROOF_IMAGE_DATA_URL_MAX_LENGTH * MAX_PROOF_IMAGES),
);

export const proofTypeFieldSchema = z.enum(PROOF_SUBMIT_TYPES);

export function addProofSubmissionRefinement<
  T extends {
    proofType: (typeof PROOF_SUBMIT_TYPES)[number];
    proofUrl: string;
    proofNote?: string | null;
  },
>(
  schema: z.ZodType<T>,
  options?: { requireProof?: boolean },
) {
  return schema.superRefine((value, context) => {
    const proofNote =
      typeof value.proofNote === "string" ? value.proofNote.trim() : "";
    const proofNoteText = richTextToPlainText(proofNote);

    if (value.proofType === "NOTE") {
      if (options?.requireProof !== false && !proofNoteText) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please add proof notes before submitting.",
          path: ["proofNote"],
        });
      }

      return;
    }

    const proofUrlError = validateProofUrl(value.proofType, value.proofUrl);

    if (proofUrlError) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: proofUrlError,
        path: ["proofUrl"],
      });
    }
  });
}
