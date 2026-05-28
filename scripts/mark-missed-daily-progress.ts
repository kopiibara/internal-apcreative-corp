import "dotenv/config";

import {
  getYesterdayDateKeyInPhilippines,
  upsertMissedDailyProgressForDate,
} from "@/lib/daily-progress-report/daily-progress-report";
import { pool } from "@/lib/db";

async function main() {
  const targetDateKey = process.argv[2] ?? getYesterdayDateKeyInPhilippines();

  console.log(`Marking missed Daily Progress Reports for ${targetDateKey}`);

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
