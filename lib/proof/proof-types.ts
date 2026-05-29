export const PROOF_SUBMIT_TYPES = ["IMAGE", "LINK", "NOTE"] as const;
export type ProofSubmitType = (typeof PROOF_SUBMIT_TYPES)[number];
