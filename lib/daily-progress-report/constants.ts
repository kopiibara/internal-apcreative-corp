export const DAILY_PROGRESS_SCORING_START_DATE_KEY = "2026-05-28";

export function isBeforeDailyProgressScoringStart(dateKey: string) {
  return dateKey < DAILY_PROGRESS_SCORING_START_DATE_KEY;
}

export function clampDailyProgressStartDate(dateKey: string) {
  return isBeforeDailyProgressScoringStart(dateKey)
    ? DAILY_PROGRESS_SCORING_START_DATE_KEY
    : dateKey;
}
