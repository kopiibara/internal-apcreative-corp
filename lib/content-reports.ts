import { query } from "@/lib/db";
import type {
  ContentType,
  Platform,
  PublishStatus,
  ReviewStatus,
} from "@/app/employee/approvals/schema";
import type { ContentReport } from "@/types/content-report";

type ContentReportRow = {
  id: number;
  submitted_by_profile_id: number;
  submitted_by_name: string;
  submitted_by_email: string;
  brand_id: number | null;
  brand_name: string | null;
  content_type: ContentType;
  platform: Platform;
  content_inspo: string | null;
  caption: string;
  asset_link: string | null;
  employee_comments: string | null;
  date_submitted: Date;
  supervisor_status: ReviewStatus;
  supervisor_notes: string | null;
  supervisor_reviewed_by_name: string | null;
  supervisor_reviewed_at: Date | null;
  director_status: ReviewStatus;
  director_notes: string | null;
  director_reviewed_by_name: string | null;
  director_reviewed_at: Date | null;
  publish_status: PublishStatus;
  scheduled_published_date: Date | null;
  remarks_revision_summary: string | null;
  created_at: Date;
  updated_at: Date;
};

type BrandAssignmentRow = {
  brand_id: number;
};

const contentReportSelect = `
  SELECT
    cr.id,
    cr.submitted_by_profile_id,
    submitter.full_name AS submitted_by_name,
    submitter.email AS submitted_by_email,
    cr.brand_id,
    b.name AS brand_name,
    cr.content_type,
    cr.platform,
    cr.content_inspo,
    cr.caption,
    cr.asset_link,
    cr.employee_comments,
    cr.date_submitted,
    cr.supervisor_status,
    cr.supervisor_notes,
    supervisor.full_name AS supervisor_reviewed_by_name,
    cr.supervisor_reviewed_at,
    cr.director_status,
    cr.director_notes,
    director.full_name AS director_reviewed_by_name,
    cr.director_reviewed_at,
    cr.publish_status,
    cr.scheduled_published_date,
    cr.remarks_revision_summary,
    cr.created_at,
    cr.updated_at
  FROM content_report cr
  JOIN profile submitter ON submitter.id = cr.submitted_by_profile_id
  LEFT JOIN brand b ON b.id = cr.brand_id
  LEFT JOIN profile supervisor
    ON supervisor.id = cr.supervisor_reviewed_by_profile_id
  LEFT JOIN profile director
    ON director.id = cr.director_reviewed_by_profile_id
`;

function mapContentReport(row: ContentReportRow): ContentReport {
  return {
    id: row.id,
    submittedByProfileId: row.submitted_by_profile_id,
    submittedByName: row.submitted_by_name,
    submittedByEmail: row.submitted_by_email,
    brandId: row.brand_id,
    brandName: row.brand_name,
    contentType: row.content_type,
    platform: row.platform,
    contentInspo: row.content_inspo,
    caption: row.caption,
    assetLink: row.asset_link,
    employeeComments: row.employee_comments,
    dateSubmitted: row.date_submitted.toISOString(),
    supervisorStatus: row.supervisor_status,
    supervisorNotes: row.supervisor_notes,
    supervisorReviewedByName: row.supervisor_reviewed_by_name,
    supervisorReviewedAt: row.supervisor_reviewed_at?.toISOString() ?? null,
    directorStatus: row.director_status,
    directorNotes: row.director_notes,
    directorReviewedByName: row.director_reviewed_by_name,
    directorReviewedAt: row.director_reviewed_at?.toISOString() ?? null,
    publishStatus: row.publish_status,
    scheduledPublishedDate: row.scheduled_published_date?.toISOString() ?? null,
    remarksRevisionSummary: row.remarks_revision_summary,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getMyContentReports(profileId: number) {
  const result = await query<ContentReportRow>(
    `
    ${contentReportSelect}
    WHERE cr.submitted_by_profile_id = $1
    ORDER BY cr.date_submitted DESC, cr.id DESC
    `,
    [profileId],
  );

  return result.rows.map(mapContentReport);
}

export async function getApprovalContentReports() {
  const result = await query<ContentReportRow>(
    `
    ${contentReportSelect}
    ORDER BY cr.date_submitted DESC, cr.id DESC
    `,
  );

  return result.rows.map(mapContentReport);
}

export async function getPrimaryActiveBrandId(profileId: number) {
  const result = await query<BrandAssignmentRow>(
    `
    SELECT brand_id
    FROM user_brand_access
    WHERE profile_id = $1
      AND is_active = true
    ORDER BY is_primary DESC, granted_at ASC
    LIMIT 1
    `,
    [profileId],
  );

  return result.rows[0]?.brand_id ?? null;
}
