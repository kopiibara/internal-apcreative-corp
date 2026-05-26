import type {
  ApprovalPublishingPermissions,
  ContentReport,
} from "@/types/content-report";

/** Client-safe helper: use server-decorated permissions when present. */
export function getApprovalPublishingPermissions(
  report: ContentReport,
): ApprovalPublishingPermissions {
  if (report.approvalPublishingPermissions) {
    return report.approvalPublishingPermissions;
  }

  const readyToPublish =
    report.supervisorStatus === "Approved" &&
    report.directorStatus === "Approved" &&
    report.publishStatus !== "Published" &&
    report.publishStatus !== "Cancelled";

  return {
    canPublishNow: false,
    canSchedulePublish: readyToPublish && report.publishStatus === "Pending",
  };
}
