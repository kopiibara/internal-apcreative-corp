import { z } from "zod";

import { dailyReportFiltersSchema } from "@/lib/daily-reports/daily-report-filters";

export const fetchDailyReportSchema = dailyReportFiltersSchema;

export type FetchDailyReportInput = z.infer<typeof fetchDailyReportSchema>;
