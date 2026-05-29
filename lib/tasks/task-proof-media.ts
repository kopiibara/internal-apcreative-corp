import type { TaskProofSubmitType } from "@/lib/tasks/task-type";

export const TASK_PROOF_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

/** Base64 data URLs stored in `task_assignment.proof_url`. */
export const TASK_PROOF_IMAGE_DATA_URL_MAX_LENGTH = 11_500_000;

const IMAGE_DATA_URL_PATTERN =
  /^data:image\/(png|jpe?g|webp|gif);base64,[a-zA-Z0-9+/=]+$/;

export const TASK_PROOF_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif";

export function isTaskProofDataUrl(value: string) {
  return value.startsWith("data:");
}

export function isHttpProofUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function validateTaskProofFile(file: File): string | null {
  if (!file.type.match(/^image\/(png|jpe?g|webp|gif)$/i)) {
    return "Upload a PNG, JPG, WebP, or GIF image.";
  }

  if (file.size > TASK_PROOF_IMAGE_MAX_BYTES) {
    return "Image proof must be 8 MB or smaller.";
  }

  return null;
}

export function validateTaskProofUrl(
  proofType: TaskProofSubmitType,
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

    if (proofUrl.length > TASK_PROOF_IMAGE_DATA_URL_MAX_LENGTH) {
      return "Image proof must be 8 MB or smaller.";
    }

    if (!IMAGE_DATA_URL_PATTERN.test(proofUrl)) {
      return "Upload a PNG, JPG, WebP, or GIF image.";
    }

    return null;
  }

  return null;
}

export function proofTypeUsesUrlField(
  proofType: TaskProofSubmitType,
): proofType is "LINK" | "IMAGE" {
  return proofType === "LINK" || proofType === "IMAGE";
}

/** Data URLs are too large for `target="_blank"` navigation; preview in-app instead. */
export function shouldOpenTaskProofInDialog(
  proofType: TaskProofSubmitType | null,
  proofUrl: string | null,
): boolean {
  if (!proofUrl) {
    return false;
  }

  if (proofType === "IMAGE") {
    return true;
  }

  return isTaskProofDataUrl(proofUrl);
}
