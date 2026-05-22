import "dotenv/config";

import { pool, query, transaction } from "@/lib/db";
import { APPROVAL_KANBAN_DEMO_MARKER } from "@/lib/approval-kanban";
import type { ApprovalKanbanColumnId } from "@/lib/approval-statuses";

type SeedContext = {
  brandId: number;
  submitterProfileId: number;
  actorProfileId: number;
  hasActivityLog: boolean;
};

type DemoReport = {
  stage: ApprovalKanbanColumnId;
  title: string;
  contentType: string;
  platform: string;
  supervisorStatus: string;
  directorStatus: string;
  publishStatus: string;
  scheduledPublishedDate: string | null;
};

const demoReports: DemoReport[] = [
  {
    stage: "pending",
    title: "Pending intake sample",
    contentType: "Graphic",
    platform: "Meta (Instagram and Facebook)",
    supervisorStatus: "Pending",
    directorStatus: "Pending",
    publishStatus: "Pending",
    scheduledPublishedDate: null,
  },
  {
    stage: "supervisor-approved",
    title: "Supervisor approved sample",
    contentType: "Carousel",
    platform: "Meta (Instagram and Facebook)",
    supervisorStatus: "Approved",
    directorStatus: "Pending",
    publishStatus: "Pending",
    scheduledPublishedDate: null,
  },
  {
    stage: "ready-to-publish",
    title: "Ready to publish sample",
    contentType: "Reel",
    platform: "All Platforms",
    supervisorStatus: "Approved",
    directorStatus: "Approved",
    publishStatus: "Pending",
    scheduledPublishedDate: null,
  },
  {
    stage: "scheduled",
    title: "Scheduled sample",
    contentType: "Promo Announcement",
    platform: "Meta (Instagram and Facebook)",
    supervisorStatus: "Approved",
    directorStatus: "Approved",
    publishStatus: "Scheduled",
    scheduledPublishedDate: "future",
  },
  {
    stage: "published",
    title: "Published sample",
    contentType: "Testimonial",
    platform: "TikTok",
    supervisorStatus: "Approved",
    directorStatus: "Approved",
    publishStatus: "Published",
    scheduledPublishedDate: "now",
  },
  {
    stage: "revision",
    title: "Revision sample",
    contentType: "Ad Creative",
    platform: "All Platforms",
    supervisorStatus: "Revision",
    directorStatus: "Pending",
    publishStatus: "Pending",
    scheduledPublishedDate: null,
  },
  {
    stage: "rejected",
    title: "Rejected sample",
    contentType: "Story",
    platform: "Meta (Instagram and Facebook)",
    supervisorStatus: "Rejected",
    directorStatus: "Pending",
    publishStatus: "Pending",
    scheduledPublishedDate: null,
  },
];

async function getSeedContext(): Promise<SeedContext> {
  const brandResult = await query<{ id: number }>(
    `
    SELECT id
    FROM brand
    WHERE is_active = true
    ORDER BY id ASC
    LIMIT 1
    `,
  );
  const profileResult = await query<{ id: number }>(
    `
    SELECT id
    FROM profile
    WHERE status = 'ACTIVE'
    ORDER BY
      CASE WHEN account_type = 'EMPLOYEE' THEN 0 ELSE 1 END,
      id ASC
    LIMIT 1
    `,
  );
  const actorResult = await query<{ id: number }>(
    `
    SELECT id
    FROM profile
    WHERE status = 'ACTIVE'
    ORDER BY
      CASE
        WHEN account_type IN ('FULL_STACK_DEVELOPER', 'EXECUTIVE', 'MANAGER', 'DIRECTOR', 'SUPERVISOR') THEN 0
        ELSE 1
      END,
      id ASC
    LIMIT 1
    `,
  );
  const activityLogResult = await query<{ exists: boolean }>(
    `
    SELECT to_regclass('public.approval_activity_log') IS NOT NULL AS exists
    `,
  );

  const brandId = brandResult.rows[0]?.id;
  const submitterProfileId = profileResult.rows[0]?.id;
  const actorProfileId = actorResult.rows[0]?.id ?? submitterProfileId;

  if (!brandId) {
    throw new Error("No active brand found. Create a brand before seeding demo approvals.");
  }

  if (!submitterProfileId || !actorProfileId) {
    throw new Error("No active profile found. Create an active profile before seeding demo approvals.");
  }

  return {
    brandId,
    submitterProfileId,
    actorProfileId,
    hasActivityLog: Boolean(activityLogResult.rows[0]?.exists),
  };
}

function getScheduledDateToken(value: DemoReport["scheduledPublishedDate"]) {
  if (value === "future") {
    return new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  }

  if (value === "now") {
    return new Date();
  }

  return null;
}

async function upsertDemoReport(report: DemoReport, context: SeedContext) {
  const marker = `${APPROVAL_KANBAN_DEMO_MARKER} [stage=${report.stage}]`;
  const caption = `${marker} ${report.title}`;
  const employeeComments = marker;
  const contentInspo = `${marker} Visual reference for ${report.title.toLowerCase()}.`;
  const scheduledPublishedDate = getScheduledDateToken(report.scheduledPublishedDate);
  const stageMarkerPattern = `%${APPROVAL_KANBAN_DEMO_MARKER} [stage=${report.stage}]%`;
  const legacyStageMarkerPattern =
    report.stage === "ready-to-publish"
      ? `%${APPROVAL_KANBAN_DEMO_MARKER} [stage=approved]%`
      : stageMarkerPattern;

  const existingResult = await query<{ id: number }>(
    `
    SELECT id
    FROM content_report
    WHERE employee_comments LIKE $1::text
       OR caption LIKE $1::text
       OR content_inspo LIKE $1::text
       OR employee_comments LIKE $2::text
       OR caption LIKE $2::text
       OR content_inspo LIKE $2::text
    LIMIT 1
    `,
    [stageMarkerPattern, legacyStageMarkerPattern],
  );
  const existingId = existingResult.rows[0]?.id;

  return transaction(async (client) => {
    let reportId = existingId;

    if (reportId) {
      await client.query(
        `
        UPDATE content_report
        SET
          submitted_by_profile_id = $2::integer,
          brand_id = $3::integer,
          content_type = $4::text,
          platform = $5::text,
          content_inspo = $6::text,
          caption = $7::text,
          asset_link = $8::text,
          employee_comments = $9::text,
          supervisor_status = $10::text,
          supervisor_notes = $11::text,
          supervisor_reviewed_by_profile_id = $12::integer,
          supervisor_reviewed_at = CASE
            WHEN $10::text = 'Pending' THEN NULL
            ELSE now()
          END,
          director_status = $13::text,
          director_notes = $14::text,
          director_reviewed_by_profile_id = CASE
            WHEN $13::text = 'Approved' THEN $12::integer
            ELSE NULL
          END,
          director_reviewed_at = CASE
            WHEN $13::text = 'Approved' THEN now()
            ELSE NULL
          END,
          publish_status = $15::text,
          scheduled_published_date = $16::timestamptz,
          remarks_revision_summary = $17::text,
          updated_at = now()
        WHERE id = $1::integer
        `,
        [
          reportId,
          context.submitterProfileId,
          context.brandId,
          report.contentType,
          report.platform,
          contentInspo,
          caption,
          "https://example.com/ap-creative-kanban-demo-asset",
          employeeComments,
          report.supervisorStatus,
          `${marker} Supervisor notes for visualization.`,
          context.actorProfileId,
          report.directorStatus,
          `${marker} Director notes for visualization.`,
          report.publishStatus,
          scheduledPublishedDate,
          `${marker} Publishing or revision notes for visualization.`,
        ],
      );
    } else {
      const insertResult = await client.query<{ id: number }>(
        `
        INSERT INTO content_report (
          submitted_by_profile_id,
          brand_id,
          content_type,
          platform,
          content_inspo,
          caption,
          asset_link,
          employee_comments,
          supervisor_status,
          supervisor_notes,
          supervisor_reviewed_by_profile_id,
          supervisor_reviewed_at,
          director_status,
          director_notes,
          director_reviewed_by_profile_id,
          director_reviewed_at,
          publish_status,
          scheduled_published_date,
          remarks_revision_summary
        )
        VALUES (
          $1::integer,
          $2::integer,
          $3::text,
          $4::text,
          $5::text,
          $6::text,
          $7::text,
          $8::text,
          $9::text,
          $10::text,
          $11::integer,
          CASE WHEN $9::text = 'Pending' THEN NULL ELSE now() END,
          $12::text,
          $13::text,
          CASE WHEN $12::text = 'Approved' THEN $11::integer ELSE NULL END,
          CASE WHEN $12::text = 'Approved' THEN now() ELSE NULL END,
          $14::text,
          $15::timestamptz,
          $16::text
        )
        RETURNING id
        `,
        [
          context.submitterProfileId,
          context.brandId,
          report.contentType,
          report.platform,
          contentInspo,
          caption,
          "https://example.com/ap-creative-kanban-demo-asset",
          employeeComments,
          report.supervisorStatus,
          `${marker} Supervisor notes for visualization.`,
          context.actorProfileId,
          report.directorStatus,
          `${marker} Director notes for visualization.`,
          report.publishStatus,
          scheduledPublishedDate,
          `${marker} Publishing or revision notes for visualization.`,
        ],
      );

      reportId = insertResult.rows[0].id;
    }

    if (context.hasActivityLog) {
      await client.query(
        `
        DELETE FROM approval_activity_log
        WHERE content_report_id = $1::integer
          AND action = 'dev_seed_approval_kanban_demo'::text
        `,
        [reportId],
      );
      await client.query(
        `
        INSERT INTO approval_activity_log (
          content_report_id,
          actor_profile_id,
          action,
          from_status,
          to_status,
          notes,
          metadata
        )
        VALUES (
          $1::integer,
          $2::integer,
          $3::text,
          $4::text,
          $5::text,
          $6::text,
          $7::jsonb
        )
        `,
        [
          reportId,
          context.actorProfileId,
          "dev_seed_approval_kanban_demo",
          "Pending",
          report.publishStatus !== "Pending"
            ? report.publishStatus
            : report.directorStatus !== "Pending"
              ? report.directorStatus
              : report.supervisorStatus,
          `${marker} Activity log sample for timeline visualization.`,
          JSON.stringify({
            devSeed: true,
            stage: report.stage,
            marker: APPROVAL_KANBAN_DEMO_MARKER,
          }),
        ],
      );
    }

    return reportId;
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing in .env");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed Kanban demo approvals in production.");
  }

  const context = await getSeedContext();

  for (const report of demoReports) {
    const reportId = await upsertDemoReport(report, context);
    console.log(`Seeded ${report.stage}: content_report ${reportId}`);
  }

  if (!context.hasActivityLog) {
    console.log("approval_activity_log table was not found; skipped timeline demo logs.");
  }

  console.log("Approval Kanban demo seed complete.");
}

main()
  .catch((error) => {
    console.error("Failed to seed Approval Kanban demo records:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
