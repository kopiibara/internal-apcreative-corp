import {
  getPhilippineDayBounds,
  getTodayDateKeyInPhilippines,
} from "@/lib/daily-reports/daily-report-filters";

export type DashboardPeriod = "daily" | "weekly" | "monthly";

export function parseDashboardPeriod(
  value: string | undefined,
): DashboardPeriod {
  if (value === "weekly" || value === "monthly") {
    return value;
  }

  return "daily";
}

export function parseDashboardDateKey(
  value: string | undefined,
  fallback: string,
) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

export function parseDashboardMonth(
  value: string | undefined,
  fallback: string,
) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : fallback;
}

export function addDashboardDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMonthBounds(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const monthStartKey = `${year}-${String(monthIndex).padStart(2, "0")}-01`;
  const nextMonthYear = monthIndex === 12 ? year + 1 : year;
  const nextMonthIndex = monthIndex === 12 ? 1 : monthIndex + 1;
  const nextMonthStartKey = `${nextMonthYear}-${String(nextMonthIndex).padStart(
    2,
    "0",
  )}-01`;
  const { start: monthStart } = getPhilippineDayBounds(monthStartKey);
  const { start: monthEndExclusive } =
    getPhilippineDayBounds(nextMonthStartKey);

  return { monthStart, monthEndExclusive };
}

export function getDefaultDashboardWeekStart(todayKey: string) {
  const localNoon = new Date(`${todayKey}T12:00:00+08:00`);
  const dayIndex = localNoon.getUTCDay();
  const daysFromMonday = dayIndex === 0 ? 6 : dayIndex - 1;

  return toDateKey(addDashboardDays(localNoon, -daysFromMonday));
}

export function getDashboardPeriodBounds({
  period,
  dateKey,
  month,
  weekStartKey,
}: {
  period: DashboardPeriod;
  dateKey: string;
  month: string;
  weekStartKey: string;
}) {
  const todayKey = getTodayDateKeyInPhilippines();

  if (period === "daily") {
    const { start, end } = getPhilippineDayBounds(dateKey);

    return {
      label: dateKey === todayKey ? "Today" : "Selected day",
      dailyStart: start,
      dailyEnd: end,
      staffStart: start,
      staffEnd: addDashboardDays(start, 1),
    };
  }

  if (period === "weekly") {
    const { start: weekStart } = getPhilippineDayBounds(weekStartKey);
    const weekEndExclusive = addDashboardDays(weekStart, 5);

    return {
      label: "Monday to Friday",
      dailyStart: weekStart,
      dailyEnd: new Date(weekEndExclusive.getTime() - 1),
      staffStart: weekStart,
      staffEnd: weekEndExclusive,
    };
  }

  const { monthStart, monthEndExclusive } = getMonthBounds(month);

  return {
    label: "Selected month",
    dailyStart: monthStart,
    dailyEnd: new Date(monthEndExclusive.getTime() - 1),
    staffStart: monthStart,
    staffEnd: monthEndExclusive,
  };
}
