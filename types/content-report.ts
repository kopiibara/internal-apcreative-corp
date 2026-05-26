import type {
  ContentType,
  Platform,
  PublishStatus,
  ReviewStatus,
} from "@/app/employee/approvals/schema";

export type ApprovalActivityLog = {
  id: number;
  contentReportId: number;
  actorProfileId: number;
  actorName: string;
  actorImageUrl: string | null;
  actorAccountType: string;
  actorPosition: string | null;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  notes: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type ApprovalPublishingPermissions = {
  canPublishNow: boolean;
  canSchedulePublish: boolean;
};

export type ContentReport = {
  id: number;
  submittedByProfileId: number;
  submittedByName: string;
  submittedByEmail: string;
  submittedByImageUrl: string | null;
  brandId: number | null;
  brandName: string | null;
  contentType: ContentType;
  platform: Platform;
  contentInspo: string | null;
  caption: string;
  assetLink: string | null;
  employeeComments: string | null;
  dateSubmitted: string;
  supervisorStatus: ReviewStatus;
  supervisorNotes: string | null;
  supervisorReviewedByName: string | null;
  supervisorReviewedAt: string | null;
  directorStatus: ReviewStatus;
  directorNotes: string | null;
  directorReviewedByName: string | null;
  directorReviewedAt: string | null;
  publishStatus: PublishStatus;
  scheduledPublishedDate: string | null;
  publishingProofUrl: string | null;
  publishingProofNote: string | null;
  publishingProofSubmittedByName: string | null;
  publishingProofSubmittedAt: string | null;
  publishedByName: string | null;
  publishedAt: string | null;
  scheduledByName: string | null;
  scheduledAt: string | null;
  remarksRevisionSummary: string | null;
  activityLogs: ApprovalActivityLog[];
  /** Set server-side for brand officers on the employee approvals page. */
  approvalPublishingPermissions?: ApprovalPublishingPermissions;
  createdAt: string;
  updatedAt: string;
};

/**
 * Employees may edit/cancel their report until publishing ends the workflow.
 * Stays editable after supervisor or director approval (including when only one
 * has approved, or both are approved but not yet published).
 */
export function canEmployeeEditOwnReport(
  report: {
    submittedByProfileId: number;
    supervisorStatus: ReviewStatus;
    directorStatus: ReviewStatus;
    publishStatus: PublishStatus;
  },
  profileId: number,
) {
  return (
    report.submittedByProfileId === profileId && canEmployeeEditReport(report)
  );
}

export function canEmployeeEditReport(report: {
  supervisorStatus: ReviewStatus;
  directorStatus: ReviewStatus;
  publishStatus: PublishStatus;
}) {
  if (
    report.publishStatus === "Published" ||
    report.publishStatus === "Cancelled"
  ) {
    return false;
  }

  return true;
}

export function canEditPublishingFields(report: {
  supervisorStatus: ReviewStatus;
  directorStatus: ReviewStatus;
}) {
  return (
    report.supervisorStatus === "Approved" &&
    report.directorStatus === "Approved"
  );
}
