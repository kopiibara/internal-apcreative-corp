import "server-only";

import type { PoolClient } from "pg";

import { query, transaction } from "@/lib/db";
import {
  clampDailyProgressStartDate,
  isBeforeDailyProgressScoringStart,
} from "@/lib/daily-progress-report/constants";
import {
  calculateDailyProgressPoints,
  getDailyProgressExcuseReason,
  getDailyProgressNetPoints,
  isWeekendPH,
  type DailyProgressLateApprovalStatus,
  type DailyProgressStatus,
} from "@/lib/daily-progress-report/scoring";
import {
  formatDateKeyInPhilippines,
  getPhilippineDayBounds,
} from "@/lib/daily-reports/daily-report-filters";

export type DailyProgressBrandOption = {
  id: number;
  name: string;
  isPrimary: boolean;
};

export type DailyProgressReportRecord = {
  id: number;
  profileId: number;
  employeeName: string;
  employeeEmail: string;
  employeeImageUrl: string | null;
  brandId: number | null;
  brandName: string | null;
  reportDate: string;
  summary: string | null;
  blockers: string | null;
  proofLink: string | null;
  submittedAt: string | null;
  status: DailyProgressStatus;
  pointsAwarded: number;
  deductionApplied: number;
  netPoints: number;
  excusedReason: string | null;
  lateReason: string | null;
  lateApprovalStatus: DailyProgressLateApprovalStatus | null;
  lateRequestedAt: string | null;
  lateReviewedByProfileId: number | null;
  lateReviewedByName: string | null;
  lateReviewedAt: string | null;
  lateReviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DailyProgressSummary = {
  requiredEmployees: number;
  submittedCount: number;
  latePendingCount: number;
  lateApprovedCount: number;
  lateRejectedCount: number;
  missedCount: number;
  excusedCount: number;
  totalPointsAwarded: number;
  totalDeductions: number;
  netPoints: number;
};

export type DailyProgressAdminFilters = {
  startDate: string;
  endDate: string;
  brandId?: number | null;
  employeeId?: number | null;
  status?: string | null;
  lateApprovalStatus?: string | null;
};

type DailyProgressReportRow = {
  id: number;
  profile_id: number;
  employee_name: string;
  employee_email: string;
  employee_image_url: string | null;
  brand_id: number | null;
  brand_name: string | null;
  report_date: Date;
  summary: string | null;
  blockers: string | null;
  proof_link: string | null;
  submitted_at: Date | null;
  status: DailyProgressStatus;
  points_awarded: number;
  deduction_applied: number;
  excused_reason: string | null;
  late_reason: string | null;
  late_approval_status: DailyProgressLateApprovalStatus | null;
  late_requested_at: Date | null;
  late_reviewed_by_profile_id: number | null;
  late_reviewed_by_name: string | null;
  late_reviewed_at: Date | null;
  late_review_notes: string | null;
  created_at: Date;
  updated_at: Date;
};

type DailyProgressAggregateRow = {
  submitted_count: number;
  late_pending_count: number;
  late_approved_count: number;
  late_rejected_count: number;
  missed_count: number;
  excused_count: number;
  total_points_awarded: number;
  total_deductions: number;
};

export function toDateKey(value: Date | string) {
  if (typeof value === "string") {
    return value;
  }

  return formatDateKeyInPhilippines(value);
}

export function getYesterdayDateKeyInPhilippines(now = new Date()) {
  const today = formatDateKeyInPhilippines(now);
  const yesterday = new Date(`${today}T12:00:00+08:00`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  return formatDateKeyInPhilippines(yesterday);
}

export function getPreviousDateKeyInPhilippines(daysBack: number, now = new Date()) {
  const today = formatDateKeyInPhilippines(now);
  const date = new Date(`${today}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() - daysBack);

  return formatDateKeyInPhilippines(date);
}

function mapReportRow(row: DailyProgressReportRow): DailyProgressReportRecord {
  const points_awarded = Number(row.points_awarded ?? 0);
  const deduction_applied = Number(row.deduction_applied ?? 0);

  return {
    id: row.id,
    profileId: row.profile_id,
    employeeName: row.employee_name,
    employeeEmail: row.employee_email,
    employeeImageUrl: row.employee_image_url,
    brandId: row.brand_id,
    brandName: row.brand_name,
    reportDate: formatDateKeyInPhilippines(row.report_date),
    summary: row.summary,
    blockers: row.blockers,
    proofLink: row.proof_link,
    submittedAt: row.submitted_at?.toISOString() ?? null,
    status: row.status,
    pointsAwarded: points_awarded,
    deductionApplied: deduction_applied,
    netPoints: getDailyProgressNetPoints({ points_awarded, deduction_applied }),
    excusedReason: row.excused_reason,
    lateReason: row.late_reason,
    lateApprovalStatus: row.late_approval_status,
    lateRequestedAt: row.late_requested_at?.toISOString() ?? null,
    lateReviewedByProfileId: row.late_reviewed_by_profile_id,
    lateReviewedByName: row.late_reviewed_by_name,
    lateReviewedAt: row.late_reviewed_at?.toISOString() ?? null,
    lateReviewNotes: row.late_review_notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const REPORT_SELECT = `
  SELECT
    dpr.id,
    dpr.profile_id,
    p.full_name AS employee_name,
    p.email AS employee_email,
    u.image AS employee_image_url,
    dpr.brand_id,
    b.name AS brand_name,
    dpr.report_date,
    dpr.summary,
    dpr.blockers,
    dpr.proof_link,
    dpr.submitted_at,
    dpr.status,
    dpr.points_awarded,
    dpr.deduction_applied,
    dpr.excused_reason,
    dpr.late_reason,
    dpr.late_approval_status,
    dpr.late_requested_at,
    dpr.late_reviewed_by_profile_id,
    reviewer.full_name AS late_reviewed_by_name,
    dpr.late_reviewed_at,
    dpr.late_review_notes,
    dpr.created_at,
    dpr.updated_at
  FROM daily_progress_report dpr
  JOIN profile p ON p.id = dpr.profile_id
  JOIN "user" u ON u.id = p.auth_user_id
  LEFT JOIN brand b ON b.id = dpr.brand_id
  LEFT JOIN profile reviewer ON reviewer.id = dpr.late_reviewed_by_profile_id
`;

export async function getDailyProgressBrandOptions(profileId: number) {
  const result = await query<{
    id: number;
    name: string;
    is_primary: boolean;
  }>(
    `
    SELECT b.id, b.name, uba.is_primary
    FROM user_brand_access uba
    JOIN brand b ON b.id = uba.brand_id AND b.is_active = true
    WHERE uba.profile_id = $1
      AND uba.is_active = true
    ORDER BY uba.is_primary DESC, b.name ASC
    `,
    [profileId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    isPrimary: row.is_primary,
  }));
}

export async function getOwnDailyProgressPageData(profileId: number) {
  const todayDateKey = formatDateKeyInPhilippines(new Date());
  const yesterdayDateKey = getYesterdayDateKeyInPhilippines();
  const historyStartDateKey = clampDailyProgressStartDate(
    getPreviousDateKeyInPhilippines(13),
  );
  const [reports, brands] = await Promise.all([
    query<DailyProgressReportRow>(
      `
      ${REPORT_SELECT}
      WHERE dpr.profile_id = $1
        AND dpr.report_date >= $2::date
        AND dpr.report_date <= $3::date
      ORDER BY dpr.report_date DESC
      `,
      [profileId, historyStartDateKey, todayDateKey],
    ),
    getDailyProgressBrandOptions(profileId),
  ]);

  return {
    todayDateKey,
    yesterdayDateKey,
    historyStartDateKey,
    brands,
    reports: reports.rows.map(mapReportRow),
  };
}

export async function getDailyProgressReportById(reportId: number) {
  const result = await query<DailyProgressReportRow>(
    `
    ${REPORT_SELECT}
    WHERE dpr.id = $1
    LIMIT 1
    `,
    [reportId],
  );

  const row = result.rows[0];

  return row ? mapReportRow(row) : null;
}

export async function getAdminDailyProgressData(
  filters: DailyProgressAdminFilters,
) {
  const startDate = clampDailyProgressStartDate(filters.startDate);
  const endDate = clampDailyProgressStartDate(filters.endDate);
  const { start } = getPhilippineDayBounds(startDate);
  const { end } = getPhilippineDayBounds(endDate);
  const params = [
    startDate,
    endDate,
    filters.brandId ?? null,
    filters.employeeId ?? null,
    filters.status && filters.status !== "all" ? filters.status : null,
    filters.lateApprovalStatus && filters.lateApprovalStatus !== "all"
      ? filters.lateApprovalStatus
      : null,
  ];

  const [reports, aggregate, requiredEmployees] = await Promise.all([
    query<DailyProgressReportRow>(
      `
      ${REPORT_SELECT}
      WHERE dpr.report_date >= $1::date
        AND dpr.report_date <= $2::date
        AND ($3::integer IS NULL OR dpr.brand_id = $3::integer)
        AND ($4::integer IS NULL OR dpr.profile_id = $4::integer)
        AND ($5::text IS NULL OR dpr.status = $5::text)
        AND ($6::text IS NULL OR dpr.late_approval_status = $6::text)
      ORDER BY dpr.report_date DESC, dpr.updated_at DESC, dpr.id DESC
      `,
      params,
    ),
    query<DailyProgressAggregateRow>(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'Submitted')::int AS submitted_count,
        COUNT(*) FILTER (WHERE status = 'Late' AND late_approval_status = 'Pending')::int AS late_pending_count,
        COUNT(*) FILTER (WHERE status = 'Late' AND late_approval_status = 'Approved')::int AS late_approved_count,
        COUNT(*) FILTER (WHERE late_approval_status = 'Rejected')::int AS late_rejected_count,
        COUNT(*) FILTER (WHERE status = 'Missed')::int AS missed_count,
        COUNT(*) FILTER (WHERE status = 'Excused')::int AS excused_count,
        COALESCE(SUM(points_awarded), 0)::int AS total_points_awarded,
        COALESCE(SUM(deduction_applied), 0)::int AS total_deductions
      FROM daily_progress_report dpr
      WHERE dpr.report_date >= $1::date
        AND dpr.report_date <= $2::date
        AND ($3::integer IS NULL OR dpr.brand_id = $3::integer)
        AND ($4::integer IS NULL OR dpr.profile_id = $4::integer)
        AND ($5::text IS NULL OR dpr.status = $5::text)
        AND ($6::text IS NULL OR dpr.late_approval_status = $6::text)
      `,
      params,
    ),
    query<{ count: number }>(
      `
      SELECT COUNT(DISTINCT p.id)::int AS count
      FROM profile p
      WHERE p.status = 'ACTIVE'
        AND p.account_type IN ('CLIENT', 'EMPLOYEE', 'SUPERVISOR', 'FULL_STACK_DEVELOPER')
        AND ($1::integer IS NULL OR EXISTS (
          SELECT 1
          FROM user_brand_access uba
          WHERE uba.profile_id = p.id
            AND uba.brand_id = $1::integer
            AND uba.is_active = true
        ))
        AND ($2::integer IS NULL OR p.id = $2::integer)
      `,
      [filters.brandId ?? null, filters.employeeId ?? null],
    ),
  ]);

  const aggregateRow = aggregate.rows[0];
  const summary: DailyProgressSummary = {
    requiredEmployees: Number(requiredEmployees.rows[0]?.count ?? 0),
    submittedCount: Number(aggregateRow?.submitted_count ?? 0),
    latePendingCount: Number(aggregateRow?.late_pending_count ?? 0),
    lateApprovedCount: Number(aggregateRow?.late_approved_count ?? 0),
    lateRejectedCount: Number(aggregateRow?.late_rejected_count ?? 0),
    missedCount: Number(aggregateRow?.missed_count ?? 0),
    excusedCount: Number(aggregateRow?.excused_count ?? 0),
    totalPointsAwarded: Number(aggregateRow?.total_points_awarded ?? 0),
    totalDeductions: Number(aggregateRow?.total_deductions ?? 0),
    netPoints:
      Number(aggregateRow?.total_points_awarded ?? 0) -
      Number(aggregateRow?.total_deductions ?? 0),
  };

  return {
    reports: reports.rows.map(mapReportRow),
    summary,
    bounds: { start, end },
  };
}

export async function upsertMissedDailyProgressForDate({
  targetDateKey,
  actorProfileId,
}: {
  targetDateKey: string;
  actorProfileId?: number | null;
}) {
  if (isBeforeDailyProgressScoringStart(targetDateKey)) {
    return { createdMissed: 0, createdExcused: 0, skipped: 0 };
  }

  const parsedDate = new Date(`${targetDateKey}T12:00:00+08:00`);

  if (isWeekendPH(parsedDate)) {
    return { createdMissed: 0, createdExcused: 0, skipped: 0 };
  }

  const employees = await query<{ id: number }>(
    `
    SELECT id
    FROM profile
    WHERE status = 'ACTIVE'
      AND account_type IN ('CLIENT', 'EMPLOYEE', 'SUPERVISOR', 'FULL_STACK_DEVELOPER')
    ORDER BY id ASC
    `,
  );

  let createdMissed = 0;
  let createdExcused = 0;
  let skipped = 0;

  await transaction(async (client) => {
    for (const employee of employees.rows) {
      const existing = await client.query<{ id: number }>(
        `
        SELECT id
        FROM daily_progress_report
        WHERE profile_id = $1
          AND report_date = $2::date
        LIMIT 1
        `,
        [employee.id, targetDateKey],
      );

      if (existing.rows[0]) {
        skipped += 1;
        continue;
      }

      const excuseReason = await getDailyProgressExcuseReason(
        employee.id,
        targetDateKey,
      );
      const status = excuseReason ? "Excused" : "Missed";
      const points = calculateDailyProgressPoints(status);

      await insertDailyProgressSystemRecord(client, {
        profileId: employee.id,
        reportDate: targetDateKey,
        status,
        summary:
          status === "Missed" ? "No daily progress report submitted." : null,
        pointsAwarded: points.pointsAwarded,
        deductionApplied: points.deductionApplied,
        excusedReason: excuseReason,
        actorProfileId: actorProfileId ?? employee.id,
      });

      if (status === "Excused") {
        createdExcused += 1;
      } else {
        createdMissed += 1;
      }
    }
  });

  return { createdMissed, createdExcused, skipped };
}

async function insertDailyProgressSystemRecord(
  client: PoolClient,
  input: {
    profileId: number;
    reportDate: string;
    status: DailyProgressStatus;
    summary: string | null;
    pointsAwarded: number;
    deductionApplied: number;
    excusedReason: string | null;
    actorProfileId: number;
  },
) {
  await client.query(
    `
    INSERT INTO daily_progress_report (
      profile_id,
      report_date,
      summary,
      status,
      points_awarded,
      deduction_applied,
      excused_reason,
      created_by_profile_id,
      updated_by_profile_id
    )
    VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $8)
    ON CONFLICT (profile_id, report_date)
    DO NOTHING
    `,
    [
      input.profileId,
      input.reportDate,
      input.summary,
      input.status,
      input.pointsAwarded,
      input.deductionApplied,
      input.excusedReason,
      input.actorProfileId,
    ],
  );
}
