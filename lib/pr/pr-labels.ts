import type {
  PRCollaborationStatus,
  PRContactStatus,
  PRInfluencerSize,
  PRRequestType,
} from "@/lib/pr/pr-constants";

export function getPRRequestTypeLabel(value: PRRequestType) {
  return value === "INFLUENCER" ? "Influencer" : "Brand Partnership";
}

export function getPRInfluencerSizeLabel(value: PRInfluencerSize | null) {
  if (!value) {
    return "—";
  }

  return value === "MICRO" ? "Micro" : "Macro";
}

export function getPRContactStatusLabel(value: PRContactStatus) {
  switch (value) {
    case "CONTACTED":
      return "Contacted";
    case "DECLINED":
      return "Declined";
    default:
      return "Pending";
  }
}

export function getPRCollaborationStatusLabel(value: PRCollaborationStatus) {
  switch (value) {
    case "PAID":
      return "Paid";
    case "NA":
      return "N/A";
    default:
      return "Pending";
  }
}
