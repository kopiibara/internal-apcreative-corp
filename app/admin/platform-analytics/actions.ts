"use server";

import { revalidatePath } from "next/cache";

import {
  metaMonitoringFiltersSchema,
  registerMetaPageSchema,
} from "@/app/admin/platform-analytics/schema";
import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { query } from "@/lib/db";
import { bootstrapMetaMonitoring } from "@/lib/meta/bootstrap";
import { getMetaMonitoringDashboardData } from "@/lib/meta/monitoring-data";
import {
  runMetaSyncJob,
  syncDailyPageSnapshots,
  syncHourlyPostMetrics,
} from "@/lib/meta/sync";
import type { MetaSyncType } from "@/lib/meta/types";
import { can } from "@/lib/permissions";

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
      message: "You do not have permission to view Meta monitoring.",
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
      message: "You do not have permission to manage Meta monitoring.",
    };
  }

  return null;
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
    discoveredPages: Array<{ id: string; name: string }>;
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

    const hasData = result.dailySnapshots > 0 || result.postMetrics > 0;

    return {
      success: hasData || result.errors.length === 0,
      message: hasData
        ? `Connected ${result.registeredCount} page(s) and synced analytics.`
        : "Pages registered but analytics sync returned no records. See warnings.",
      data: {
        discoveredPages: result.discoveredPages.map((p) => ({
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
    dailySnapshots: number;
    postMetrics: number;
  }>
> {
  const authError = await authorizeMetaManage();
  if (authError) {
    return authError;
  }

  try {
    const [dailySnapshots, postMetrics] = await Promise.all([
      syncDailyPageSnapshots(),
      syncHourlyPostMetrics(),
    ]);
    revalidatePath("/admin/platform-analytics");

    return {
      success: true,
      message: "Full analytics sync completed.",
      data: { dailySnapshots, postMetrics },
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
