import type { PRRequestRecord } from "@/lib/pr/pr-types";
import type {
  PRCollaborationStatus,
  PRContactStatus,
  PRInfluencerSize,
  PRRequestType,
} from "@/lib/pr/pr-constants";

export type PRRequestUpdatePatch = {
  brandId?: number;
  requestType?: PRRequestType;
  influencerSize?: PRInfluencerSize | null;
  recommendation?: string;
  initialDetails?: string | null;
  contactStatus?: PRContactStatus;
  dateOfVisit?: string | null;
  collaborationStatus?: PRCollaborationStatus;
  followUpNotes?: string | null;
  declinedReason?: string | null;
};

export function buildPRUpdatePayload(
  request: PRRequestRecord,
  patch: PRRequestUpdatePatch = {},
) {
  const contactStatus = patch.contactStatus ?? request.contactStatus;

  const requestType = patch.requestType ?? request.requestType;

  return {
    requestId: request.id,
    brandId: patch.brandId ?? request.brandId,
    requestedByProfileId: request.requestedByProfileId,
    requestType,
    influencerSize:
      requestType === "BRAND_PARTNERSHIP"
        ? null
        : patch.influencerSize !== undefined
          ? patch.influencerSize
          : request.influencerSize,
    recommendation: patch.recommendation ?? request.recommendation,
    initialDetails:
      patch.initialDetails !== undefined
        ? patch.initialDetails
        : request.initialDetails,
    contactStatus,
    dateOfVisit:
      patch.dateOfVisit !== undefined
        ? patch.dateOfVisit
        : request.dateOfVisit,
    collaborationStatus:
      patch.collaborationStatus ?? request.collaborationStatus,
    followUpNotes:
      patch.followUpNotes !== undefined
        ? patch.followUpNotes
        : request.followUpNotes,
    declinedReason:
      patch.declinedReason !== undefined
        ? patch.declinedReason
        : contactStatus === "DECLINED"
          ? request.declinedReason ?? request.followUpNotes
          : null,
  };
}
