"use server";

import { revalidatePath } from "next/cache";

import {
  metaMonitoringFiltersSchema,
  metaPostCommentsSchema,
  metaPostsFiltersSchema,
  platformAnalyticsFiltersSchema,
  registerMetaPageSchema,
} from "@/app/admin/platform-analytics/schema";
import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { query } from "@/lib/db";
import { bootstrapMetaMonitoring } from "@/lib/meta/bootstrap";
import { fetchPostCommentsSafe } from "@/lib/meta/graph-api";
import { getMetaMonitoringDashboardData } from "@/lib/meta/monitoring-data";
import {
  getMetaPostsPageData,
  type MetaPostsListFilters,
} from "@/lib/meta/posts-analytics";
import { getMetaPageByKey } from "@/lib/meta/pages-config";
import { listActiveMetaFacebookPages } from "@/lib/meta/sync";
import { getPlatformAnalyticsDashboardData } from "@/lib/platform-analytics/get-dashboard-data";
import type {
  AnalyticsDateRange,
  AnalyticsPlatform,
  MetaScope,
} from "@/lib/platform-analytics/types";
import {
  runAllMetaSyncJobs,
  runMetaSyncJob,
} from "@/lib/meta/sync";
import { syncYouTubeAnalytics } from "@/lib/platform-analytics/youtube-sync";
import type { MetaSyncType } from "@/lib/meta/types";
import { can } from "@/lib/permissions";
import { buildYouTubeOAuthUrl } from "@/lib/platform-analytics/youtube-client";

export type MetaMonitoringActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

async function authorizeMetaView(): Promise<MetaMonitoringActionResult<never> | null> {
  const context = await getCurrentProfileContext();

  if (!context) {
    return { success: false, message: "You must be signed in." };
  }

  if (context.profile.status !== "ACTIVE") {
    return { success: false, message: "Your account is not active." };
  }

  const allowed = await can(
    context.profile.auth_user_id,
    "meta_monitoring.view",
  );

  if (!allowed) {
    return {
      success: false,
      message: "You do not have permission to view Platform Analytics.",
    };
  }

  return null;
}

async function authorizeMetaManage(): Promise<MetaMonitoringActionResult<never> | null> {
  const viewError = await authorizeMetaView();
  if (viewError) {
    return viewError;
  }

  const context = await getCurrentProfileContext();
  if (!context) {
    return { success: false, message: "You must be signed in." };
  }

  const allowed = await can(
    context.profile.auth_user_id,
    "meta_monitoring.manage",
  );

  if (!allowed) {
    return {
      success: false,
      message: "You do not have permission to manage Platform Analytics.",
    };
  }

  return null;
}

export async function fetchPlatformAnalyticsAction(input?: {
  platform?: AnalyticsPlatform;
  accountId?: string | null;
  metaScope?: MetaScope;
  dateRange?: AnalyticsDateRange;
}): Promise<
  MetaMonitoringActionResult<
    Awaited<ReturnType<typeof getPlatformAnalyticsDashboardData>>
  >
> {
  const authError = await authorizeMetaView();
  if (authError) {
    return authError;
  }

  const parsed = platformAnalyticsFiltersSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid platform analytics filters.",
    };
  }

  const data = await getPlatformAnalyticsDashboardData({
    platform: parsed.data.platform,
    accountId: parsed.data.accountId ?? null,
    metaScope: parsed.data.metaScope,
    dateRange: parsed.data.dateRange,
  });

  return { success: true, message: "Platform analytics loaded.", data };
}

export async function fetchMetaMonitoringAction(input?: {
  pageId?: string | null;
}): Promise<
  MetaMonitoringActionResult<
    Awaited<ReturnType<typeof getMetaMonitoringDashboardData>>
  >
> {
  const authError = await authorizeMetaView();
  if (authError) {
    return authError;
  }

  const parsed = metaMonitoringFiltersSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid monitoring filters.",
    };
  }

  const data = await getMetaMonitoringDashboardData(parsed.data.pageId ?? null);
  return { success: true, message: "Monitoring data loaded.", data };
}

export async function registerMetaFacebookPageAction(input: {
  facebookPageId: string;
  pageName: string;
  brandId?: number | null;
  accessTokenEnvKey?: string | null;
  webhookSubscribedFields?: string[];
}): Promise<MetaMonitoringActionResult> {
  const authError = await authorizeMetaManage();
  if (authError) {
    return authError;
  }

  const parsed = registerMetaPageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid page registration.",
    };
  }

  await query(
    `
    INSERT INTO meta_facebook_page (
      facebook_page_id,
      page_name,
      brand_id,
      access_token_env_key,
      webhook_subscribed_fields
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (facebook_page_id)
    DO UPDATE SET
      page_name = EXCLUDED.page_name,
      brand_id = EXCLUDED.brand_id,
      access_token_env_key = EXCLUDED.access_token_env_key,
      webhook_subscribed_fields = EXCLUDED.webhook_subscribed_fields,
      is_active = true,
      updated_at = now()
    `,
    [
      parsed.data.facebookPageId,
      parsed.data.pageName,
      parsed.data.brandId ?? null,
      parsed.data.accessTokenEnvKey ?? null,
      parsed.data.webhookSubscribedFields,
    ],
  );

  revalidatePath("/admin/platform-analytics");

  return {
    success: true,
    message: "Facebook Page registered for monitoring.",
  };
}

export async function bootstrapMetaMonitoringAction(): Promise<
  MetaMonitoringActionResult<{
    registeredPages: Array<{ id: string; name: string }>;
    registeredCount: number;
    dailySnapshots: number;
    postMetrics: number;
    warnings: string[];
  }>
> {
  const authError = await authorizeMetaManage();
  if (authError) {
    return authError;
  }

  try {
    const result = await bootstrapMetaMonitoring();
    revalidatePath("/admin/platform-analytics");
    revalidatePath("/admin/platform-analytics/meta/posts");

    const hasData = result.dailySnapshots > 0 || result.postMetrics > 0;

    return {
      success: hasData || result.errors.length === 0,
      message: hasData
        ? `Connected ${result.registeredCount} page(s) and synced analytics.`
        : "Pages registered but analytics sync returned no records. See warnings.",
      data: {
        registeredPages: result.registeredPages.map((p) => ({
          id: p.id,
          name: p.name,
        })),
        registeredCount: result.registeredCount,
        dailySnapshots: result.dailySnapshots,
        postMetrics: result.postMetrics,
        warnings: result.errors,
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to connect Facebook and sync analytics.",
    };
  }
}

export async function syncAllMetaMonitoringAction(): Promise<
  MetaMonitoringActionResult<{
    dailyPage: number;
    hourlyPosts: number;
    dailyInsights: number;
  }>
> {
  const authError = await authorizeMetaManage();
  if (authError) {
    return authError;
  }

  try {
    const result = await runAllMetaSyncJobs();
    revalidatePath("/admin/platform-analytics");
    revalidatePath("/admin/platform-analytics/meta/posts");

    return {
      success: true,
      message: `Meta sync finished: daily_page=${result.dailyPage}, hourly_posts=${result.hourlyPosts}, daily_insights=${result.dailyInsights}.`,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Full analytics sync failed.",
    };
  }
}

export async function triggerMetaSyncAction(
  syncType: MetaSyncType,
): Promise<MetaMonitoringActionResult<{ recordsAffected: number }>> {
  const authError = await authorizeMetaManage();
  if (authError) {
    return authError;
  }

  try {
    const recordsAffected = await runMetaSyncJob(syncType);
    revalidatePath("/admin/platform-analytics");
    revalidatePath("/admin/platform-analytics/meta/posts");
    return {
      success: true,
      message: `${syncType} sync completed.`,
      data: { recordsAffected },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Meta sync failed.",
    };
  }
}

export async function syncYouTubeAction(input?: {
  accountId?: string | null;
  dateRange?: AnalyticsDateRange;
}) {
  const authError = await authorizeMetaManage();
  if (authError) {
    return authError;
  }

  try {
    const result = await syncYouTubeAnalytics({
      accountId: input?.accountId ?? null,
      dateRange: input?.dateRange,
    });
    revalidatePath("/admin/platform-analytics");
    revalidatePath("/admin/platform-analytics/meta/posts");

    return {
      success: true,
      message: result.message,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "YouTube sync failed.",
    };
  }
}

export async function disconnectYouTubeAction(input?: {
  accountId?: string | null;
}): Promise<MetaMonitoringActionResult> {
  const authError = await authorizeMetaManage();
  if (authError) {
    return authError;
  }

  const accountId = input?.accountId ?? null;

  try {
    await query(
      `
      UPDATE platform_integration
      SET
        status = 'INACTIVE',
        token_reference = NULL,
        updated_at = now()
      WHERE platform = 'YOUTUBE'
        AND status IN ('ACTIVE', 'ERROR')
        AND ($1::text IS NULL OR external_account_id = $1)
      `,
      [accountId],
    );

    revalidatePath("/admin/platform-analytics");
    revalidatePath("/admin/platform-analytics/meta/posts");

    return {
      success: true,
      message: accountId
        ? "YouTube account disconnected."
        : "All YouTube accounts disconnected.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "YouTube disconnect failed.",
    };
  }
}

export async function fetchMetaPostsAction(
  input: MetaPostsListFilters,
): Promise<
  MetaMonitoringActionResult<
    NonNullable<Awaited<ReturnType<typeof getMetaPostsPageData>>>
  >
> {
  const authError = await authorizeMetaView();
  if (authError) {
    return authError;
  }

  const parsed = metaPostsFiltersSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid posts filters.",
    };
  }

  const data = await getMetaPostsPageData(parsed.data);
  if (!data) {
    return {
      success: false,
      message: "Meta posts page is not available for this account.",
    };
  }

  return { success: true, message: "Posts loaded.", data };
}

export type MetaPostCommentView = {
  id: string;
  authorName: string;
  message: string;
  createdAt: string | null;
  likeCount: number;
  replyCount: number;
  permalink: string | null;
  permissionDenied: boolean;
  syncFailed: boolean;
};

export async function fetchMetaPostCommentsAction(input: {
  pageKey: "neon-nights" | "pro-group" | "al-qaysar";
  postId: string;
}): Promise<
  MetaMonitoringActionResult<{
    comments: MetaPostCommentView[];
    unavailableMessage: string | null;
  }>
> {
  const authError = await authorizeMetaView();
  if (authError) {
    return authError;
  }

  const parsed = metaPostCommentsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid comment request.",
    };
  }

  const config = getMetaPageByKey(parsed.data.pageKey);
  if (!config?.pageId) {
    return {
      success: false,
      message: "Meta page is not configured.",
    };
  }

  const pages = await listActiveMetaFacebookPages();
  const fbPage = pages.find(
    (page) => page.facebook_page_id === config.pageId,
  );

  if (!fbPage) {
    return {
      success: false,
      message: "Facebook page is not connected.",
    };
  }

  const result = await fetchPostCommentsSafe(parsed.data.postId, fbPage, 100);

  if (!result.ok) {
    return {
      success: true,
      message: result.permissionDenied
        ? "Comments unavailable from current permission."
        : "Failed to load comments.",
      data: {
        comments: [],
        unavailableMessage: result.permissionDenied
          ? "Unavailable from current permission"
          : "Sync failed",
      },
    };
  }

  const comments: MetaPostCommentView[] = (result.data.data ?? []).map(
    (comment) => ({
      id: comment.id,
      authorName: comment.from?.name?.trim() || "Name unavailable",
      message: comment.message?.trim() || "—",
      createdAt: comment.created_time ?? null,
      likeCount: comment.like_count ?? 0,
      replyCount: comment.comment_count ?? 0,
      permalink: comment.permalink_url ?? null,
      permissionDenied: false,
      syncFailed: false,
    }),
  );

  return {
    success: true,
    message: "Comments loaded.",
    data: {
      comments,
      unavailableMessage: null,
    },
  };
}

export async function getYouTubeOAuthUrlAction(): Promise<
  MetaMonitoringActionResult<{ url: string }>
> {
  const authError = await authorizeMetaManage();
  if (authError) return authError;

  try {
    const state = "youtube_connect";
    const url = buildYouTubeOAuthUrl(state);
    return { success: true, message: "OAuth URL generated.", data: { url } };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to build OAuth URL.",
    };
  }
}
