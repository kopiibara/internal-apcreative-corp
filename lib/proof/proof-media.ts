import type { ProofSubmitType } from "@/lib/proof/proof-types";
import { richTextToPlainText } from "@/lib/rich-text/rich-text";

export const PROOF_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const PROOF_GIF_MAX_BYTES = 5 * 1024 * 1024;

/** Base64 data URLs stored in proof URL text columns. */
export const PROOF_IMAGE_DATA_URL_MAX_LENGTH = 11_500_000;
export const PROOF_GIF_DATA_URL_MAX_LENGTH =
  "data:image/gif;base64,".length + Math.ceil(PROOF_GIF_MAX_BYTES / 3) * 4;

const IMAGE_DATA_URL_PATTERN =
  /^data:image\/(png|jpe?g|webp|gif);base64,[a-zA-Z0-9+/=]+$/;
const GIF_DATA_URL_PATTERN = /^data:image\/gif;base64,/i;

export const PROOF_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif";

export function isProofDataUrl(value: string) {
  return value.startsWith("data:");
}

export function isHttpProofUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function inferProofSubmitType(
  proofUrl: string | null | undefined,
  proofNote?: string | null,
): ProofSubmitType | null {
  const url = proofUrl?.trim() ?? "";
  const note = proofNote?.trim() ?? "";

  if (url.startsWith("data:image/")) {
    return "IMAGE";
  }

  if (url) {
    return isHttpProofUrl(url) ? "LINK" : "LINK";
  }

  if (note) {
    return "NOTE";
  }

  return null;
}

export function validateProofFile(file: File): string | null {
  if (!file.type.match(/^image\/(png|jpe?g|webp|gif)$/i)) {
    return "Upload a PNG, JPG, WebP, or GIF image.";
  }

  if (file.type.match(/^image\/gif$/i) && file.size > PROOF_GIF_MAX_BYTES) {
    return "GIF proof must be 5 MB or smaller.";
  }

  if (file.size > PROOF_IMAGE_MAX_BYTES) {
    return "Image proof must be 8 MB or smaller.";
  }

  return null;
}

export function validateProofUrl(
  proofType: ProofSubmitType,
  proofUrl: string,
): string | null {
  if (proofType === "LINK") {
    if (!proofUrl) {
      return "Please add a valid proof link.";
    }

    try {
      const url = new URL(proofUrl);

      if (!["http:", "https:"].includes(url.protocol)) {
        return "Please add a valid proof link.";
      }
    } catch {
      return "Please add a valid proof link.";
    }

    return null;
  }

  if (proofType === "IMAGE") {
    if (!proofUrl) {
      return "Please upload an image proof.";
    }

    if (!IMAGE_DATA_URL_PATTERN.test(proofUrl)) {
      return "Upload a PNG, JPG, WebP, or GIF image.";
    }

    if (
      GIF_DATA_URL_PATTERN.test(proofUrl) &&
      proofUrl.length > PROOF_GIF_DATA_URL_MAX_LENGTH
    ) {
      return "GIF proof must be 5 MB or smaller.";
    }

    if (proofUrl.length > PROOF_IMAGE_DATA_URL_MAX_LENGTH) {
      return "Image proof must be 8 MB or smaller.";
    }

    return null;
  }

  return null;
}

export function proofTypeUsesUrlField(
  proofType: ProofSubmitType,
): proofType is "LINK" | "IMAGE" {
  return proofType === "LINK" || proofType === "IMAGE";
}

export function hasValidProofSubmission(
  proofType: ProofSubmitType,
  proofUrl: string,
  proofNote: string,
): boolean {
  if (proofType === "NOTE") {
    return richTextToPlainText(proofNote).length > 0;
  }

  if (proofType === "LINK" || proofType === "IMAGE") {
    return validateProofUrl(proofType, proofUrl.trim()) === null;
  }

  return false;
}

/** Data URLs are too large for `target="_blank"` navigation; preview in-app instead. */
export function shouldOpenProofInDialog(
  proofType: ProofSubmitType | null,
  proofUrl: string | null,
): boolean {
  if (!proofUrl) {
    return false;
  }

  if (proofType === "IMAGE") {
    return true;
  }

  return isProofDataUrl(proofUrl);
}
