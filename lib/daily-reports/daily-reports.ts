import "server-only";

import { query } from "@/lib/db";
import type { DailyReportFilterBounds } from "@/lib/daily-reports/daily-report-filters";
import {
  countGradedAssignmentMetrics,
  isContentReportFullyApproved,
  isContentReportPending,
} from "@/lib/daily-reports/daily-report-metrics";
import type {
  ContentType,
  Platform,
  PublishStatus,
  ReviewStatus,
} from "@/app/employee/approvals/schema";
import type {
  DailyApprovalLogEntry,
  DailyBlockerEntry,
  DailyBrandSummary,
  DailyEmployeeSummary,
  DailyMissingEntry,
  DailyReportBrandOption,
  DailyReportData,
  DailyTaskLogEntry,
  DailyTimelineEntry,
} from "@/lib/daily-reports/daily-report-types";
import type {
  TaskAssignmentStatus,
  TaskPriority,
  TaskType,
} from "@/lib/tasks/task-type";

export type {
  DailyApprovalLogEntry,
  DailyBlockerEntry,
  DailyBrandSummary,
  DailyEmployeeSummary,
  DailyMissingEntry,
  DailyReportBrandOption,
  DailyReportData,
  DailyReportEmployeeOption,
  DailyReportSummary,
  DailyTaskLogEntry,
  DailyTimelineEntry,
} from "@/lib/daily-reports/daily-report-types";

const DERIVED_BRAND_SQL = `
  (
    SELECT uba.brand_id
    FROM user_brand_access uba
    WHERE uba.profile_id = ta.assigned_to_profile_id
      AND uba.is_active = true
    ORDER BY uba.is_primary DESC, uba.brand_id ASC
    LIMIT 1
  )
`;

const TASK_DAILY_SCOPE_SQL = `
  (
    (t.due_date >= $1::timestamptz AND t.due_date <= $2::timestamptz)
    OR (ta.completed_at >= $1::timestamptz AND ta.completed_at <= $2::timestamptz)
    OR (ta.updated_at >= $1::timestamptz AND ta.updated_at <= $2::timestamptz)
    OR (ta.submitted_at >= $1::timestamptz AND ta.submitted_at <= $2::timestamptz)
    OR EXISTS (
      SELECT 1
      FROM task_activity_log tal
      WHERE (
        tal.task_assignment_id = ta.id
        OR (tal.task_assignment_id IS NULL AND tal.task_id = t.id)
      )
        AND tal.created_at >= $1::timestamptz
        AND tal.created_at <= $2::timestamptz
    )
  )
`;

const TASK_BRAND_FILTER_SQL = `
  (
    $3::integer IS NULL
    OR EXISTS (
      SELECT 1
      FROM user_brand_access uba
      WHERE uba.profile_id = ta.assigned_to_profile_id
        AND uba.brand_id = $3
        AND uba.is_active = true
    )
  )
`;

const TASK_EMPLOYEE_FILTER_SQL = `($4::integer IS NULL OR ta.assigned_to_profile_id = $4)`;

const APPROVAL_DAILY_SCOPE_SQL = `
  (
    (cr.date_submitted >= $1::timestamptz AND cr.date_submitted <= $2::timestamptz)
    OR (cr.updated_at >= $1::timestamptz AND cr.updated_at <= $2::timestamptz)
    OR EXISTS (
      SELECT 1
      FROM approval_activity_log aal
      WHERE aal.content_report_id = cr.id
        AND aal.created_at >= $1::timestamptz
        AND aal.created_at <= $2::timestamptz
    )
  )
`;

function getProofStatusLabel({
  status,
  proofUrl,
  proofNote,
  submittedAt,
}: {
  status: TaskAssignmentStatus;
  proofUrl: string | null;
  proofNote: string | null;
  submittedAt: string | null;
}) {
  if (status === "DONE") {
    return "Confirmed";
  }

  if (status === "PENDING") {
    return "Pending review";
  }

  if (submittedAt || proofUrl || proofNote) {
    return "Submitted";
  }

  return "Missing";
}

function buildAlertSummary({
  pendingGraded,
  blockers,
  pendingApprovals,
}: {
  pendingGraded: number;
  blockers: number;
  pendingApprovals: number;
}) {
  const parts: string[] = [];

  if (pendingGraded > 0) {
    parts.push(
      `${pendingGraded} graded task${pendingGraded === 1 ? "" : "s"} still need action`,
    );
  }

  if (blockers > 0) {
    parts.push(
      `${blockers} blocker${blockers === 1 ? "" : "s"} need${blockers === 1 ? "s" : ""} review`,
    );
  }

  if (pendingApprovals > 0) {
    parts.push(
      `${pendingApprovals} approval${pendingApprovals === 1 ? "" : "s"} ${pendingApprovals === 1 ? "is" : "are"} pending`,
    );
  }

  if (parts.length === 0) {
    return "No blockers or missing items for the selected filters.";
  }

  return `${parts.join(". ")}.`;
}

function formatTimelineAction(action: string) {
  const labels: Record<string, string> = {
    TASK_CREATED: "Task created",
    TASK_UPDATED: "Task updated",
    TASK_DELETED: "Task deleted",
    ASSIGNMENT_CREATED: "Assignment created",
    STATUS_CHANGED: "Status changed",
    PROOF_SUBMITTED: "Proof submitted",
    PROOF_RESUBMITTED: "Proof resubmitted",
    BLOCKER_REPORTED: "Blocker reported",
    BLOCKER_CONFIRMED: "Blocker confirmed",
    BLOCKER_RESOLVED: "Blocker resolved",
    REVISION_REQUESTED: "Revision requested",
    TASK_MARKED_DONE: "Task marked done",
    TASK_REOPENED: "Task reopened",
    DEADLINE_CHANGED: "Deadline changed",
    supervisor_review_update: "Supervisor review updated",
    director_review_update: "Director review updated",
    publishing_update: "Publishing details updated",
    kanban_supervisor_status_update: "Supervisor status changed",
    kanban_director_status_update: "Director status changed",
    kanban_publishing_update: "Publish status changed",
  };

  return labels[action] ?? action.replaceAll("_", " ");
}

function formatTimelineDetail({
  fromStatus,
  toStatus,
  notes,
  metadata,
}: {
  fromStatus: string | null;
  toStatus: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
}) {
  const parts: string[] = [];

  if (fromStatus && toStatus) {
    parts.push(`${fromStatus} → ${toStatus}`);
  } else if (toStatus) {
    parts.push(toStatus);
  }

  if (notes?.trim()) {
    parts.push(notes.trim());
  }

  if (metadata) {
    const from = metadata.deadline_changed_from;
    const to = metadata.deadline_changed_to;

    if (typeof from === "string" || typeof to === "string") {
      parts.push(
        `Deadline: ${typeof from === "string" ? from : "None"} → ${typeof to === "string" ? to : "None"}`,
      );
    }
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export async function getDailyReportFilterOptions() {
  const [brands, employees] = await Promise.all([
    query<DailyReportBrandOption>(
      `
      SELECT id, name
      FROM brand
      WHERE is_active = true
      ORDER BY name ASC, id ASC
      `,
    ),
    query<{ id: number; full_name: string; email: string }>(
      `
      SELECT id, full_name, email
      FROM profile
      WHERE status = 'ACTIVE'
        AND account_type IN ('CLIENT', 'EMPLOYEE')
      ORDER BY full_name ASC, id ASC
      `,
    ),
  ]);

  return {
    brands: brands.rows.map((row) => ({ id: row.id, name: row.name })),
    employees: employees.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
    })),
  };
}

export async function getDailyReportData(
  bounds: DailyReportFilterBounds,
): Promise<DailyReportData> {
  const params = [
    bounds.start,
    bounds.end,
    bounds.brandId,
    bounds.employeeId,
  ] as const;

  const [
    gradedAssignments,
    taskLogRows,
    approvalRows,
    blockerRows,
    brandTaskRows,
    employeeTaskRows,
    brandApprovalRows,
    employeeApprovalRows,
    timelineTaskRows,
    timelineApprovalRows,
  ] = await Promise.all([
    query<{
      status: TaskAssignmentStatus;
      priority: TaskPriority | null;
      due_date: Date | null;
      submitted_at: Date | null;
      completed_at: Date | null;
    }>(
      `
      SELECT ta.status, t.priority, t.due_date, ta.submitted_at, ta.completed_at
      FROM task_assignment ta
      JOIN task t ON t.id = ta.task_id
      WHERE t.task_type = 'GRADED'
        AND ${TASK_DAILY_SCOPE_SQL}
        AND ${TASK_BRAND_FILTER_SQL}
        AND ${TASK_EMPLOYEE_FILTER_SQL}
      `,
      [...params],
    ),
    query<{
      assignment_id: number;
      task_id: number;
      title: string;
      assignee_name: string;
      created_by_name: string;
      brand_name: string | null;
      task_type: TaskType;
      priority: TaskPriority | null;
      status: TaskAssignmentStatus;
      due_date: Date | null;
      completed_at: Date | null;
      proof_url: string | null;
      proof_note: string | null;
      submitted_at: Date | null;
      updated_at: Date;
    }>(
      `
      SELECT
        ta.id AS assignment_id,
        t.id AS task_id,
        t.title,
        assignee.full_name AS assignee_name,
        creator.full_name AS created_by_name,
        b.name AS brand_name,
        t.task_type,
        t.priority,
        ta.status,
        t.due_date,
        ta.completed_at,
        ta.proof_url,
        ta.proof_note,
        ta.submitted_at,
        ta.updated_at
      FROM task_assignment ta
      JOIN task t ON t.id = ta.task_id
      JOIN profile assignee ON assignee.id = ta.assigned_to_profile_id
      JOIN profile creator ON creator.id = t.created_by_profile_id
      LEFT JOIN brand b ON b.id = ${DERIVED_BRAND_SQL}
      WHERE ${TASK_DAILY_SCOPE_SQL}
        AND ${TASK_BRAND_FILTER_SQL}
        AND ${TASK_EMPLOYEE_FILTER_SQL}
      ORDER BY
        CASE ta.status
          WHEN 'BLOCKER' THEN 1
          WHEN 'REVISION' THEN 2
          WHEN 'ASSIGNED' THEN 3
          WHEN 'PENDING' THEN 4
          ELSE 5
        END,
        t.due_date ASC NULLS LAST,
        ta.updated_at DESC,
        ta.id DESC
      `,
      [...params],
    ),
    query<{
      id: number;
      date_submitted: Date;
      submitted_by_name: string;
      brand_name: string | null;
      content_type: ContentType;
      platform: Platform;
      caption: string;
      supervisor_status: ReviewStatus;
      director_status: ReviewStatus;
      publish_status: PublishStatus;
      scheduled_published_date: Date | null;
    }>(
      `
      SELECT
        cr.id,
        cr.date_submitted,
        submitter.full_name AS submitted_by_name,
        b.name AS brand_name,
        cr.content_type,
        cr.platform,
        cr.caption,
        cr.supervisor_status,
        cr.director_status,
        cr.publish_status,
        cr.scheduled_published_date
      FROM content_report cr
      JOIN profile submitter ON submitter.id = cr.submitted_by_profile_id
      LEFT JOIN brand b ON b.id = cr.brand_id
      WHERE ${APPROVAL_DAILY_SCOPE_SQL}
        AND ($3::integer IS NULL OR cr.brand_id = $3)
        AND ($4::integer IS NULL OR cr.submitted_by_profile_id = $4)
      ORDER BY cr.date_submitted DESC, cr.id DESC
      `,
      [...params],
    ),
    query<{
      assignment_id: number;
      task_title: string;
      blocker_note: string | null;
      employee_name: string;
      brand_name: string | null;
      reported_at: Date | null;
      created_by_name: string;
      due_date: Date | null;
    }>(
      `
      SELECT
        ta.id AS assignment_id,
        t.title AS task_title,
        ta.blocker_note,
        assignee.full_name AS employee_name,
        b.name AS brand_name,
        ta.blocker_reported_at AS reported_at,
        creator.full_name AS created_by_name,
        t.due_date
      FROM task_assignment ta
      JOIN task t ON t.id = ta.task_id
      JOIN profile assignee ON assignee.id = ta.assigned_to_profile_id
      JOIN profile creator ON creator.id = t.created_by_profile_id
      LEFT JOIN brand b ON b.id = ${DERIVED_BRAND_SQL}
      WHERE ta.status = 'BLOCKER'
        AND ${TASK_DAILY_SCOPE_SQL}
        AND ${TASK_BRAND_FILTER_SQL}
        AND ${TASK_EMPLOYEE_FILTER_SQL}
      ORDER BY ta.blocker_reported_at DESC NULLS LAST, ta.updated_at DESC
      `,
      [...params],
    ),
    query<{
      brand_id: number | null;
      brand_name: string | null;
      status: TaskAssignmentStatus;
      task_type: TaskType;
    }>(
      `
      SELECT
        ${DERIVED_BRAND_SQL} AS brand_id,
        b.name AS brand_name,
        ta.status,
        t.task_type
      FROM task_assignment ta
      JOIN task t ON t.id = ta.task_id
      LEFT JOIN brand b ON b.id = ${DERIVED_BRAND_SQL}
      WHERE ${TASK_DAILY_SCOPE_SQL}
        AND ${TASK_BRAND_FILTER_SQL}
        AND ($4::integer IS NULL OR ta.assigned_to_profile_id = $4)
        AND ${DERIVED_BRAND_SQL} IS NOT NULL
      `,
      [...params],
    ),
    query<{
      profile_id: number;
      full_name: string;
      email: string;
      image_url: string | null;
      status: TaskAssignmentStatus;
      priority: TaskPriority | null;
      due_date: Date | null;
      submitted_at: Date | null;
      completed_at: Date | null;
    }>(
      `
      SELECT
        assignee.id AS profile_id,
        assignee.full_name,
        assignee.email,
        assignee_user.image AS image_url,
        ta.status,
        t.priority,
        t.due_date,
        ta.submitted_at,
        ta.completed_at
      FROM task_assignment ta
      JOIN task t ON t.id = ta.task_id
      JOIN profile assignee ON assignee.id = ta.assigned_to_profile_id
      JOIN "user" assignee_user ON assignee_user.id = assignee.auth_user_id
      WHERE t.task_type = 'GRADED'
        AND ${TASK_DAILY_SCOPE_SQL}
        AND ${TASK_BRAND_FILTER_SQL}
        AND ($4::integer IS NULL OR ta.assigned_to_profile_id = $4)
      `,
      [...params],
    ),
    query<{
      brand_id: number | null;
      brand_name: string | null;
      supervisor_status: ReviewStatus;
      director_status: ReviewStatus;
    }>(
      `
      SELECT
        cr.brand_id,
        b.name AS brand_name,
        cr.supervisor_status,
        cr.director_status
      FROM content_report cr
      LEFT JOIN brand b ON b.id = cr.brand_id
      WHERE ${APPROVAL_DAILY_SCOPE_SQL}
        AND ($3::integer IS NULL OR cr.brand_id = $3)
        AND ($4::integer IS NULL OR cr.submitted_by_profile_id = $4)
        AND cr.brand_id IS NOT NULL
      `,
      [...params],
    ),
    query<{
      profile_id: number;
      full_name: string;
      email: string;
      image_url: string | null;
      supervisor_status: ReviewStatus;
      director_status: ReviewStatus;
    }>(
      `
      SELECT
        submitter.id AS profile_id,
        submitter.full_name,
        submitter.email,
        submitter_user.image AS image_url,
        cr.supervisor_status,
        cr.director_status
      FROM content_report cr
      JOIN profile submitter ON submitter.id = cr.submitted_by_profile_id
      JOIN "user" submitter_user ON submitter_user.id = submitter.auth_user_id
      WHERE ${APPROVAL_DAILY_SCOPE_SQL}
        AND ($3::integer IS NULL OR cr.brand_id = $3)
        AND ($4::integer IS NULL OR cr.submitted_by_profile_id = $4)
      `,
      [...params],
    ),
    query<{
      id: number;
      created_at: Date;
      actor_name: string;
      action: string;
      from_status: string | null;
      to_status: string | null;
      notes: string | null;
      metadata: Record<string, unknown> | null;
      brand_name: string | null;
      employee_name: string | null;
      task_title: string | null;
    }>(
      `
      SELECT
        tal.id,
        tal.created_at,
        actor.full_name AS actor_name,
        tal.action,
        tal.from_status,
        tal.to_status,
        tal.notes,
        tal.metadata,
        b.name AS brand_name,
        assignee.full_name AS employee_name,
        t.title AS task_title
      FROM task_activity_log tal
      JOIN profile actor ON actor.id = tal.actor_profile_id
      LEFT JOIN task_assignment ta ON ta.id = tal.task_assignment_id
      LEFT JOIN task t ON t.id = COALESCE(ta.task_id, tal.task_id)
      LEFT JOIN profile assignee ON assignee.id = ta.assigned_to_profile_id
      LEFT JOIN brand b ON b.id = ${DERIVED_BRAND_SQL}
      WHERE tal.created_at >= $1::timestamptz
        AND tal.created_at <= $2::timestamptz
        AND (
          $3::integer IS NULL
          OR EXISTS (
            SELECT 1
            FROM user_brand_access uba
            WHERE uba.profile_id = ta.assigned_to_profile_id
              AND uba.brand_id = $3
              AND uba.is_active = true
          )
        )
        AND ($4::integer IS NULL OR ta.assigned_to_profile_id = $4)
      ORDER BY tal.created_at DESC, tal.id DESC
      `,
      [...params],
    ),
    query<{
      id: number;
      created_at: Date;
      actor_name: string;
      action: string;
      from_status: string | null;
      to_status: string | null;
      notes: string | null;
      metadata: Record<string, unknown> | null;
      brand_name: string | null;
      employee_name: string | null;
    }>(
      `
      SELECT
        aal.id,
        aal.created_at,
        actor.full_name AS actor_name,
        aal.action,
        aal.from_status,
        aal.to_status,
        aal.notes,
        aal.metadata,
        b.name AS brand_name,
        submitter.full_name AS employee_name
      FROM approval_activity_log aal
      JOIN profile actor ON actor.id = aal.actor_profile_id
      JOIN content_report cr ON cr.id = aal.content_report_id
      JOIN profile submitter ON submitter.id = cr.submitted_by_profile_id
      LEFT JOIN brand b ON b.id = cr.brand_id
      WHERE aal.created_at >= $1::timestamptz
        AND aal.created_at <= $2::timestamptz
        AND ($3::integer IS NULL OR cr.brand_id = $3)
        AND ($4::integer IS NULL OR cr.submitted_by_profile_id = $4)
      ORDER BY aal.created_at DESC, aal.id DESC
      `,
      [...params],
    ),
  ]);

  const gradedMetrics = countGradedAssignmentMetrics(
    gradedAssignments.rows.map((row) => ({
      status: row.status,
      priority: row.priority,
      dueDate: row.due_date?.toISOString() ?? null,
      submittedAt: row.submitted_at?.toISOString() ?? null,
      completedAt: row.completed_at?.toISOString() ?? null,
    })),
  );

  const approvalTotal = approvalRows.rows.length;
  const approvedCount = approvalRows.rows.filter((row) =>
    isContentReportFullyApproved(row.supervisor_status, row.director_status),
  ).length;
  const pendingApprovals = approvalRows.rows.filter((row) =>
    isContentReportPending(row.supervisor_status, row.director_status),
  ).length;

  const brandMap = new Map<number, DailyBrandSummary>();

  for (const row of brandTaskRows.rows) {
    if (!row.brand_id || !row.brand_name || row.task_type !== "GRADED") {
      continue;
    }

    const existing = brandMap.get(row.brand_id) ?? {
      brandId: row.brand_id,
      brandName: row.brand_name,
      gradedTotal: 0,
      gradedDone: 0,
      pendingTasks: 0,
      blockerTasks: 0,
      approvalsSubmitted: 0,
      fullyApproved: 0,
      approvalRate: 0,
      completionRate: 0,
    };

    existing.gradedTotal += 1;

    if (row.status === "DONE") {
      existing.gradedDone += 1;
    } else if (row.status === "BLOCKER") {
      existing.blockerTasks += 1;
      existing.pendingTasks += 1;
    } else {
      existing.pendingTasks += 1;
    }

    brandMap.set(row.brand_id, existing);
  }

  for (const row of brandApprovalRows.rows) {
    if (!row.brand_id || !row.brand_name) {
      continue;
    }

    const existing = brandMap.get(row.brand_id) ?? {
      brandId: row.brand_id,
      brandName: row.brand_name,
      gradedTotal: 0,
      gradedDone: 0,
      pendingTasks: 0,
      blockerTasks: 0,
      approvalsSubmitted: 0,
      fullyApproved: 0,
      approvalRate: 0,
      completionRate: 0,
    };

    existing.approvalsSubmitted += 1;

    if (
      isContentReportFullyApproved(row.supervisor_status, row.director_status)
    ) {
      existing.fullyApproved += 1;
    }

    brandMap.set(row.brand_id, existing);
  }

  const brandSummaries = [...brandMap.values()]
    .map((summary) => ({
      ...summary,
      approvalRate:
        summary.approvalsSubmitted > 0
          ? Math.round(
              (summary.fullyApproved / summary.approvalsSubmitted) * 10000,
            ) / 100
          : 0,
      completionRate:
        summary.gradedTotal > 0
          ? Math.round((summary.gradedDone / summary.gradedTotal) * 10000) / 100
          : 0,
    }))
    .filter((summary) =>
      bounds.brandId ? summary.brandId === bounds.brandId : true,
    )
    .sort((left, right) => left.brandName.localeCompare(right.brandName));

  const employeeMap = new Map<number, DailyEmployeeSummary>();

  for (const row of employeeTaskRows.rows) {
    const existing = employeeMap.get(row.profile_id) ?? {
      profileId: row.profile_id,
      fullName: row.full_name,
      email: row.email,
      imageUrl: row.image_url,
      assignedGradedTasks: 0,
      doneGradedTasks: 0,
      pendingTasks: 0,
      blockerTasks: 0,
      revisionTasks: 0,
      approvalsSubmitted: 0,
      approvalsApproved: 0,
      gradedCompletionRate: 0,
      grossTaskPoints: 0,
      lateTaskDeductionPoints: 0,
      taskPoints: 0,
      adjustedCompletionRate: 0,
    };

    existing.assignedGradedTasks += 1;

    if (row.status === "DONE") {
      existing.doneGradedTasks += 1;
    } else if (row.status === "BLOCKER") {
      existing.blockerTasks += 1;
      existing.pendingTasks += 1;
    } else if (row.status === "REVISION") {
      existing.revisionTasks += 1;
      existing.pendingTasks += 1;
    } else {
      existing.pendingTasks += 1;
    }

    employeeMap.set(row.profile_id, existing);
  }

  for (const row of employeeApprovalRows.rows) {
    const existing = employeeMap.get(row.profile_id) ?? {
      profileId: row.profile_id,
      fullName: row.full_name,
      email: row.email,
      imageUrl: row.image_url,
      assignedGradedTasks: 0,
      doneGradedTasks: 0,
      pendingTasks: 0,
      blockerTasks: 0,
      revisionTasks: 0,
      approvalsSubmitted: 0,
      approvalsApproved: 0,
      gradedCompletionRate: 0,
      grossTaskPoints: 0,
      lateTaskDeductionPoints: 0,
      taskPoints: 0,
      adjustedCompletionRate: 0,
    };

    existing.approvalsSubmitted += 1;

    if (
      isContentReportFullyApproved(row.supervisor_status, row.director_status)
    ) {
      existing.approvalsApproved += 1;
    }

    employeeMap.set(row.profile_id, existing);
  }

  const employeeSummaries = [...employeeMap.values()]
    .map((summary) => {
      const employeeGraded = employeeTaskRows.rows.filter(
        (row) => row.profile_id === summary.profileId,
      );
      const performance = countGradedAssignmentMetrics(
        employeeGraded.map((row) => ({
          status: row.status,
          priority: row.priority,
          dueDate: row.due_date?.toISOString() ?? null,
          submittedAt: row.submitted_at?.toISOString() ?? null,
          completedAt: row.completed_at?.toISOString() ?? null,
        })),
      );

      return {
        ...summary,
        gradedCompletionRate: performance.completionRate,
        grossTaskPoints: performance.grossTaskPoints,
        lateTaskDeductionPoints: performance.lateTaskDeductionPoints,
        taskPoints: performance.taskPoints,
        adjustedCompletionRate: performance.adjustedCompletionRate,
      };
    })
    .filter((summary) =>
      bounds.employeeId ? summary.profileId === bounds.employeeId : true,
    )
    .sort((left, right) => left.fullName.localeCompare(right.fullName));

  const missingItems: DailyMissingEntry[] = [];

  for (const row of taskLogRows.rows) {
    if (row.task_type !== "GRADED") {
      continue;
    }

    const dueDate = row.due_date;
    const dueOnSelectedDay =
      dueDate &&
      dueDate >= bounds.start &&
      dueDate <= bounds.end &&
      row.status !== "DONE";

    if (dueOnSelectedDay) {
      missingItems.push({
        kind: "graded_due",
        label: "Graded task due today",
        employeeName: row.assignee_name,
        brandName: row.brand_name,
        reference: row.title,
      });
    }

    if (
      row.status === "ASSIGNED" &&
      dueDate &&
      dueDate < bounds.end &&
      dueDate < new Date()
    ) {
      missingItems.push({
        kind: "overdue_assigned",
        label: "Assigned task overdue",
        employeeName: row.assignee_name,
        brandName: row.brand_name,
        reference: row.title,
      });
    }

    if (row.status === "REVISION") {
      missingItems.push({
        kind: "revision",
        label: "Task in revision",
        employeeName: row.assignee_name,
        brandName: row.brand_name,
        reference: row.title,
      });
    }
  }

  for (const row of approvalRows.rows) {
    if (isContentReportPending(row.supervisor_status, row.director_status)) {
      missingItems.push({
        kind: "approval_pending",
        label: "Content approval pending",
        employeeName: row.submitted_by_name,
        brandName: row.brand_name,
        reference: row.caption.slice(0, 80),
      });
    }
  }

  const taskLog: DailyTaskLogEntry[] = taskLogRows.rows.map((row) => {
    const dueDate = row.due_date;
    const isOverdue =
      row.status !== "DONE" &&
      dueDate !== null &&
      dueDate.getTime() < bounds.end.getTime();

    return {
      assignmentId: row.assignment_id,
      taskId: row.task_id,
      title: row.title,
      assigneeName: row.assignee_name,
      createdByName: row.created_by_name,
      brandName: row.brand_name,
      taskType: row.task_type,
      priority: row.priority,
      status: row.status,
      dueDate: dueDate?.toISOString() ?? null,
      completedAt: row.completed_at?.toISOString() ?? null,
      proofStatus: getProofStatusLabel({
        status: row.status,
        proofUrl: row.proof_url,
        proofNote: row.proof_note,
        submittedAt: row.submitted_at?.toISOString() ?? null,
      }),
      updatedAt: row.updated_at.toISOString(),
      isOverdue,
      isMissingProof:
        row.task_type === "GRADED" &&
        row.status === "ASSIGNED" &&
        !row.proof_url &&
        !row.proof_note &&
        !row.submitted_at,
    };
  });

  const approvalLog: DailyApprovalLogEntry[] = approvalRows.rows.map((row) => ({
    id: row.id,
    dateSubmitted: row.date_submitted.toISOString(),
    submittedByName: row.submitted_by_name,
    brandName: row.brand_name,
    contentType: row.content_type,
    platform: row.platform,
    captionPreview:
      row.caption.length > 100 ? `${row.caption.slice(0, 100)}…` : row.caption,
    supervisorStatus: row.supervisor_status,
    directorStatus: row.director_status,
    publishStatus: row.publish_status,
    scheduledPublishedDate: row.scheduled_published_date?.toISOString() ?? null,
  }));

  const blockers: DailyBlockerEntry[] = blockerRows.rows.map((row) => ({
    assignmentId: row.assignment_id,
    taskTitle: row.task_title,
    blockerNote: row.blocker_note,
    employeeName: row.employee_name,
    brandName: row.brand_name,
    reportedAt: row.reported_at?.toISOString() ?? null,
    createdByName: row.created_by_name,
    dueDate: row.due_date?.toISOString() ?? null,
  }));

  const timeline: DailyTimelineEntry[] = [
    ...timelineTaskRows.rows.map((row) => ({
      id: `task-${row.id}`,
      createdAt: row.created_at.toISOString(),
      actorName: row.actor_name,
      actionLabel: formatTimelineAction(row.action),
      module: "Task" as const,
      brandName: row.brand_name,
      employeeName: row.employee_name,
      detail: formatTimelineDetail({
        fromStatus: row.from_status,
        toStatus: row.to_status,
        notes: row.notes,
        metadata: row.metadata,
      }),
    })),
    ...timelineApprovalRows.rows.map((row) => ({
      id: `approval-${row.id}`,
      createdAt: row.created_at.toISOString(),
      actorName: row.actor_name,
      actionLabel: formatTimelineAction(row.action),
      module: "Approval" as const,
      brandName: row.brand_name,
      employeeName: row.employee_name,
      detail: formatTimelineDetail({
        fromStatus: row.from_status,
        toStatus: row.to_status,
        notes: row.notes,
        metadata: row.metadata,
      }),
    })),
  ].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  const pendingGraded = gradedMetrics.total - gradedMetrics.done;

  return {
    summary: {
      dailyCompletionRate: gradedMetrics.completionRate,
      gradedTaskCompletionRate: gradedMetrics.completionRate,
      grossTaskPoints: gradedMetrics.grossTaskPoints,
      lateTaskDeductionPoints: gradedMetrics.lateTaskDeductionPoints,
      gradedTaskPoints: gradedMetrics.taskPoints,
      adjustedCompletionRate: gradedMetrics.adjustedCompletionRate,
      approvalRate:
        approvalTotal > 0
          ? Math.round((approvedCount / approvalTotal) * 10000) / 100
          : 0,
      approvedCount,
      approvalTotal,
      completedGradedTasks: gradedMetrics.done,
      totalGradedTasks: gradedMetrics.total,
      pendingMissingCount: pendingGraded + pendingApprovals,
      blockerCount: gradedMetrics.blockers,
    },
    brandSummaries,
    employeeSummaries,
    taskLog,
    approvalLog,
    blockers,
    missingItems,
    timeline,
    alertSummary: buildAlertSummary({
      pendingGraded,
      blockers: gradedMetrics.blockers,
      pendingApprovals,
    }),
  };
}
