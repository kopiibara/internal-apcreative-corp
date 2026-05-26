import { z } from "zod";

export const analyticsPlatforms = [
  "META",
  "TIKTOK",
  "YOUTUBE",
  "GOOGLE",
] as const;

export const metaScopes = ["combined", "facebook", "instagram"] as const;

export const analyticsDateRanges = ["7d", "28d", "90d", "365d"] as const;

export const platformAnalyticsFiltersSchema = z.object({
  platform: z.enum(analyticsPlatforms).default("META"),
  accountId: z.string().trim().optional().nullable(),
  metaScope: z.enum(metaScopes).default("combined"),
  dateRange: z.enum(analyticsDateRanges).default("28d"),
});

export const metaMonitoringFiltersSchema = z.object({
  pageId: z.string().trim().optional().nullable(),
});

export const registerMetaPageSchema = z.object({
  facebookPageId: z.string().trim().min(1, "Facebook Page ID is required."),
  pageName: z.string().trim().min(1, "Page name is required."),
  brandId: z.coerce.number().int().positive().optional().nullable(),
  accessTokenEnvKey: z.string().trim().optional().nullable(),
  webhookSubscribedFields: z
    .array(z.string().trim().min(1))
    .min(1, "At least one webhook field is required.")
    .default(["feed"]),
});
