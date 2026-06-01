import type {
  PRCollaborationStatus,
  PRContactStatus,
  PRInfluencerSize,
  PRRequestStatus,
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
  status: PRRequestStatus;
  createdByProfileId: number;
  createdAt: string;
  updatedAt: string;
};

export function isPRRequestActive(request: Pick<PRRequestRecord, "status">) {
  return request.status === "ACTIVE";
}

export type PRRequestMetrics = {
  totalRequests: number;
  contactedCount: number;
  scheduledVisitsCount: number;
  paidCollabsCount: number;
};

export function calculatePRRequestMetrics(
  requests: PRRequestRecord[],
): PRRequestMetrics {
  const activeRequests = requests.filter(isPRRequestActive);

  return {
    totalRequests: activeRequests.length,
    contactedCount: activeRequests.filter(
      (request) => request.contactStatus === "CONTACTED",
    ).length,
    scheduledVisitsCount: activeRequests.filter((request) => request.dateOfVisit)
      .length,
    paidCollabsCount: activeRequests.filter(
      (request) => request.collaborationStatus === "PAID",
    ).length,
  };
}
