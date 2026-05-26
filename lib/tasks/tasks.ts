import "server-only";

import { query } from "@/lib/db";
import {
  buildTaskPerformanceCounts,
  calculateTaskPerformancePoints,
  type TaskPerformanceCounts,
  type TaskPerformanceResult,
} from "@/lib/performance-scoring";
import { countGradedAssignmentMetrics } from "@/lib/daily-reports/daily-report-metrics";
import type {
  TaskPriority,
  TaskProofType,
  TaskType,
} from "@/lib/tasks/task-type";
import type { TaskAssignmentStatus } from "@/lib/tasks/task-statuses";
import type { AccountType, ProfileStatus } from "@/lib/auth/auth-session";
import {
  getEffectiveBrandAccessForProfile,
  profileHasAllBrandsAccess,
} from "@/lib/brand-access/effective-brand-access";

export type AssigneeBrandAccess = {
  brandId: number;
  brandName: string;
  isPrimary: boolean;
};

export type AssignableProfile = {
  id: number;
  fullName: string;
  email: string;
  accountType: AccountType;
  status: ProfileStatus;
  brands: AssigneeBrandAccess[];
  hasAllBrandsAccess?: boolean;
};

export type StaffAccountabilityFilterInput = {
  startDate?: Date | null;
  endDate?: Date | null;
  brandId?: number | null;
  employeeId?: number | null;
};

export type StaffAccountabilitySummary = {
  rank: number;
  profileId: number;
  fullName: string;
  email: string;
  accountType: AccountType;
  brands: AssigneeBrandAccess[];
  totalAssignedTasks: number;
  completedTasks: number;
  pendingTasks: number;
  revisionTasks: number;
  blockerTasks: number;
  assignedStatusTasks: number;
  completedOnTimeTasks: number;
  completedLateTasks: number;
  notCompletedTasks: number;
  completionRate: number;
  adjustedCompletionRate: number;
  taskPoints: number;
  performanceLabel: "Excellent" | "Good" | "Needs Review" | "Critical";
};

export type StaffAccountabilityTeamSummary = {
  averageTeamCompletion: number;
  totalAssignedTasks: number;
  totalCompletedTasks: number;
  totalPendingTasks: number;
  totalRevisionTasks: number;
  totalBlockerTasks: number;
  teamCompletionRate: number;
  totalTeamPoints: number;
  needsAttentionCount: number;
};

export type StaffAccountabilityBrandSummary = {
  brandId: number;
  brandName: string;
  totalAssignedTasks: number;
  completedTasks: number;
  pendingTasks: number;
  revisionTasks: number;
  blockerTasks: number;
  taskCompletionRate: number;
  totalApprovals: number;
  pendingApprovals: number;
  approvedApprovals: number;
  revisionApprovals: number;
  rejectedApprovals: number;
  scheduledPublishedApprovals: number;
};

export type StaffAccountabilityData = {
  summaries: StaffAccountabilitySummary[];
  teamSummary: StaffAccountabilityTeamSummary;
  brandSummaries: StaffAccountabilityBrandSummary[];
  statusDistribution: {
    assigned: number;
    completed: number;
    pending: number;
    revision: number;
    blocker: number;
  };
};

export type TaskAssignmentRecord = {
  assignmentId: number;
  taskId: number;
  title: string;
  description: string | null;
  taskType: TaskType;
  priority: TaskPriority | null;
  dueDate: string | null;
  createdByProfileId: number;
  createdByName: string;
  assignedToProfileId: number;
  assignedToName: string;
  assigneeBrands: AssigneeBrandAccess[];
  status: TaskAssignmentStatus;
  proofType: TaskProofType | null;
  proofUrl: string | null;
  proofNote: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  reviewedByProfileId: number | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  revisionNote: string | null;
  blockerNote: string | null;
  blockerReportedAt: string | null;
  blockerReportedByProfileId: number | null;
  blockerReportedByName: string | null;
  blockerConfirmedAt: string | null;
  blockerConfirmedByProfileId: number | null;
  blockerConfirmedByName: string | null;
  blockerResolutionNote: string | null;
  activityLogs: TaskActivityLogRecord[];
  createdAt: string;
  updatedAt: string;
};

export type TaskActivityLogRecord = {
  id: number;
  taskId: number;
  taskAssignmentId: number | null;
  actorProfileId: number;
  actorName: string;
  action: string;
  fromStatus: TaskAssignmentStatus | null;
  toStatus: TaskAssignmentStatus | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type AssignmentRow = {
  assignment_id: number;
  task_id: number;
  title: string;
  description: string | null;
  task_type: TaskType;
  priority: TaskPriority | null;
  due_date: Date | null;
  created_by_profile_id: number;
  created_by_name: string;
  assigned_to_profile_id: number;
  assigned_to_name: string;
  assignee_brands: AssigneeBrandAccess[] | null;
  status: TaskAssignmentStatus;
  proof_type: TaskProofType | null;
  proof_url: string | null;
  proof_note: string | null;
  submitted_at: Date | null;
  completed_at: Date | null;
  reviewed_by_profile_id: number | null;
  reviewed_by_name: string | null;
  reviewed_at: Date | null;
  revision_note: string | null;
  blocker_note: string | null;
  blocker_reported_at: Date | null;
  blocker_reported_by_profile_id: number | null;
  blocker_reported_by_name: string | null;
  blocker_confirmed_at: Date | null;
  blocker_confirmed_by_profile_id: number | null;
  blocker_confirmed_by_name: string | null;
  blocker_resolution_note: string | null;
  activity_logs: ActivityLogJsonRow[] | null;
  created_at: Date;
  updated_at: Date;
};

type StaffAccountabilityEmployeeRow = {
  id: number;
  full_name: string;
  email: string;
  account_type: AccountType;
  brands: AssigneeBrandAccess[] | null;
};

type StaffAccountabilityAssignmentRow = {
  profile_id: number;
  status: TaskAssignmentStatus;
  priority: TaskPriority | null;
  due_date: Date | null;
  completed_at: Date | null;
};

type StaffAccountabilityBrandRow = {
  brand_id: number;
  brand_name: string;
};

type StaffAccountabilityBrandTaskRow = {
  brand_id: number;
  brand_name: string;
  status: TaskAssignmentStatus;
};

type StaffAccountabilityBrandApprovalRow = {
  brand_id: number;
  brand_name: string;
  supervisor_status: string;
  director_status: string;
  publish_status: string;
};

type ActivityLogJsonRow = {
  id: number;
  taskId: number;
  taskAssignmentId: number | null;
  actorProfileId: number;
  actorName: string;
  action: string;
  fromStatus: TaskAssignmentStatus | null;
  toStatus: TaskAssignmentStatus | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

const ASSIGNMENT_SELECT = `
  SELECT
    ta.id AS assignment_id,
    t.id AS task_id,
    t.title,
    t.description,
    t.task_type,
    t.priority,
    t.due_date,
    t.created_by_profile_id,
    creator.full_name AS created_by_name,
    ta.assigned_to_profile_id,
    assignee.full_name AS assigned_to_name,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'brandId', b.id,
            'brandName', b.name,
            'isPrimary', uba.is_primary
          )
          ORDER BY uba.is_primary DESC, b.name ASC
        )
        FROM user_brand_access uba
        JOIN brand b ON b.id = uba.brand_id
        WHERE uba.profile_id = ta.assigned_to_profile_id
          AND uba.is_active = true
          AND b.is_active = true
      ),
      '[]'::json
    ) AS assignee_brands,
    ta.status,
    ta.proof_type,
    ta.proof_url,
    ta.proof_note,
    ta.submitted_at,
    ta.completed_at,
    ta.reviewed_by_profile_id,
    reviewer.full_name AS reviewed_by_name,
    ta.reviewed_at,
    ta.revision_note,
    ta.blocker_note,
    ta.blocker_reported_at,
    ta.blocker_reported_by_profile_id,
    blocker_reporter.full_name AS blocker_reported_by_name,
    ta.blocker_confirmed_at,
    ta.blocker_confirmed_by_profile_id,
    blocker_confirmer.full_name AS blocker_confirmed_by_name,
    ta.blocker_resolution_note,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', log.id,
            'taskId', log.task_id,
            'taskAssignmentId', log.task_assignment_id,
            'actorProfileId', log.actor_profile_id,
            'actorName', actor.full_name,
            'action', log.action,
            'fromStatus', log.from_status,
            'toStatus', log.to_status,
            'notes', log.notes,
            'metadata', log.metadata,
            'createdAt', log.created_at
          )
          ORDER BY log.created_at DESC, log.id DESC
        )
        FROM task_activity_log log
        JOIN profile actor ON actor.id = log.actor_profile_id
        WHERE log.task_assignment_id = ta.id
          OR (log.task_assignment_id IS NULL AND log.task_id = t.id)
      ),
      '[]'::json
    ) AS activity_logs,
    ta.created_at,
    ta.updated_at
  FROM task_assignment ta
  JOIN task t ON t.id = ta.task_id
  JOIN profile creator ON creator.id = t.created_by_profile_id
  JOIN profile assignee ON assignee.id = ta.assigned_to_profile_id
  LEFT JOIN profile reviewer ON reviewer.id = ta.reviewed_by_profile_id
  LEFT JOIN profile blocker_reporter ON blocker_reporter.id = ta.blocker_reported_by_profile_id
  LEFT JOIN profile blocker_confirmer ON blocker_confirmer.id = ta.blocker_confirmed_by_profile_id
`;

function mapAssignment(row: AssignmentRow): TaskAssignmentRecord {
  return {
    assignmentId: row.assignment_id,
    taskId: row.task_id,
    title: row.title,
    description: row.description,
    taskType: row.task_type,
    priority: row.priority,
    dueDate: row.due_date?.toISOString() ?? null,
    createdByProfileId: row.created_by_profile_id,
    createdByName: row.created_by_name,
    assignedToProfileId: row.assigned_to_profile_id,
    assignedToName: row.assigned_to_name,
    assigneeBrands: row.assignee_brands ?? [],
    status: row.status,
    proofType: row.proof_type,
    proofUrl: row.proof_url,
    proofNote: row.proof_note,
    submittedAt: row.submitted_at?.toISOString() ?? null,
    completedAt: row.completed_at?.toISOString() ?? null,
    reviewedByProfileId: row.reviewed_by_profile_id,
    reviewedByName: row.reviewed_by_name,
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    revisionNote: row.revision_note,
    blockerNote: row.blocker_note,
    blockerReportedAt: row.blocker_reported_at?.toISOString() ?? null,
    blockerReportedByProfileId: row.blocker_reported_by_profile_id,
    blockerReportedByName: row.blocker_reported_by_name,
    blockerConfirmedAt: row.blocker_confirmed_at?.toISOString() ?? null,
    blockerConfirmedByProfileId: row.blocker_confirmed_by_profile_id,
    blockerConfirmedByName: row.blocker_confirmed_by_name,
    blockerResolutionNote: row.blocker_resolution_note,
    activityLogs: (row.activity_logs ?? []).map((log) => ({
      ...log,
      createdAt: new Date(log.createdAt).toISOString(),
    })),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getTaskAssignmentById(assignmentId: number) {
  const result = await query<AssignmentRow>(
    `
    ${ASSIGNMENT_SELECT}
    WHERE ta.id = $1
    LIMIT 1
    `,
    [assignmentId],
  );

  const row = result.rows[0];
  return row ? mapAssignment(row) : null;
}

export async function getTaskAssignmentsForViewer({
  profileId,
  canViewAll,
}: {
  profileId: number;
  canViewAll: boolean;
}) {
  const result = await query<AssignmentRow>(
    `
    ${ASSIGNMENT_SELECT}
    WHERE
      ${
        canViewAll
          ? "t.task_type = 'GRADED'"
          : "(ta.assigned_to_profile_id = $1 OR t.created_by_profile_id = $1)"
      }
    ORDER BY
      CASE ta.status
        WHEN 'ASSIGNED' THEN 1
        WHEN 'BLOCKER' THEN 2
        WHEN 'PENDING' THEN 3
        WHEN 'REVISION' THEN 4
        WHEN 'DONE' THEN 5
      END,
      t.due_date ASC NULLS LAST,
      ta.updated_at DESC,
      ta.id DESC
    `,
    canViewAll ? [] : [profileId],
  );

  return result.rows.map(mapAssignment);
}

export async function getTaskAssignmentsForEmployee(profileId: number) {
  const result = await query<AssignmentRow>(
    `
    ${ASSIGNMENT_SELECT}
    WHERE ta.assigned_to_profile_id = $1
       OR t.created_by_profile_id = $1
    ORDER BY
      CASE ta.status
        WHEN 'ASSIGNED' THEN 1
        WHEN 'BLOCKER' THEN 2
        WHEN 'PENDING' THEN 3
        WHEN 'REVISION' THEN 4
        WHEN 'DONE' THEN 5
      END,
      t.due_date ASC NULLS LAST,
      ta.updated_at DESC,
      ta.id DESC
    `,
    [profileId],
  );

  return result.rows.map(mapAssignment);
}

export async function getAssignableProfilesWithBrands(options?: {
  viewerProfileId?: number;
  viewerAccountType?: AccountType;
}) {
  const includeSupervisorFullStack =
    options?.viewerAccountType === "SUPERVISOR" &&
    options.viewerProfileId != null;
  const result = await query<{
    id: number;
    full_name: string;
    email: string;
    account_type: AccountType;
    status: ProfileStatus;
    brands: AssigneeBrandAccess[] | null;
  }>(
    `
    SELECT
      p.id,
      p.full_name,
      p.email,
      p.account_type,
      p.status,
      COALESCE(
        json_agg(
          json_build_object(
            'brandId', b.id,
            'brandName', b.name,
            'isPrimary', uba.is_primary
          )
          ORDER BY uba.is_primary DESC, b.name ASC
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'::json
      ) AS brands
    FROM profile p
    LEFT JOIN user_brand_access uba
      ON uba.profile_id = p.id
      AND uba.is_active = true
    LEFT JOIN brand b ON b.id = uba.brand_id AND b.is_active = true
    WHERE p.status = 'ACTIVE'
      AND (
        p.account_type IN ('CLIENT', 'EMPLOYEE')
        OR (
          $1::boolean = true
          AND p.account_type = 'FULL_STACK_DEVELOPER'
          AND EXISTS (
            SELECT 1
            FROM user_brand_access assignee_access
            JOIN role assignee_role ON assignee_role.id = assignee_access.role_id
            WHERE assignee_access.profile_id = p.id
              AND assignee_access.is_active = true
              AND assignee_role.slug = 'full-stack-developer'
          )
        )
      )
    GROUP BY p.id
    ORDER BY p.full_name ASC, p.id ASC
    `,
    [includeSupervisorFullStack],
  );

  return Promise.all(
    result.rows.map(async (row) => {
      const hasAllBrandsAccess = await profileHasAllBrandsAccess(row.id);
      const effectiveBrands = await getEffectiveBrandAccessForProfile(row.id);

      return {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        accountType: row.account_type,
        status: row.status,
        hasAllBrandsAccess,
        brands: effectiveBrands.map((brand) => ({
          brandId: brand.brandId,
          brandName: brand.brandName,
          isPrimary: brand.isPrimary,
        })),
      };
    }),
  );
}

export async function getGradedAssignmentPerformanceCounts(profileId: number) {
  const result = await query<{
    status: TaskAssignmentStatus;
    priority: TaskPriority | null;
    due_date: Date | null;
    completed_at: Date | null;
  }>(
    `
    SELECT
      ta.status,
      t.priority,
      t.due_date,
      ta.completed_at
    FROM task_assignment ta
    JOIN task t ON t.id = ta.task_id
    WHERE t.task_type = 'GRADED'
      AND ta.assigned_to_profile_id = $1
    `,
    [profileId],
  );

  const metrics = countGradedAssignmentMetrics(
    result.rows.map((row) => ({
      status: row.status,
      priority: row.priority,
      dueDate: row.due_date?.toISOString() ?? null,
      completedAt: row.completed_at?.toISOString() ?? null,
    })),
  );

  return buildTaskPerformanceCounts({
    totalAssignedTasks: metrics.total,
    completedOnTimeTasks: metrics.completedOnTime,
    completedLateTasks: metrics.completedLate,
    completedTaskPriorityPoints: metrics.completedTaskPriorityPoints,
  });
}

export async function getEmployeeTaskPerformance(
  profileId: number,
): Promise<TaskPerformanceCounts & TaskPerformanceResult> {
  const counts = await getGradedAssignmentPerformanceCounts(profileId);
  const performance = calculateTaskPerformancePoints(counts);

  return {
    ...counts,
    ...performance,
  };
}

export async function getEmployeeActionableTaskCount(profileId: number) {
  const result = await query<{ count: number }>(
    `
    SELECT COUNT(*)::int AS count
    FROM task_assignment
    WHERE assigned_to_profile_id = $1
      AND status IN ('ASSIGNED', 'REVISION', 'BLOCKER')
    `,
    [profileId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function getStaffAccountabilitySummaries() {
  const data = await getStaffAccountabilityData();

  return data.summaries;
}

function getPerformanceLabel(completionRate: number) {
  if (completionRate >= 90) {
    return "Excellent";
  }

  if (completionRate >= 75) {
    return "Good";
  }

  if (completionRate >= 50) {
    return "Needs Review";
  }

  return "Critical";
}

function sortStaffAccountabilitySummaries(
  summaries: Omit<StaffAccountabilitySummary, "rank">[],
) {
  return [...summaries].sort((left, right) => {
    if (right.taskPoints !== left.taskPoints) {
      return right.taskPoints - left.taskPoints;
    }

    if (right.completionRate !== left.completionRate) {
      return right.completionRate - left.completionRate;
    }

    if (right.completedTasks !== left.completedTasks) {
      return right.completedTasks - left.completedTasks;
    }

    return left.fullName.localeCompare(right.fullName);
  });
}

const STAFF_ACCOUNTABILITY_DERIVED_BRAND_SQL = `
  (
    SELECT uba.brand_id
    FROM user_brand_access uba
    WHERE uba.profile_id = ta.assigned_to_profile_id
      AND uba.is_active = true
    ORDER BY uba.is_primary DESC, uba.brand_id ASC
    LIMIT 1
  )
`;

export async function getStaffAccountabilityData({
  startDate = null,
  endDate = null,
  brandId = null,
  employeeId = null,
}: StaffAccountabilityFilterInput = {}): Promise<StaffAccountabilityData> {
  const employeeParams = [brandId, employeeId] as const;
  const assignmentParams = [startDate, endDate, brandId, employeeId] as const;

  const [employees, assignments, brandRows, brandTaskRows, brandApprovalRows] =
    await Promise.all([
      query<StaffAccountabilityEmployeeRow>(
        `
      SELECT
        p.id,
        p.full_name,
        p.email,
        p.account_type,
        COALESCE(
          json_agg(
            json_build_object(
              'brandId', b.id,
              'brandName', b.name,
              'isPrimary', uba.is_primary
            )
            ORDER BY uba.is_primary DESC, b.name ASC
          ) FILTER (WHERE b.id IS NOT NULL),
          '[]'::json
        ) AS brands
      FROM profile p
      LEFT JOIN user_brand_access uba
        ON uba.profile_id = p.id
        AND uba.is_active = true
      LEFT JOIN brand b ON b.id = uba.brand_id AND b.is_active = true
      WHERE p.status = 'ACTIVE'
        AND p.account_type IN ('CLIENT', 'EMPLOYEE')
        AND ($1::integer IS NULL OR EXISTS (
          SELECT 1
          FROM user_brand_access brand_filter
          WHERE brand_filter.profile_id = p.id
            AND brand_filter.brand_id = $1::integer
            AND brand_filter.is_active = true
        ))
        AND ($2::integer IS NULL OR p.id = $2::integer)
      GROUP BY p.id
      ORDER BY p.full_name ASC, p.id ASC
      `,
        [...employeeParams],
      ),
      query<StaffAccountabilityAssignmentRow>(
        `
      SELECT
        ta.assigned_to_profile_id AS profile_id,
        ta.status,
        t.priority,
        t.due_date,
        ta.completed_at
      FROM task_assignment ta
      JOIN task t ON t.id = ta.task_id
      JOIN profile assignee ON assignee.id = ta.assigned_to_profile_id
      WHERE t.task_type = 'GRADED'
        AND assignee.status = 'ACTIVE'
        AND assignee.account_type IN ('CLIENT', 'EMPLOYEE')
        AND (
          $1::timestamptz IS NULL
          OR (
            (t.due_date >= $1::timestamptz AND t.due_date < $2::timestamptz)
            OR (ta.completed_at >= $1::timestamptz AND ta.completed_at < $2::timestamptz)
            OR (ta.updated_at >= $1::timestamptz AND ta.updated_at < $2::timestamptz)
            OR (t.created_at >= $1::timestamptz AND t.created_at < $2::timestamptz)
          )
        )
        AND ($3::integer IS NULL OR EXISTS (
          SELECT 1
          FROM user_brand_access uba
          WHERE uba.profile_id = ta.assigned_to_profile_id
            AND uba.brand_id = $3::integer
            AND uba.is_active = true
        ))
        AND ($4::integer IS NULL OR ta.assigned_to_profile_id = $4::integer)
      `,
        [...assignmentParams],
      ),
      query<StaffAccountabilityBrandRow>(
        `
      SELECT id AS brand_id, name AS brand_name
      FROM brand
      WHERE is_active = true
        AND ($1::integer IS NULL OR id = $1::integer)
      ORDER BY name ASC, id ASC
      `,
        [brandId],
      ),
      query<StaffAccountabilityBrandTaskRow>(
        `
      SELECT
        derived_brand.id AS brand_id,
        derived_brand.name AS brand_name,
        ta.status
      FROM task_assignment ta
      JOIN task t ON t.id = ta.task_id
      JOIN profile assignee ON assignee.id = ta.assigned_to_profile_id
      JOIN brand derived_brand
        ON derived_brand.id = ${STAFF_ACCOUNTABILITY_DERIVED_BRAND_SQL}
        AND derived_brand.is_active = true
      WHERE t.task_type = 'GRADED'
        AND assignee.status = 'ACTIVE'
        AND assignee.account_type IN ('CLIENT', 'EMPLOYEE')
        AND (
          $1::timestamptz IS NULL
          OR (
            (t.due_date >= $1::timestamptz AND t.due_date < $2::timestamptz)
            OR (ta.completed_at >= $1::timestamptz AND ta.completed_at < $2::timestamptz)
            OR (ta.updated_at >= $1::timestamptz AND ta.updated_at < $2::timestamptz)
            OR (t.created_at >= $1::timestamptz AND t.created_at < $2::timestamptz)
          )
        )
        AND ($3::integer IS NULL OR derived_brand.id = $3::integer)
        AND ($4::integer IS NULL OR ta.assigned_to_profile_id = $4::integer)
      `,
        [...assignmentParams],
      ),
      query<StaffAccountabilityBrandApprovalRow>(
        `
      SELECT
        b.id AS brand_id,
        b.name AS brand_name,
        cr.supervisor_status,
        cr.director_status,
        cr.publish_status
      FROM content_report cr
      JOIN profile submitter ON submitter.id = cr.submitted_by_profile_id
      JOIN brand b ON b.id = cr.brand_id AND b.is_active = true
      WHERE submitter.status = 'ACTIVE'
        AND submitter.account_type IN ('CLIENT', 'EMPLOYEE')
        AND (
          $1::timestamptz IS NULL
          OR (
            (cr.date_submitted >= $1::timestamptz AND cr.date_submitted < $2::timestamptz)
            OR (cr.updated_at >= $1::timestamptz AND cr.updated_at < $2::timestamptz)
          )
        )
        AND ($3::integer IS NULL OR cr.brand_id = $3::integer)
        AND ($4::integer IS NULL OR cr.submitted_by_profile_id = $4::integer)
      `,
        [...assignmentParams],
      ),
    ]);

  const assignmentsByProfile = new Map<
    number,
    StaffAccountabilityAssignmentRow[]
  >();

  for (const assignment of assignments.rows) {
    const existing = assignmentsByProfile.get(assignment.profile_id) ?? [];
    existing.push(assignment);
    assignmentsByProfile.set(assignment.profile_id, existing);
  }

  const sortedSummaries = sortStaffAccountabilitySummaries(
    employees.rows.map((employee) => {
      const employeeAssignments = assignmentsByProfile.get(employee.id) ?? [];
      const metrics = countGradedAssignmentMetrics(
        employeeAssignments.map((assignment) => ({
          status: assignment.status,
          priority: assignment.priority,
          dueDate: assignment.due_date?.toISOString() ?? null,
          completedAt: assignment.completed_at?.toISOString() ?? null,
        })),
      );
      const assignedStatusTasks = employeeAssignments.filter(
        (assignment) => assignment.status === "ASSIGNED",
      ).length;
      const pendingStatusTasks = employeeAssignments.filter(
        (assignment) => assignment.status === "PENDING",
      ).length;

      return {
        profileId: employee.id,
        fullName: employee.full_name,
        email: employee.email,
        accountType: employee.account_type,
        brands: employee.brands ?? [],
        totalAssignedTasks: metrics.total,
        completedTasks: metrics.done,
        pendingTasks: pendingStatusTasks,
        revisionTasks: metrics.revisions,
        blockerTasks: metrics.blockers,
        assignedStatusTasks,
        completedOnTimeTasks: metrics.completedOnTime,
        completedLateTasks: metrics.completedLate,
        notCompletedTasks: Math.max(0, metrics.total - metrics.done),
        completionRate: metrics.completionRate,
        adjustedCompletionRate: metrics.adjustedCompletionRate,
        taskPoints: metrics.taskPoints,
        performanceLabel: getPerformanceLabel(metrics.completionRate),
      };
    }),
  );

  const summaries = sortedSummaries.map((summary, index) => ({
    ...summary,
    rank: index + 1,
  }));

  const teamSummary = summaries.reduce<StaffAccountabilityTeamSummary>(
    (summary, employee) => ({
      averageTeamCompletion: 0,
      totalAssignedTasks:
        summary.totalAssignedTasks + employee.totalAssignedTasks,
      totalCompletedTasks:
        summary.totalCompletedTasks + employee.completedTasks,
      totalPendingTasks: summary.totalPendingTasks + employee.pendingTasks,
      totalRevisionTasks: summary.totalRevisionTasks + employee.revisionTasks,
      totalBlockerTasks: summary.totalBlockerTasks + employee.blockerTasks,
      teamCompletionRate: 0,
      totalTeamPoints: summary.totalTeamPoints + employee.taskPoints,
      needsAttentionCount:
        summary.needsAttentionCount +
        employee.pendingTasks +
        employee.revisionTasks +
        employee.blockerTasks,
    }),
    {
      averageTeamCompletion: 0,
      totalAssignedTasks: 0,
      totalCompletedTasks: 0,
      totalPendingTasks: 0,
      totalRevisionTasks: 0,
      totalBlockerTasks: 0,
      teamCompletionRate: 0,
      totalTeamPoints: 0,
      needsAttentionCount: 0,
    },
  );

  teamSummary.teamCompletionRate =
    teamSummary.totalAssignedTasks > 0
      ? Math.round(
          (teamSummary.totalCompletedTasks / teamSummary.totalAssignedTasks) *
            10000,
        ) / 100
      : 0;

  teamSummary.averageTeamCompletion =
    summaries.length > 0
      ? Math.round(
          (summaries.reduce(
            (total, employee) => total + employee.completionRate,
            0,
          ) /
            summaries.length) *
            100,
        ) / 100
      : 0;

  const brandSummaryMap = new Map<number, StaffAccountabilityBrandSummary>();

  for (const brand of brandRows.rows) {
    brandSummaryMap.set(brand.brand_id, {
      brandId: brand.brand_id,
      brandName: brand.brand_name,
      totalAssignedTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      revisionTasks: 0,
      blockerTasks: 0,
      taskCompletionRate: 0,
      totalApprovals: 0,
      pendingApprovals: 0,
      approvedApprovals: 0,
      revisionApprovals: 0,
      rejectedApprovals: 0,
      scheduledPublishedApprovals: 0,
    });
  }

  for (const row of brandTaskRows.rows) {
    const summary = brandSummaryMap.get(row.brand_id);

    if (!summary) {
      continue;
    }

    summary.totalAssignedTasks += 1;

    if (row.status === "DONE") {
      summary.completedTasks += 1;
    } else if (row.status === "PENDING") {
      summary.pendingTasks += 1;
    } else if (row.status === "REVISION") {
      summary.revisionTasks += 1;
    } else if (row.status === "BLOCKER") {
      summary.blockerTasks += 1;
    }
  }

  for (const row of brandApprovalRows.rows) {
    const summary = brandSummaryMap.get(row.brand_id);

    if (!summary) {
      continue;
    }

    summary.totalApprovals += 1;

    if (
      row.supervisor_status === "Rejected" ||
      row.director_status === "Rejected"
    ) {
      summary.rejectedApprovals += 1;
    } else if (
      row.supervisor_status === "Revision" ||
      row.director_status === "Revision"
    ) {
      summary.revisionApprovals += 1;
    } else if (
      row.supervisor_status === "Approved" &&
      row.director_status === "Approved"
    ) {
      summary.approvedApprovals += 1;
    } else {
      summary.pendingApprovals += 1;
    }

    if (
      row.publish_status === "Scheduled" ||
      row.publish_status === "Published"
    ) {
      summary.scheduledPublishedApprovals += 1;
    }
  }

  const brandSummaries = [...brandSummaryMap.values()]
    .map((summary) => ({
      ...summary,
      taskCompletionRate:
        summary.totalAssignedTasks > 0
          ? Math.round(
              (summary.completedTasks / summary.totalAssignedTasks) * 10000,
            ) / 100
          : 0,
    }))
    .sort((left, right) => left.brandName.localeCompare(right.brandName));

  return {
    summaries,
    teamSummary,
    brandSummaries,
    statusDistribution: {
      assigned: summaries.reduce(
        (total, employee) => total + employee.assignedStatusTasks,
        0,
      ),
      completed: teamSummary.totalCompletedTasks,
      pending: teamSummary.totalPendingTasks,
      revision: teamSummary.totalRevisionTasks,
      blocker: teamSummary.totalBlockerTasks,
    },
  };
}
