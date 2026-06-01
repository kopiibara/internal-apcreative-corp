import type {
  PRCollaborationStatus,
  PRContactStatus,
  PRInfluencerSize,
  PRRequestType,
} from "@/lib/pr/pr-constants";

export type PRRequestRecord = {
  id: number;
  brandId: number;
  brandName: string;
  requestType: PRRequestType;
  influencerSize: PRInfluencerSize | null;
  recommendation: string;
  initialDetails: string | null;
  requestedByProfileId: number;
  requestedByName: string;
  contactStatus: PRContactStatus;
  dateOfVisit: string | null;
  collaborationStatus: PRCollaborationStatus;
  followUpNotes: string | null;
  declinedReason: string | null;
  createdByProfileId: number;
  createdAt: string;
  updatedAt: string;
};

export type PRRequestMetrics = {
  totalRequests: number;
  contactedCount: number;
  scheduledVisitsCount: number;
  paidCollabsCount: number;
};

export function calculatePRRequestMetrics(
  requests: PRRequestRecord[],
): PRRequestMetrics {
  return {
    totalRequests: requests.length,
    contactedCount: requests.filter(
      (request) => request.contactStatus === "CONTACTED",
    ).length,
    scheduledVisitsCount: requests.filter((request) => request.dateOfVisit)
      .length,
    paidCollabsCount: requests.filter(
      (request) => request.collaborationStatus === "PAID",
    ).length,
  };
}
