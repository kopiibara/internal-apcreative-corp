import type {
  ContentType,
  Platform,
  PublishStatus,
  ReviewStatus,
} from "@/app/employee/approvals/schema";

export type ContentReport = {
  id: number;
  submittedByProfileId: number;
  submittedByName: string;
  submittedByEmail: string;
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
  remarksRevisionSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export function canEmployeeEditReport(report: {
  supervisorStatus: ReviewStatus;
  directorStatus: ReviewStatus;
  publishStatus: PublishStatus;
}) {
  return (
    report.publishStatus !== "Published" &&
    !(
      report.supervisorStatus === "Approved" &&
      report.directorStatus === "Approved"
    )
  );
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
