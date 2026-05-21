import { query } from "@/lib/db";
import type {
  ContentType,
  Platform,
  PublishStatus,
  ReviewStatus,
} from "@/app/employee/approvals/schema";
import type { ApprovalActivityLog, ContentReport } from "@/types/content-report";

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

type ApprovalActivityLogRow = {
  id: number;
  content_report_id: number;
  actor_profile_id: number;
  actor_name: string;
  actor_account_type: string;
  actor_position: string | null;
  action: string;
  from_status: string | null;
  to_status: string | null;
  notes: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
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

function mapContentReport(
  row: ContentReportRow,
  activityLogs: ApprovalActivityLog[] = [],
): ContentReport {
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
    activityLogs,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapApprovalActivityLog(
  row: ApprovalActivityLogRow,
): ApprovalActivityLog {
  return {
    id: row.id,
    contentReportId: row.content_report_id,
    actorProfileId: row.actor_profile_id,
    actorName: row.actor_name,
    actorAccountType: row.actor_account_type,
    actorPosition: row.actor_position,
    action: row.action,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    notes: row.notes,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
  };
}

async function getApprovalActivityLogsByReportIds(reportIds: number[]) {
  if (reportIds.length === 0) {
    return new Map<number, ApprovalActivityLog[]>();
  }

  const result = await query<ApprovalActivityLogRow>(
    `
    SELECT
      aal.id,
      aal.content_report_id,
      aal.actor_profile_id,
      actor.full_name AS actor_name,
      actor.account_type AS actor_account_type,
      actor.position AS actor_position,
      aal.action,
      aal.from_status,
      aal.to_status,
      aal.notes,
      aal.metadata,
      aal.created_at
    FROM approval_activity_log aal
    JOIN profile actor ON actor.id = aal.actor_profile_id
    WHERE aal.content_report_id = ANY($1::integer[])
    ORDER BY aal.created_at DESC, aal.id DESC
    `,
    [reportIds],
  );
  const logsByReportId = new Map<number, ApprovalActivityLog[]>();

  for (const row of result.rows) {
    const logs = logsByReportId.get(row.content_report_id) ?? [];
    logs.push(mapApprovalActivityLog(row));
    logsByReportId.set(row.content_report_id, logs);
  }

  return logsByReportId;
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

  return result.rows.map((row) => mapContentReport(row));
}

export async function getApprovalContentReports() {
  const result = await query<ContentReportRow>(
    `
    ${contentReportSelect}
    ORDER BY cr.date_submitted DESC, cr.id DESC
    `,
  );

  const activityLogsByReportId = await getApprovalActivityLogsByReportIds(
    result.rows.map((row) => row.id),
  );

  return result.rows.map((row) =>
    mapContentReport(row, activityLogsByReportId.get(row.id) ?? []),
  );
}

export async function getApprovalContentReportById(reportId: number) {
  const result = await query<ContentReportRow>(
    `
    ${contentReportSelect}
    WHERE cr.id = $1
    LIMIT 1
    `,
    [reportId],
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const activityLogsByReportId = await getApprovalActivityLogsByReportIds([
    reportId,
  ]);

  return mapContentReport(row, activityLogsByReportId.get(reportId) ?? []);
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
