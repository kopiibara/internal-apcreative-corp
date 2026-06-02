import "server-only";

import { google } from "@/lib/platform-analytics/googleapis-runtime";
import type { PoolClient } from "pg";

import { query, transaction } from "@/lib/db";
import { listYouTubeIntegrations } from "@/lib/youtube/integration-db";
import { getYouTubeChannelByKey } from "@/lib/youtube/channels-config";
import {
  createYouTubeOAuthClient,
  YOUTUBE_ANALYTICS_SCOPE,
} from "@/lib/platform-analytics/youtube-client";
import type { AnalyticsDateRange } from "@/lib/platform-analytics/types";

export type YouTubeSyncMode = "full" | "channel" | "videos" | "analytics";

type YouTubeChannelIdentity = {
  channelId: string;
  channelName: string;
  subscribersTotal: number;
};

type UpsertYouTubeIntegrationInput = {
  createdByProfileId: number;
  refreshToken: string | null;
  scopes: string[];
  channel: YouTubeChannelIdentity;
  channelKey?: string | null;
};

type YouTubeIntegrationRow = {
  id: number;
  channel_key: string | null;
  external_account_id: string;
  account_name: string;
  token_reference: string | null;
  scopes: string[];
};

type YouTubeMetricMapRow = {
  metric_key: string;
  metric_value: string;
};

type YouTubeDailyMetricRow = {
  day: string;
  views: number;
  watchMinutes: number;
  subscribersGained: number;
  subscribersLost: number;
};

type YouTubeTopVideoRow = {
  video: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  estimatedMinutesWatched: number;
  averageViewDuration: number;
};

type YouTubeVideoMeta = {
  id: string;
  title: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
};

type SyncSummary = {
  accountId: string;
  recordsSynced: number;
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() - days);
  return d;
}

function dateRangeToDays(dateRange?: AnalyticsDateRange) {
  switch (dateRange) {
    case "today":
      return 1;
    case "7d":
      return 7;
    case "month": {
      const today = new Date();
      return today.getDate();
    }
    case "90d":
      return 90;
    case "365d":
      return 365;
    case "custom":
    case "28d":
    default:
      return 28;
  }
}

function dateRangeToStartOffset(dateRange?: AnalyticsDateRange) {
  return Math.max(dateRangeToDays(dateRange) - 1, 0);
}

function dateRangeLabel(dateRange?: AnalyticsDateRange) {
  switch (dateRange) {
    case "today":
      return "Today";
    case "7d":
      return "Last 7 days";
    case "month":
      return "This month";
    case "90d":
      return "Last 90 days";
    case "365d":
      return "Last 365 days";
    case "custom":
      return "Custom range";
    case "28d":
    default:
      return "Last 28 days";
  }
}

function parseMetricNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function apiItems(data: Record<string, unknown>) {
  return asArray(data.items).map(asRecord);
}

function apiColumnHeaders(
  data: Record<string, unknown>,
): AnalyticsColumnHeader[] {
  return asArray(data.columnHeaders).map((header) => {
    const record = asRecord(header);
    return {
      name: asString(record.name) || null,
      dataType: asString(record.dataType) || null,
    };
  });
}

function apiRows(data: Record<string, unknown>) {
  return asArray(data.rows).map((row) => {
    const cells = asArray(row);
    return cells.map((cell) =>
      typeof cell === "string" || typeof cell === "number" ? cell : 0,
    );
  });
}

type AnalyticsColumnHeader = {
  name?: string | null
  dataType?: string | null
}

function toMetricMap(
  headers: AnalyticsColumnHeader[] | null | undefined,
  row: (string | number)[] | null | undefined,
) {
  const mapped: Record<string, number | string> = {};
  if (!headers || !row) {
    return mapped;
  }

  headers.forEach((header, index) => {
    const key = header.name;
    const value = row[index];
    if (!key || value === undefined || value === null) {
      return;
    }

    mapped[key] =
      header.dataType === "INTEGER" || header.dataType === "FLOAT"
        ? parseMetricNumber(value)
        : value;
  });

  return mapped;
}

function parseScopeSet(scopeValue: string | null | undefined) {
  if (!scopeValue) {
    return [] as string[];
  }

  return scopeValue
    .split(" ")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function toSubscriberHistory(
  currentTotal: number,
  rows: YouTubeDailyMetricRow[],
): Array<{ day: string; subscribersTotal: number; views: number }> {
  if (!rows.length) {
    return [{ day: isoToday(), subscribersTotal: currentTotal, views: 0 }];
  }

  const sortedDesc = [...rows].sort((a, b) => b.day.localeCompare(a.day));
  let running = currentTotal;

  const withTotals = sortedDesc.map((row) => {
    const currentDayTotal = running;
    const net = row.subscribersGained - row.subscribersLost;
    running -= net;

    return {
      day: row.day,
      subscribersTotal: Math.max(0, Math.round(currentDayTotal)),
      views: Math.max(0, Math.round(row.views)),
    };
  });

  return withTotals.sort((a, b) => a.day.localeCompare(b.day));
}

async function fetchChannelIdentityFromOAuth(
  oauth: ReturnType<typeof createYouTubeOAuthClient>,
) {
  const youtube = google.youtube({ version: "v3", auth: oauth });

  const response = await youtube.channels.list({
    part: ["snippet", "statistics"],
    mine: true,
    maxResults: 1,
  });

  const item = apiItems(response.data)[0];
  const channelId = asString(item?.id).trim();

  if (!channelId) {
    throw new Error("Could not resolve YouTube channel from OAuth account.");
  }

  const snippet = asRecord(item?.snippet);
  const statistics = asRecord(item?.statistics);

  return {
    channelId,
    channelName: asString(snippet.title).trim() || "YouTube Channel",
    subscribersTotal: parseMetricNumber(statistics.subscriberCount),
  } satisfies YouTubeChannelIdentity;
}

export async function exchangeYouTubeOAuthCode(code: string) {
  const oauth = createYouTubeOAuthClient();

  const tokenResponse = await oauth.getToken(code);
  oauth.setCredentials(tokenResponse.tokens);

  const refreshToken =
    typeof tokenResponse.tokens.refresh_token === "string"
      ? tokenResponse.tokens.refresh_token
      : null;
  const scopeSet = parseScopeSet(
    typeof tokenResponse.tokens.scope === "string"
      ? tokenResponse.tokens.scope
      : undefined,
  );
  const channel = await fetchChannelIdentityFromOAuth(oauth);

  return { refreshToken, scopeSet, channel, tokens: tokenResponse.tokens };
}

export async function upsertYouTubeIntegrationFromOAuth(
  input: UpsertYouTubeIntegrationInput,
) {
  const scopes = input.scopes.length ? input.scopes : [YOUTUBE_ANALYTICS_SCOPE];

  try {
    await query(
      `
      INSERT INTO platform_integration (
        platform,
        account_name,
        account_type,
        external_account_id,
        channel_key,
        token_reference,
        scopes,
        status,
        created_by,
        updated_at
      )
      VALUES (
        'YOUTUBE',
        $1,
        'youtube_channel',
        $2,
        $3,
        $4,
        $5::text[],
        'ACTIVE',
        $6,
        now()
      )
      ON CONFLICT (platform, external_account_id, account_type)
      DO UPDATE SET
        account_name = EXCLUDED.account_name,
        channel_key = COALESCE(EXCLUDED.channel_key, platform_integration.channel_key),
        token_reference = COALESCE(EXCLUDED.token_reference, platform_integration.token_reference),
        scopes = EXCLUDED.scopes,
        status = 'ACTIVE',
        updated_at = now()
      `,
      [
        input.channel.channelName,
        input.channel.channelId,
        input.channelKey ?? null,
        input.refreshToken,
        scopes,
        input.createdByProfileId,
      ],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.toLowerCase().includes("channel_key")) {
      throw error;
    }

    await query(
      `
      INSERT INTO platform_integration (
        platform,
        account_name,
        account_type,
        external_account_id,
        token_reference,
        scopes,
        status,
        created_by,
        updated_at
      )
      VALUES (
        'YOUTUBE',
        $1,
        'youtube_channel',
        $2,
        $3,
        $4::text[],
        'ACTIVE',
        $5,
        now()
      )
      ON CONFLICT (platform, external_account_id, account_type)
      DO UPDATE SET
        account_name = EXCLUDED.account_name,
        token_reference = COALESCE(EXCLUDED.token_reference, platform_integration.token_reference),
        scopes = EXCLUDED.scopes,
        status = 'ACTIVE',
        updated_at = now()
      `,
      [
        input.channel.channelName,
        input.channel.channelId,
        input.refreshToken,
        scopes,
        input.createdByProfileId,
      ],
    );
  }
}

function filterYouTubeIntegrationsForSync(
  rows: Awaited<ReturnType<typeof listYouTubeIntegrations>>,
  input?: { accountId?: string | null; channelKey?: string | null },
) {
  const channelConfig = input?.channelKey
    ? getYouTubeChannelByKey(input.channelKey)
    : null;

  return rows.filter((row) => {
    if (input?.accountId && row.external_account_id !== input.accountId) {
      return false;
    }

    if (!input?.channelKey) {
      return true;
    }

    if (row.channel_key === input.channelKey) {
      return true;
    }

    if (!row.channel_key && channelConfig?.channelId) {
      return row.external_account_id === channelConfig.channelId;
    }

    return false;
  });
}

function channelAnalyticsIds(channelId: string) {
  return `channel==${channelId}`;
}

async function fetchAnalyticsTotals(
  auth: ReturnType<typeof createYouTubeOAuthClient>,
  channelId: string,
  dateRange?: AnalyticsDateRange,
) {
  const analytics = google.youtubeAnalytics({ version: "v2", auth });
  const today = new Date();
  const days = dateRangeToStartOffset(dateRange);

  const response = await analytics.reports.query({
    ids: channelAnalyticsIds(channelId),
    startDate: formatDate(daysAgo(today, days)),
    endDate: formatDate(today),
    metrics:
      "views,comments,likes,shares,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost",
  });

  const data = response.data;
  const mapped = toMetricMap(apiColumnHeaders(data), apiRows(data)[0]);

  return {
    views: parseMetricNumber(mapped.views),
    comments: parseMetricNumber(mapped.comments),
    likes: parseMetricNumber(mapped.likes),
    shares: parseMetricNumber(mapped.shares),
    watchMinutes: parseMetricNumber(mapped.estimatedMinutesWatched),
    averageViewDurationSeconds: parseMetricNumber(mapped.averageViewDuration),
    subscribersGained: parseMetricNumber(mapped.subscribersGained),
    subscribersLost: parseMetricNumber(mapped.subscribersLost),
  };
}

async function fetchDailyAnalytics(
  auth: ReturnType<typeof createYouTubeOAuthClient>,
  channelId: string,
  dateRange?: AnalyticsDateRange,
): Promise<YouTubeDailyMetricRow[]> {
  const analytics = google.youtubeAnalytics({ version: "v2", auth });
  const today = new Date();
  const days = dateRangeToStartOffset(dateRange);

  const response = await analytics.reports.query({
    ids: channelAnalyticsIds(channelId),
    startDate: formatDate(daysAgo(today, days)),
    endDate: formatDate(today),
    dimensions: "day",
    metrics: "views,subscribersGained,subscribersLost",
    sort: "day",
  });

  const data = response.data;
  const headers = apiColumnHeaders(data);

  return apiRows(data)
    .map((row) => toMetricMap(headers, row))
    .map((row) => ({
      day: String(row.day ?? ""),
      views: parseMetricNumber(row.views),
      watchMinutes: parseMetricNumber(row.estimatedMinutesWatched),
      subscribersGained: parseMetricNumber(row.subscribersGained),
      subscribersLost: parseMetricNumber(row.subscribersLost),
    }))
    .filter((row) => Boolean(row.day));
}

async function fetchTopVideos(
  auth: ReturnType<typeof createYouTubeOAuthClient>,
  channelId: string,
  dateRange?: AnalyticsDateRange,
): Promise<YouTubeTopVideoRow[]> {
  const analytics = google.youtubeAnalytics({ version: "v2", auth });
  const today = new Date();
  const days = dateRangeToStartOffset(dateRange);

  const response = await analytics.reports.query({
    ids: channelAnalyticsIds(channelId),
    startDate: formatDate(daysAgo(today, days)),
    endDate: formatDate(today),
    dimensions: "video",
    metrics:
      "views,likes,comments,shares,estimatedMinutesWatched,averageViewDuration",
    sort: "-views",
    maxResults: 10,
  });

  const data = response.data;
  const headers = apiColumnHeaders(data);

  return apiRows(data)
    .map((row) => toMetricMap(headers, row))
    .map((row) => ({
      video: String(row.video ?? ""),
      views: parseMetricNumber(row.views),
      likes: parseMetricNumber(row.likes),
      comments: parseMetricNumber(row.comments),
      shares: parseMetricNumber(row.shares),
      estimatedMinutesWatched: parseMetricNumber(row.estimatedMinutesWatched),
      averageViewDuration: parseMetricNumber(row.averageViewDuration),
    }))
    .filter((row) => Boolean(row.video));
}

async function fetchVideoMetadata(
  auth: ReturnType<typeof createYouTubeOAuthClient>,
  videoIds: string[],
) {
  if (!videoIds.length) {
    return new Map<string, YouTubeVideoMeta>();
  }

  const youtube = google.youtube({ version: "v3", auth });
  const response = await youtube.videos.list({
    part: ["snippet"],
    id: videoIds,
    maxResults: 50,
  });

  const map = new Map<string, YouTubeVideoMeta>();

  for (const item of apiItems(response.data)) {
    const id = asString(item.id).trim();
    if (!id) {
      continue;
    }

    const snippet = asRecord(item.snippet);
    const thumbnails = asRecord(snippet.thumbnails);
    const medium = asRecord(thumbnails.medium);
    const defaultThumb = asRecord(thumbnails.default);

    map.set(id, {
      id,
      title: asString(snippet.title).trim() || "Untitled video",
      publishedAt: asString(snippet.publishedAt) || null,
      thumbnailUrl:
        asString(medium.url) || asString(defaultThumb.url) || null,
    });
  }

  return map;
}

async function markSyncStarted(accountId: string) {
  const result = await query<{ id: number }>(
    `
    INSERT INTO platform_sync_log (
      platform,
      external_account_id,
      sync_type,
      status,
      started_at,
      records_synced
    )
    VALUES ('YOUTUBE', $1, 'youtube_manual_sync', 'STARTED', now(), 0)
    RETURNING id
    `,
    [accountId],
  );

  return result.rows[0]?.id;
}

async function markSyncFinished(syncLogId: number, recordsSynced: number) {
  await query(
    `
    UPDATE platform_sync_log
    SET
      status = 'SUCCESS',
      completed_at = now(),
      records_synced = $1
    WHERE id = $2
    `,
    [recordsSynced, syncLogId],
  );
}

async function markSyncFailed(syncLogId: number, message: string) {
  await query(
    `
    UPDATE platform_sync_log
    SET
      status = 'FAILED',
      completed_at = now(),
      error_message = $1
    WHERE id = $2
    `,
    [message.slice(0, 400), syncLogId],
  );
}

async function upsertMetricSnapshot(
  client: PoolClient,
  accountId: string,
  metricDate: string,
  metricKey: string,
  metricValue: number,
) {
  await client.query(
    `
    INSERT INTO platform_metric_snapshot (
      platform,
      external_account_id,
      metric_date,
      metric_key,
      metric_value,
      source_type
    )
    VALUES ('YOUTUBE', $1, $2, $3, $4, 'API')
    ON CONFLICT (platform, external_account_id, metric_date, metric_key)
    DO UPDATE SET
      metric_value = EXCLUDED.metric_value,
      source_type = EXCLUDED.source_type
    `,
    [accountId, metricDate, metricKey, metricValue],
  );
}

async function upsertContentRow(
  client: PoolClient,
  input: {
    accountId: string;
    videoId: string;
    title: string;
    publishedAt: string | null;
    thumbnailUrl: string | null;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    watchMinutes: number;
    averageViewDurationSeconds: number;
  },
) {
  const safeViews = Math.max(input.views, 0);
  const engagementRate =
    safeViews > 0
      ? Number(
          (
            ((input.likes + input.comments + input.shares) / safeViews) *
            100
          ).toFixed(2),
        )
      : 0;

  const insights = {
    watch_minutes: input.watchMinutes,
    average_view_duration_seconds: input.averageViewDurationSeconds,
  };

  await client.query(
    `
    INSERT INTO platform_content_performance (
      platform,
      external_account_id,
      external_content_id,
      title,
      content_type,
      published_at,
      thumbnail_url,
      views_count,
      likes_count,
      comments_count,
      shares_count,
      engagement_rate,
      source_type,
      insights,
      last_synced_at,
      updated_at
    )
    VALUES (
      'YOUTUBE',
      $1,
      $2,
      $3,
      'video',
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      'API',
      $11::jsonb,
      now(),
      now()
    )
    ON CONFLICT (platform, external_content_id)
    DO UPDATE SET
      external_account_id = EXCLUDED.external_account_id,
      title = EXCLUDED.title,
      content_type = EXCLUDED.content_type,
      published_at = EXCLUDED.published_at,
      thumbnail_url = EXCLUDED.thumbnail_url,
      views_count = EXCLUDED.views_count,
      likes_count = EXCLUDED.likes_count,
      comments_count = EXCLUDED.comments_count,
      shares_count = EXCLUDED.shares_count,
      engagement_rate = EXCLUDED.engagement_rate,
      source_type = EXCLUDED.source_type,
      insights = EXCLUDED.insights,
      last_synced_at = now(),
      updated_at = now()
    `,
    [
      input.accountId,
      input.videoId,
      input.title,
      input.publishedAt,
      input.thumbnailUrl,
      input.views,
      input.likes,
      input.comments,
      input.shares,
      engagementRate,
      JSON.stringify(insights),
    ],
  );
}

async function syncSingleYouTubeIntegration(
  integration: YouTubeIntegrationRow,
  dateRange?: AnalyticsDateRange,
  syncMode: YouTubeSyncMode = "full",
): Promise<SyncSummary> {
  const syncLogId = await markSyncStarted(integration.external_account_id);
  let recordsSynced = 0;

  try {
    if (!integration.token_reference) {
      throw new Error("Missing stored YouTube refresh token.");
    }

    const oauth = createYouTubeOAuthClient();
    oauth.setCredentials({ refresh_token: integration.token_reference });

    const youtube = google.youtube({ version: "v3", auth: oauth });
    const channelResponse = await youtube.channels.list({
      part: ["snippet", "statistics"],
      id: [integration.external_account_id],
      maxResults: 1,
    });

    const channel = apiItems(channelResponse.data)[0];
    const channelId =
      asString(channel?.id).trim() || integration.external_account_id;
    const channelName =
      asString(asRecord(channel?.snippet).title).trim() ||
      integration.account_name ||
      "YouTube Channel";
    const subscribersTotal = parseMetricNumber(
      asRecord(channel?.statistics).subscriberCount,
    );

    const syncVideos = syncMode === "full" || syncMode === "videos";
    const syncAnalytics =
      syncMode === "full" || syncMode === "analytics" || syncMode === "channel";

    const totals = syncAnalytics
      ? await fetchAnalyticsTotals(oauth, channelId, dateRange)
      : {
          subscribersGained: 0,
          subscribersLost: 0,
          views: 0,
          watchMinutes: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          averageViewDurationSeconds: 0,
        };
    const dailyRows = syncAnalytics
      ? await fetchDailyAnalytics(oauth, channelId, dateRange)
      : [];
    const topVideos = syncVideos
      ? await fetchTopVideos(oauth, channelId, dateRange)
      : [];

    const historyWithTotals = syncAnalytics
      ? toSubscriberHistory(subscribersTotal, dailyRows)
      : [];
    const videoMetadata = syncVideos
      ? await fetchVideoMetadata(
          oauth,
          topVideos.map((row) => row.video),
        )
      : new Map<string, YouTubeVideoMeta>();

    await transaction(async (client) => {
      const today = isoToday();
      const subscribersNet = totals.subscribersGained - totals.subscribersLost;
      const engagementRate =
        totals.views > 0
          ? Number(
              (
                ((totals.likes + totals.comments + totals.shares) /
                  totals.views) *
                100
              ).toFixed(2),
            )
          : 0;

      const aggregateMetrics: Array<{ key: string; value: number }> = syncAnalytics
        ? [
            { key: "subscribers_total", value: subscribersTotal },
            { key: "subscribers_gained", value: totals.subscribersGained },
            { key: "subscribers_lost", value: totals.subscribersLost },
            { key: "subscribers_net", value: subscribersNet },
            { key: "views", value: totals.views },
            { key: "watch_time_minutes", value: totals.watchMinutes },
            {
              key: "avg_view_duration_seconds",
              value: totals.averageViewDurationSeconds,
            },
            { key: "likes", value: totals.likes },
            { key: "comments", value: totals.comments },
            { key: "shares", value: totals.shares },
            { key: "engagement_rate", value: engagementRate },
          ]
        : [{ key: "subscribers_total", value: subscribersTotal }];

      for (const metric of aggregateMetrics) {
        await upsertMetricSnapshot(
          client,
          channelId,
          today,
          metric.key,
          metric.value,
        );
        recordsSynced += 1;
      }

      for (const history of historyWithTotals) {
        await upsertMetricSnapshot(
          client,
          channelId,
          history.day,
          "subscribers_total",
          history.subscribersTotal,
        );
        await upsertMetricSnapshot(
          client,
          channelId,
          history.day,
          "views",
          history.views,
        );
        recordsSynced += 2;
      }

      if (syncAnalytics) {
        for (const row of dailyRows) {
          const net = row.subscribersGained - row.subscribersLost;
          await upsertMetricSnapshot(
            client,
            channelId,
            row.day,
            "subscribers_net",
            net,
          );
          await upsertMetricSnapshot(
            client,
            channelId,
            row.day,
            "watch_time_minutes",
            row.watchMinutes,
          );
          recordsSynced += 1;
        }
      }

      if (syncVideos) {
        for (const row of topVideos) {
          const meta = videoMetadata.get(row.video);

          await upsertContentRow(client, {
            accountId: channelId,
            videoId: row.video,
            title: meta?.title || `Video ${row.video}`,
            publishedAt: meta?.publishedAt ?? null,
            thumbnailUrl: meta?.thumbnailUrl ?? null,
            views: row.views,
            likes: row.likes,
            comments: row.comments,
            shares: row.shares,
            watchMinutes: row.estimatedMinutesWatched,
            averageViewDurationSeconds: row.averageViewDuration,
          });

          recordsSynced += 1;
        }
      }

      await client.query(
        `
        UPDATE platform_integration
        SET
          external_account_id = $1,
          account_name = $2,
          status = 'ACTIVE',
          last_synced_at = now(),
          updated_at = now()
        WHERE id = $3
        `,
        [channelId, channelName, integration.id],
      );

      await client.query(
        `
        INSERT INTO platform_activity_log (
          platform,
          external_account_id,
          event_type,
          event_source,
          payload_summary,
          status,
          received_at,
          processed_at
        )
        VALUES (
          'YOUTUBE',
          $1,
          'analytics_sync',
          'SYNC',
          $2,
          'PROCESSED',
          now(),
          now()
        )
        `,
        [
          channelId,
          syncMode === "videos"
            ? `Synced ${topVideos.length} videos (${dateRangeLabel(dateRange)})`
            : syncMode === "analytics"
              ? `Synced analytics metrics (${dateRangeLabel(dateRange)})`
              : syncMode === "channel"
                ? `Synced channel profile (${dateRangeLabel(dateRange)})`
                : `Synced ${topVideos.length} videos and ${aggregateMetrics.length} aggregate metrics (${dateRangeLabel(dateRange)})`,
        ],
      );
    });

    if (syncLogId) {
      await markSyncFinished(syncLogId, recordsSynced);
    }

    return {
      accountId: integration.external_account_id,
      recordsSynced,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "YouTube sync failed unexpectedly.";

    if (syncLogId) {
      await markSyncFailed(syncLogId, message);
    }

    await query(
      `
      UPDATE platform_integration
      SET status = 'ERROR', updated_at = now()
      WHERE id = $1
      `,
      [integration.id],
    );

    throw new Error(message);
  }
}

export async function syncYouTubeAnalytics(input?: {
  accountId?: string | null;
  channelKey?: string | null;
  dateRange?: AnalyticsDateRange;
  syncMode?: YouTubeSyncMode;
}) {
  const integrationRows = filterYouTubeIntegrationsForSync(
    await listYouTubeIntegrations(),
    input,
  );

  const integrations = {
    rows: integrationRows.map((row) => ({
      id: row.id,
      channel_key: row.channel_key,
      external_account_id: row.external_account_id ?? "",
      account_name: row.account_name ?? "YouTube Channel",
      token_reference: row.token_reference,
      scopes: [] as string[],
    })),
  };

  if (!integrations.rows.length) {
    return {
      syncedAccounts: 0,
      recordsSynced: 0,
      message: "No connected YouTube channel found.",
    };
  }

  let totalRecords = 0;

  for (const integration of integrations.rows) {
    const summary = await syncSingleYouTubeIntegration(
      integration,
      input?.dateRange,
      input?.syncMode ?? "full",
    );
    totalRecords += summary.recordsSynced;
  }

  return {
    syncedAccounts: integrations.rows.length,
    recordsSynced: totalRecords,
    message:
      integrations.rows.length === 1
        ? "YouTube sync completed."
        : `YouTube sync completed for ${integrations.rows.length} channels.`,
  };
}

export async function getYouTubeLatestMetricMap(accountId: string) {
  const metrics = await query<YouTubeMetricMapRow>(
    `
    SELECT DISTINCT ON (metric_key)
      metric_key,
      metric_value
    FROM platform_metric_snapshot
    WHERE platform = 'YOUTUBE'
      AND external_account_id = $1
    ORDER BY metric_key, metric_date DESC
    `,
    [accountId],
  );

  const map = new Map<string, number>();
  for (const row of metrics.rows) {
    map.set(row.metric_key, parseMetricNumber(row.metric_value));
  }

  return map;
}

export async function getYouTubeLiveMetricMap(
  accountId: string,
  dateRange?: AnalyticsDateRange,
) {
  const integrationRes = await query<{ token_reference: string | null }>(
    `
    SELECT token_reference
    FROM platform_integration
    WHERE platform = 'YOUTUBE'
      AND external_account_id = $1
      AND status IN ('ACTIVE', 'ERROR')
    ORDER BY updated_at DESC
    LIMIT 1
    `,
    [accountId],
  );

  const tokenReference = integrationRes.rows[0]?.token_reference ?? null;
  if (!tokenReference) {
    return null;
  }

  const oauth = createYouTubeOAuthClient();
  oauth.setCredentials({ refresh_token: tokenReference });

  const [totals, channelResponse] = await Promise.all([
    fetchAnalyticsTotals(oauth, accountId, dateRange),
    google.youtube({ version: "v3", auth: oauth }).channels.list({
      part: ["statistics"],
      id: [accountId],
      maxResults: 1,
    }),
  ]);

  const channel = apiItems(channelResponse.data)[0];
  const subscribersTotal = parseMetricNumber(
    asRecord(channel?.statistics).subscriberCount,
  );
  const subscribersNet = totals.subscribersGained - totals.subscribersLost;

  const map = new Map<string, number>();
  map.set("subscribers_total", subscribersTotal);
  map.set("subscribers_net", subscribersNet);
  map.set("views", totals.views);
  map.set("watch_time_minutes", totals.watchMinutes);
  map.set("avg_view_duration_seconds", totals.averageViewDurationSeconds);
  map.set("likes", totals.likes);
  map.set("comments", totals.comments);
  map.set("shares", totals.shares);

  return map;
}
