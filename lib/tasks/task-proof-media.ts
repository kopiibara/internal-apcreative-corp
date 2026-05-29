export {
  PROOF_IMAGE_ACCEPT as TASK_PROOF_IMAGE_ACCEPT,
  PROOF_IMAGE_DATA_URL_MAX_LENGTH as TASK_PROOF_IMAGE_DATA_URL_MAX_LENGTH,
  PROOF_IMAGE_MAX_BYTES as TASK_PROOF_IMAGE_MAX_BYTES,
  isHttpProofUrl,
  isProofDataUrl as isTaskProofDataUrl,
  shouldOpenProofInDialog as shouldOpenTaskProofInDialog,
  validateProofFile as validateTaskProofFile,
  validateProofUrl as validateTaskProofUrl,
  proofTypeUsesUrlField,
} from "@/lib/proof/proof-media";
