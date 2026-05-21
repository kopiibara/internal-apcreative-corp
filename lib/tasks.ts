import "server-only"

import { query } from "@/lib/db"
import {
  buildTaskPerformanceCounts,
  calculateTaskPerformancePoints,
  type TaskPerformanceCounts,
  type TaskPerformanceResult,
} from "@/lib/performance-scoring"
import type {
  TaskPriority,
  TaskProofType,
  TaskType,
} from "@/lib/task-type"
import type { TaskAssignmentStatus } from "@/lib/task-statuses"
import type { AccountType, ProfileStatus } from "@/lib/auth-session"

export type AssigneeBrandAccess = {
  brandId: number
  brandName: string
  isPrimary: boolean
}

export type AssignableProfile = {
  id: number
  fullName: string
  email: string
  accountType: AccountType
  status: ProfileStatus
  brands: AssigneeBrandAccess[]
}

export type TaskAssignmentRecord = {
  assignmentId: number
  taskId: number
  title: string
  description: string | null
  taskType: TaskType
  priority: TaskPriority | null
  dueDate: string | null
  createdByProfileId: number
  createdByName: string
  assignedToProfileId: number
  assignedToName: string
  assigneeBrands: AssigneeBrandAccess[]
  status: TaskAssignmentStatus
  proofType: TaskProofType | null
  proofUrl: string | null
  proofNote: string | null
  submittedAt: string | null
  completedAt: string | null
  reviewedByProfileId: number | null
  reviewedByName: string | null
  reviewedAt: string | null
  revisionNote: string | null
  blockerNote: string | null
  blockerReportedAt: string | null
  blockerReportedByProfileId: number | null
  blockerReportedByName: string | null
  blockerConfirmedAt: string | null
  blockerConfirmedByProfileId: number | null
  blockerConfirmedByName: string | null
  blockerResolutionNote: string | null
  activityLogs: TaskActivityLogRecord[]
  createdAt: string
  updatedAt: string
}

export type TaskActivityLogRecord = {
  id: number
  taskId: number
  taskAssignmentId: number | null
  actorProfileId: number
  actorName: string
  action: string
  fromStatus: TaskAssignmentStatus | null
  toStatus: TaskAssignmentStatus | null
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

type AssignmentRow = {
  assignment_id: number
  task_id: number
  title: string
  description: string | null
  task_type: TaskType
  priority: TaskPriority | null
  due_date: Date | null
  created_by_profile_id: number
  created_by_name: string
  assigned_to_profile_id: number
  assigned_to_name: string
  assignee_brands: AssigneeBrandAccess[] | null
  status: TaskAssignmentStatus
  proof_type: TaskProofType | null
  proof_url: string | null
  proof_note: string | null
  submitted_at: Date | null
  completed_at: Date | null
  reviewed_by_profile_id: number | null
  reviewed_by_name: string | null
  reviewed_at: Date | null
  revision_note: string | null
  blocker_note: string | null
  blocker_reported_at: Date | null
  blocker_reported_by_profile_id: number | null
  blocker_reported_by_name: string | null
  blocker_confirmed_at: Date | null
  blocker_confirmed_by_profile_id: number | null
  blocker_confirmed_by_name: string | null
  blocker_resolution_note: string | null
  activity_logs: ActivityLogJsonRow[] | null
  created_at: Date
  updated_at: Date
}

type ActivityLogJsonRow = {
  id: number
  taskId: number
  taskAssignmentId: number | null
  actorProfileId: number
  actorName: string
  action: string
  fromStatus: TaskAssignmentStatus | null
  toStatus: TaskAssignmentStatus | null
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

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
`

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
  }
}

export async function getTaskAssignmentById(assignmentId: number) {
  const result = await query<AssignmentRow>(
    `
    ${ASSIGNMENT_SELECT}
    WHERE ta.id = $1
    LIMIT 1
    `,
    [assignmentId]
  )

  const row = result.rows[0]
  return row ? mapAssignment(row) : null
}

export async function getTaskAssignmentsForViewer({
  profileId,
  canViewAll,
}: {
  profileId: number
  canViewAll: boolean
}) {
  const result = await query<AssignmentRow>(
    `
    ${ASSIGNMENT_SELECT}
    WHERE
      ${
        canViewAll
          ? "TRUE"
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
    canViewAll ? [] : [profileId]
  )

  return result.rows.map(mapAssignment)
}

export async function getTaskAssignmentsForEmployee(profileId: number) {
  const result = await query<AssignmentRow>(
    `
    ${ASSIGNMENT_SELECT}
    WHERE ta.assigned_to_profile_id = $1
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
    [profileId]
  )

  return result.rows.map(mapAssignment)
}

export async function getAssignableProfilesWithBrands() {
  const result = await query<{
    id: number
    full_name: string
    email: string
    account_type: AccountType
    status: ProfileStatus
    brands: AssigneeBrandAccess[] | null
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
      AND p.account_type IN ('CLIENT', 'EMPLOYEE')
    GROUP BY p.id
    ORDER BY p.full_name ASC, p.id ASC
    `
  )

  return result.rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    accountType: row.account_type,
    status: row.status,
    brands: row.brands ?? [],
  }))
}

export async function getGradedAssignmentPerformanceCounts(profileId: number) {
  const result = await query<{
    total_assigned_tasks: number
    completed_on_time_tasks: number
    completed_late_tasks: number
  }>(
    `
    SELECT
      COUNT(*)::int AS total_assigned_tasks,
      COUNT(*) FILTER (
        WHERE
          ta.status = 'DONE'
          AND t.due_date IS NOT NULL
          AND ta.completed_at IS NOT NULL
          AND ta.completed_at <= t.due_date
      )::int AS completed_on_time_tasks,
      COUNT(*) FILTER (
        WHERE
          ta.status = 'DONE'
          AND t.due_date IS NOT NULL
          AND ta.completed_at IS NOT NULL
          AND ta.completed_at > t.due_date
      )::int AS completed_late_tasks
    FROM task_assignment ta
    JOIN task t ON t.id = ta.task_id
    WHERE t.task_type = 'GRADED'
      AND ta.assigned_to_profile_id = $1
    `,
    [profileId]
  )

  const row = result.rows[0]

  return buildTaskPerformanceCounts({
    totalAssignedTasks: Number(row?.total_assigned_tasks ?? 0),
    completedOnTimeTasks: Number(row?.completed_on_time_tasks ?? 0),
    completedLateTasks: Number(row?.completed_late_tasks ?? 0),
  })
}

export async function getEmployeeTaskPerformance(
  profileId: number
): Promise<TaskPerformanceCounts & TaskPerformanceResult> {
  const counts = await getGradedAssignmentPerformanceCounts(profileId)
  const performance = calculateTaskPerformancePoints(counts)

  return {
    ...counts,
    ...performance,
  }
}

export async function getEmployeeActionableTaskCount(profileId: number) {
  const result = await query<{ count: number }>(
    `
    SELECT COUNT(*)::int AS count
    FROM task_assignment
    WHERE assigned_to_profile_id = $1
      AND status IN ('ASSIGNED', 'REVISION', 'BLOCKER')
    `,
    [profileId]
  )

  return Number(result.rows[0]?.count ?? 0)
}

export async function getStaffAccountabilitySummaries() {
  const profiles = await query<{
    id: number
    full_name: string
    email: string
    account_type: AccountType
  }>(
    `
    SELECT id, full_name, email, account_type
    FROM profile
    WHERE status = 'ACTIVE'
      AND account_type IN ('CLIENT', 'EMPLOYEE')
    ORDER BY full_name ASC, id ASC
    `
  )

  const summaries = await Promise.all(
    profiles.rows.map(async (profile) => {
      const performance = await getEmployeeTaskPerformance(profile.id)

      return {
        profileId: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        accountType: profile.account_type,
        ...performance,
      }
    })
  )

  return summaries
}
