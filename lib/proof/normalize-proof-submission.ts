import type { ProofSubmitType } from "@/lib/proof/proof-types";

export function normalizeProofSubmission(
  proofType: ProofSubmitType,
  proofUrl: string,
  proofNote?: string | null,
) {
  const trimmedNote = proofNote?.trim() ?? "";

  if (proofType === "NOTE") {
    return {
      proofUrl: null as string | null,
      proofNote: trimmedNote || null,
    };
  }

  return {
    proofUrl: proofUrl.trim() || null,
    proofNote: trimmedNote || null,
  };
}
