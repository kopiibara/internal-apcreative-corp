import { z } from "zod";

export const analyticsPlatforms = [
  "META",
  "TIKTOK",
  "YOUTUBE",
  "GOOGLE",
] as const;

export const metaScopes = ["combined", "facebook", "instagram"] as const;

export const analyticsDateRanges = [
  "today",
  "7d",
  "28d",
  "month",
  "90d",
  "365d",
  "custom",
] as const;

export const platformAnalyticsFiltersSchema = z.object({
  platform: z.enum(analyticsPlatforms).default("META"),
  accountId: z.string().trim().optional().nullable(),
  metaScope: z.enum(metaScopes).default("combined"),
  dateRange: z.enum(analyticsDateRanges).default("28d"),
  customDateFrom: z.string().trim().optional().nullable(),
  customDateTo: z.string().trim().optional().nullable(),
});

export const metaMonitoringFiltersSchema = z.object({
  pageId: z.string().trim().optional().nullable(),
});

export const metaPostsSortOptions = [
  "latest",
  "highest_engagement",
  "most_comments",
  "most_shares",
  "most_reactions",
] as const;

export const metaPostsPageSizes = [10, 25, 50] as const;

export const metaPostsFiltersSchema = z.object({
  pageKey: z.string().trim().min(1).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z
    .union([z.literal(10), z.literal(25), z.literal(50)])
    .default(10),
  sort: z.enum(metaPostsSortOptions).default("latest"),
  search: z.string().trim().optional(),
  dateFrom: z.string().trim().optional().nullable(),
  dateTo: z.string().trim().optional().nullable(),
});

export const metaPostCommentsSchema = z.object({
  pageKey: z.string().trim().min(1),
  postId: z.string().trim().min(1),
});

export const metaPageSyncSchema = z.object({
  pageKey: z.string().trim().min(1),
});

export const metaPageJobSyncSchema = z.object({
  pageKey: z.string().trim().min(1),
  syncType: z.enum([
    "hourly_posts",
    "daily_page",
    "daily_insights",
    "weekly_summary",
    "monthly_summary",
  ]),
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
