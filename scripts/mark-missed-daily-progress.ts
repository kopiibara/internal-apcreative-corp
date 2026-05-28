import "dotenv/config";

import {
  getYesterdayDateKeyInPhilippines,
  upsertMissedDailyProgressForDate,
} from "@/lib/daily-progress-report/daily-progress-report";
import {
  DAILY_PROGRESS_SCORING_START_DATE_KEY,
  isBeforeDailyProgressScoringStart,
} from "@/lib/daily-progress-report/constants";
import { pool } from "@/lib/db";

async function main() {
  const targetDateKey = process.argv[2] ?? getYesterdayDateKeyInPhilippines();

  console.log(`Marking missed Daily Progress Reports for ${targetDateKey}`);

  if (isBeforeDailyProgressScoringStart(targetDateKey)) {
    console.log(
      `Daily Progress scoring starts on ${DAILY_PROGRESS_SCORING_START_DATE_KEY}. No missed deductions created.`,
    );
    return;
  }

  const result = await upsertMissedDailyProgressForDate({ targetDateKey });

  console.log(
    `createdMissed=${result.createdMissed} createdExcused=${result.createdExcused} skipped=${result.skipped}`,
  );
}

main()
  .catch((error) => {
    console.error("mark-missed-daily-progress failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
