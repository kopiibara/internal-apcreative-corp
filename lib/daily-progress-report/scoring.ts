import "server-only";

import { query } from "@/lib/db";
import {
  formatDateKeyInPhilippines,
  PHILIPPINE_TIMEZONE,
} from "@/lib/daily-reports/daily-report-filters";

export type DailyProgressStatus = "Submitted" | "Late" | "Missed" | "Excused";
export type DailyProgressLateApprovalStatus =
  | "Pending"
  | "Approved"
  | "Rejected";

export const DAILY_PROGRESS_POINTS = {
  SUBMITTED: 10,
  LATE_APPROVED: 5,
  MISSED: -2,
  EXCUSED: 0,
  PENDING_LATE_APPROVAL: 0,
} as const;

export type DailyProgressPointResult = {
  pointsAwarded: number;
  deductionApplied: number;
};

type HolidayRow = {
  name: string;
};

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PHILIPPINE_TIMEZONE,
  weekday: "short",
});

export function getDailyProgressNetPoints(report: {
  points_awarded?: number;
  deduction_applied?: number;
  pointsAwarded?: number;
  deductionApplied?: number;
}) {
  return (
    (report.points_awarded ?? report.pointsAwarded ?? 0) -
    (report.deduction_applied ?? report.deductionApplied ?? 0)
  );
}

export function isWeekendPH(date: Date) {
  const weekday = weekdayFormatter.format(date);

  return weekday === "Sat" || weekday === "Sun";
}

export async function getActiveHoliday(dateKey: string) {
  const result = await query<HolidayRow>(
    `
    SELECT name
    FROM holiday_calendar
    WHERE holiday_date = $1::date
      AND is_active = true
    LIMIT 1
    `,
    [dateKey],
  );

  return result.rows[0] ?? null;
}

export async function isHoliday(date: Date | string) {
  const dateKey =
    typeof date === "string" ? date : formatDateKeyInPhilippines(date);
  const holiday = await getActiveHoliday(dateKey);

  return Boolean(holiday);
}

export async function isEmployeeOnApprovedLeave(
  profileId: number,
  date: Date | string,
) {
  const dateKey =
    typeof date === "string" ? date : formatDateKeyInPhilippines(date);
  const result = await query<{ on_leave: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM employee_leave
      WHERE profile_id = $1
        AND status = 'Approved'
        AND $2::date BETWEEN start_date AND end_date
    ) AS on_leave
    `,
    [profileId, dateKey],
  );

  return Boolean(result.rows[0]?.on_leave);
}

export async function getDailyProgressExcuseReason(
  profileId: number,
  dateKey: string,
) {
  const holiday = await getActiveHoliday(dateKey);

  if (holiday) {
    return `Holiday: ${holiday.name}`;
  }

  if (await isEmployeeOnApprovedLeave(profileId, dateKey)) {
    return "Approved Leave";
  }

  return null;
}

export async function isValidWorkingDay(profileId: number, date: Date | string) {
  const dateKey =
    typeof date === "string" ? date : formatDateKeyInPhilippines(date);
  const parsedDate = new Date(`${dateKey}T12:00:00+08:00`);

  if (isWeekendPH(parsedDate)) {
    return false;
  }

  const excuseReason = await getDailyProgressExcuseReason(profileId, dateKey);

  return !excuseReason;
}

export function calculateDailyProgressPoints(
  status: DailyProgressStatus,
  lateApprovalStatus?: DailyProgressLateApprovalStatus | null,
): DailyProgressPointResult {
  if (status === "Submitted") {
    return { pointsAwarded: DAILY_PROGRESS_POINTS.SUBMITTED, deductionApplied: 0 };
  }

  if (status === "Late" && lateApprovalStatus === "Approved") {
    return {
      pointsAwarded: DAILY_PROGRESS_POINTS.LATE_APPROVED,
      deductionApplied: 0,
    };
  }

  if (status === "Late" && lateApprovalStatus === "Pending") {
    return {
      pointsAwarded: DAILY_PROGRESS_POINTS.PENDING_LATE_APPROVAL,
      deductionApplied: 0,
    };
  }

  if (status === "Excused") {
    return { pointsAwarded: DAILY_PROGRESS_POINTS.EXCUSED, deductionApplied: 0 };
  }

  return {
    pointsAwarded: 0,
    deductionApplied: Math.abs(DAILY_PROGRESS_POINTS.MISSED),
  };
}
