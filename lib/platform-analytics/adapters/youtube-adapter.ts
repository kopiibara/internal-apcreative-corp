import "server-only";

import type { AnalyticsDateRange } from "@/lib/platform-analytics/types";
import type { PlatformAccount } from "@/lib/platform-analytics/types";
import {
  buildYouTubeAccountsFromChannels,
  combineYouTubeChannelDashboards,
} from "@/lib/youtube/combine-channel-analytics";
import { getYouTubeChannelsAnalytics } from "@/lib/youtube/channel-analytics";
import type { YouTubeChannelDashboard } from "@/lib/youtube/channel-analytics-types";
import { getEnabledYouTubeChannels } from "@/lib/youtube/channels-config";

export function buildYouTubeDisplaySliceFromChannels(
  youtubeChannelAnalytics: YouTubeChannelDashboard[],
  channelKey: string | null,
  dateRange?: AnalyticsDateRange,
) {
  const isAllView = !channelKey || channelKey === "all";
  const selectedChannel = isAllView
    ? null
    : youtubeChannelAnalytics.find((channel) => channel.key === channelKey) ??
      null;

  const sliceSource = isAllView
    ? combineYouTubeChannelDashboards(youtubeChannelAnalytics, dateRange)
    : selectedChannel ?? {
        overviewKpis: [],
        engagementKpis: [],
        audienceInsightKpis: [],
        growthSnapshots: [],
        contentPerformance: [],
        charts: [],
        activityLogs: [],
        syncHistory: [],
        connection: {
          platform: "YOUTUBE" as const,
          isDemo: false,
          apiConnected: false,
          webhookSupported: true,
          webhookConfigured: false,
          cronConfigured: true,
          connectedAccountsCount: 0,
          lastSyncAt: null,
          lastSyncError: null,
          tokenStatus: "Missing" as const,
          syncHealth: "Needs sync" as const,
          statusRows: [
            {
              label: "Channel connection",
              ok: false,
              detail: "Not connected",
            },
          ],
        },
        statusMessage: "This YouTube channel is not connected yet.",
      };

  return {
    selectedChannel,
    selectedChannelDisplayName: isAllView
      ? "All YouTube Channels"
      : (selectedChannel?.displayName ?? channelKey),
    channelStatusMessage: isAllView
      ? sliceSource.statusMessage
      : (selectedChannel?.statusMessage ?? sliceSource.statusMessage),
    connection: sliceSource.connection,
    overviewKpis: sliceSource.overviewKpis,
    engagementKpis: sliceSource.engagementKpis,
    audienceInsightKpis: sliceSource.audienceInsightKpis,
    growthSnapshots: sliceSource.growthSnapshots,
    contentPerformance: sliceSource.contentPerformance,
    activityLogs: sliceSource.activityLogs,
    syncHistory: sliceSource.syncHistory,
    charts: sliceSource.charts,
  };
}

export async function loadYouTubePlatformSlice(
  channelKey: string | null,
  dateRange?: AnalyticsDateRange,
) {
  const youtubeChannelAnalytics = await getYouTubeChannelsAnalytics({
    dateRange,
  });

  const enabledCount = getEnabledYouTubeChannels().length;
  const isAllView = !channelKey || channelKey === "all";
  const display = buildYouTubeDisplaySliceFromChannels(
    youtubeChannelAnalytics,
    channelKey,
    dateRange,
  );

  const accounts: PlatformAccount[] =
    buildYouTubeAccountsFromChannels(youtubeChannelAnalytics);

  return {
    accounts,
    youtubeChannelAnalytics,
    enabledChannelCount: enabledCount,
    selectedChannelKey: isAllView ? "all" : channelKey,
    selectedChannelDisplayName: display.selectedChannelDisplayName,
    channelStatusMessage: display.channelStatusMessage,
    connection: display.connection,
    overviewKpis: display.overviewKpis,
    engagementKpis: display.engagementKpis,
    audienceInsightKpis: display.audienceInsightKpis,
    growthSnapshots: display.growthSnapshots,
    contentPerformance: display.contentPerformance,
    campaignPerformance: [],
    activityLogs: display.activityLogs,
    syncHistory: display.syncHistory,
    charts: display.charts,
    metaNeedsBootstrap: false,
    isDemo: false,
  };
}

export function youtubeChannelKeyFromFilter(accountId: string | null) {
  if (!accountId || accountId === "all") {
    return null;
  }
  return accountId;
}

/** @deprecated Use youtubeChannelKeyFromFilter — accountId param stores channel key for YouTube. */
export function youtubeAccountIdFromFilter(accountId: string | null) {
  return youtubeChannelKeyFromFilter(accountId);
}

export type { YouTubeChannelDashboard };
