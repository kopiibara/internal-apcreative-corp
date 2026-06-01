import "server-only";

import { query } from "@/lib/db";
import {
  fetchTikTokUserInfo,
  fetchTikTokVideoList,
  TikTokApiScopeError,
} from "@/lib/tiktok/client";
import {
  ensureTikTokAccessToken,
  getTikTokIntegrationByBrandId,
  listActiveTikTokIntegrations,
  logTikTokSync,
  markTikTokIntegrationError,
  updateTikTokIntegrationSyncSuccess,
  type SocialIntegrationWithTokens,
} from "@/lib/tiktok/integration-db";

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function videoTitle(video: {
  title?: string;
  video_description?: string;
  id: string;
}) {
  return (
    video.title?.trim() ||
    video.video_description?.trim() ||
    `Video ${video.id}`
  );
}

function unixSecondsToDate(seconds?: number) {
  if (seconds == null || !Number.isFinite(seconds)) {
    return null;
  }
  return new Date(seconds * 1000);
}

async function upsertAccountSnapshot(input: {
  brandId: number;
  integrationId: number;
  snapshotDate: string;
  user: Awaited<ReturnType<typeof fetchTikTokUserInfo>>;
}) {
  await query(
    `
    INSERT INTO tiktok_account_snapshots (
      brand_id,
      integration_id,
      snapshot_date,
      follower_count,
      following_count,
      likes_count,
      video_count,
      profile_deep_link,
      raw_payload
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
    ON CONFLICT (integration_id, snapshot_date)
    DO UPDATE SET
      follower_count = EXCLUDED.follower_count,
      following_count = EXCLUDED.following_count,
      likes_count = EXCLUDED.likes_count,
      video_count = EXCLUDED.video_count,
      profile_deep_link = EXCLUDED.profile_deep_link,
      raw_payload = EXCLUDED.raw_payload
    `,
    [
      input.brandId,
      input.integrationId,
      input.snapshotDate,
      input.user.follower_count ?? null,
      input.user.following_count ?? null,
      input.user.likes_count ?? null,
      input.user.video_count ?? null,
      input.user.profile_deep_link ?? null,
      JSON.stringify(input.user),
    ],
  );
}

async function upsertVideoPost(input: {
  brandId: number;
  integrationId: number;
  video: Awaited<ReturnType<typeof fetchTikTokVideoList>>[number];
}) {
  const title = videoTitle(input.video);
  const createTime = unixSecondsToDate(input.video.create_time);

  await query(
    `
    INSERT INTO tiktok_video_posts (
      brand_id,
      integration_id,
      tiktok_video_id,
      title,
      cover_image_url,
      embed_link,
      duration,
      create_time,
      raw_payload,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now())
    ON CONFLICT (integration_id, tiktok_video_id)
    DO UPDATE SET
      title = EXCLUDED.title,
      cover_image_url = EXCLUDED.cover_image_url,
      embed_link = EXCLUDED.embed_link,
      duration = EXCLUDED.duration,
      create_time = EXCLUDED.create_time,
      raw_payload = EXCLUDED.raw_payload,
      updated_at = now()
    `,
    [
      input.brandId,
      input.integrationId,
      input.video.id,
      title,
      input.video.cover_image_url ?? null,
      input.video.embed_link ?? input.video.share_url ?? null,
      input.video.duration ?? null,
      createTime,
      JSON.stringify(input.video),
    ],
  );
}

async function upsertVideoSnapshot(input: {
  brandId: number;
  integrationId: number;
  snapshotDate: string;
  video: Awaited<ReturnType<typeof fetchTikTokVideoList>>[number];
}) {
  const hasMetrics =
    input.video.view_count != null ||
    input.video.like_count != null ||
    input.video.comment_count != null ||
    input.video.share_count != null;

  if (!hasMetrics) {
    return;
  }

  await query(
    `
    INSERT INTO tiktok_video_snapshots (
      brand_id,
      integration_id,
      tiktok_video_id,
      snapshot_date,
      view_count,
      like_count,
      comment_count,
      share_count,
      raw_payload
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
    ON CONFLICT (integration_id, tiktok_video_id, snapshot_date)
    DO UPDATE SET
      view_count = EXCLUDED.view_count,
      like_count = EXCLUDED.like_count,
      comment_count = EXCLUDED.comment_count,
      share_count = EXCLUDED.share_count,
      raw_payload = EXCLUDED.raw_payload
    `,
    [
      input.brandId,
      input.integrationId,
      input.video.id,
      input.snapshotDate,
      input.video.view_count ?? null,
      input.video.like_count ?? null,
      input.video.comment_count ?? null,
      input.video.share_count ?? null,
      JSON.stringify(input.video),
    ],
  );
}

async function syncTikTokIntegration(
  integration: SocialIntegrationWithTokens,
  syncType: string,
) {
  const snapshotDate = todayDateString();
  let recordsSynced = 0;
  const scopeErrors: string[] = [];

  try {
    const accessToken = await ensureTikTokAccessToken(integration);

    let userInfo: Awaited<ReturnType<typeof fetchTikTokUserInfo>> | null = null;

    try {
      userInfo = await fetchTikTokUserInfo(accessToken);
      await upsertAccountSnapshot({
        brandId: integration.brand_id,
        integrationId: integration.id,
        snapshotDate,
        user: userInfo,
      });
      recordsSynced += 1;

      if (userInfo.display_name || userInfo.username) {
        await query(
          `
          UPDATE social_integrations
          SET account_name = $2, updated_at = now()
          WHERE id = $1
          `,
          [
            integration.id,
            userInfo.display_name ?? userInfo.username ?? integration.account_name,
          ],
        );
      }
    } catch (error) {
      if (error instanceof TikTokApiScopeError) {
        scopeErrors.push(error.missingScope);
      } else {
        throw error;
      }
    }

    try {
      const videos = await fetchTikTokVideoList(accessToken);
      for (const video of videos) {
        await upsertVideoPost({
          brandId: integration.brand_id,
          integrationId: integration.id,
          video,
        });
        await upsertVideoSnapshot({
          brandId: integration.brand_id,
          integrationId: integration.id,
          snapshotDate,
          video,
        });
        recordsSynced += 1;
      }
    } catch (error) {
      if (error instanceof TikTokApiScopeError) {
        scopeErrors.push(error.missingScope);
      } else {
        throw error;
      }
    }

    await updateTikTokIntegrationSyncSuccess(integration.id);

    const status =
      scopeErrors.length > 0 && recordsSynced === 0 ? "FAILED" : "PARTIAL";

    await logTikTokSync({
      brandId: integration.brand_id,
      integrationId: integration.id,
      syncType,
      status: scopeErrors.length > 0 ? status : "SUCCESS",
      recordsSynced,
      errorMessage:
        scopeErrors.length > 0
          ? `Missing scopes: ${[...new Set(scopeErrors)].join(", ")}`
          : null,
    });

    return {
      brandId: integration.brand_id,
      recordsSynced,
      scopeErrors: [...new Set(scopeErrors)],
      message:
        scopeErrors.length > 0
          ? `Synced with partial data. Missing scopes: ${[...new Set(scopeErrors)].join(", ")}`
          : `TikTok sync completed (${recordsSynced} records).`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "TikTok sync failed.";

    if (!message.toLowerCase().includes("reconnect")) {
      await markTikTokIntegrationError(integration.id, message);
    }

    await logTikTokSync({
      brandId: integration.brand_id,
      integrationId: integration.id,
      syncType,
      status: "FAILED",
      recordsSynced: 0,
      errorMessage: message,
    });

    throw error;
  }
}

export async function syncTikTokForBrand(brandId: number) {
  const integration = await getTikTokIntegrationByBrandId(brandId);

  if (!integration) {
    throw new Error("No TikTok account is connected for this brand.");
  }

  if (integration.status === "RECONNECT_REQUIRED") {
    throw new Error("TikTok reconnect required. Connect TikTok again.");
  }

  return syncTikTokIntegration(integration, "manual");
}

export async function syncAllTikTokIntegrations() {
  const integrations = await listActiveTikTokIntegrations();
  const results: Array<{
    brandId: number;
    success: boolean;
    message: string;
  }> = [];

  for (const integration of integrations) {
    try {
      const result = await syncTikTokIntegration(integration, "daily_cron");
      results.push({
        brandId: integration.brand_id,
        success: true,
        message: result.message,
      });
    } catch (error) {
      results.push({
        brandId: integration.brand_id,
        success: false,
        message:
          error instanceof Error ? error.message : "TikTok sync failed.",
      });
    }
  }

  const succeeded = results.filter((r) => r.success).length;

  return {
    total: integrations.length,
    succeeded,
    failed: integrations.length - succeeded,
    results,
    message:
      integrations.length === 0
        ? "No active TikTok integrations to sync."
        : `TikTok daily sync finished (${succeeded}/${integrations.length} succeeded).`,
  };
}
