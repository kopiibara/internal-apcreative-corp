import type {
  ActivityLogRow,
  CampaignPerformanceRow,
  ContentPerformanceRow,
  GrowthSnapshotRow,
  KpiMetric,
  PlatformAccount,
  PlatformConnectionStatus,
  SyncLogRow,
} from "@/lib/platform-analytics/types"

const DEMO_SYNCED = "Demo only"
const DEMO_SOURCE = "Demo Data"

function demoKpis(
  items: Array<{ label: string; value: string | number; hint?: string }>
): KpiMetric[] {
  return items.map((item) => ({ ...item, isDemo: true }))
}

export const TIKTOK_DEMO_ACCOUNT: PlatformAccount = {
  id: "demo_tiktok_account",
  platform: "TIKTOK",
  accountType: "tiktok_account",
  accountName: "Demo Account",
  externalAccountId: "demo_tiktok_account",
  isDemo: true,
  lastSyncedAt: DEMO_SYNCED,
}

export const YOUTUBE_DEMO_ACCOUNT: PlatformAccount = {
  id: "demo_youtube_channel",
  platform: "YOUTUBE",
  accountType: "youtube_channel",
  accountName: "Demo Channel",
  externalAccountId: "demo_youtube_channel",
  isDemo: true,
  lastSyncedAt: DEMO_SYNCED,
}

export const GOOGLE_DEMO_ACCOUNT: PlatformAccount = {
  id: "demo_google_ads",
  platform: "GOOGLE",
  accountType: "google_ads_account",
  accountName: "Demo Google Ads Account",
  externalAccountId: "demo_google_ads",
  isDemo: true,
  lastSyncedAt: DEMO_SYNCED,
}

export function getTikTokDemoConnection(): PlatformConnectionStatus {
  return {
    platform: "TIKTOK",
    isDemo: true,
    apiConnected: false,
    webhookSupported: true,
    webhookConfigured: false,
    cronConfigured: false,
    connectedAccountsCount: 1,
    lastSyncAt: DEMO_SYNCED,
    lastSyncError: null,
    tokenStatus: "Demo",
    syncHealth: "Demo",
    statusRows: [
      { label: "TikTok webhook status", ok: false, detail: "Demo / Not connected" },
      { label: "TikTok account connection", ok: false, detail: "Demo / Not connected" },
      { label: "Access token status", ok: false, detail: "Demo / Not connected" },
      { label: "Last sync", ok: false, detail: DEMO_SYNCED },
      { label: "Connected account", ok: true, detail: "Demo Account" },
    ],
  }
}

export function getYouTubeDemoConnection(): PlatformConnectionStatus {
  return {
    platform: "YOUTUBE",
    isDemo: true,
    apiConnected: false,
    webhookSupported: true,
    webhookConfigured: false,
    cronConfigured: false,
    connectedAccountsCount: 1,
    lastSyncAt: DEMO_SYNCED,
    lastSyncError: null,
    tokenStatus: "Demo",
    syncHealth: "Demo",
    statusRows: [
      { label: "YouTube webhook status", ok: false, detail: "Demo / Not connected" },
      { label: "Channel connection", ok: false, detail: "Demo / Not connected" },
      { label: "Google OAuth status", ok: false, detail: "Demo / Not connected" },
      { label: "Last sync", ok: false, detail: DEMO_SYNCED },
      { label: "Connected channel", ok: true, detail: "Demo Channel" },
    ],
  }
}

export function getGoogleDemoConnection(): PlatformConnectionStatus {
  return {
    platform: "GOOGLE",
    isDemo: true,
    apiConnected: false,
    webhookSupported: false,
    webhookConfigured: false,
    cronConfigured: false,
    connectedAccountsCount: 1,
    lastSyncAt: DEMO_SYNCED,
    lastSyncError: null,
    tokenStatus: "Demo",
    syncHealth: "Demo",
    statusRows: [
      { label: "Google webhook status", ok: false, detail: "Demo / Not connected" },
      { label: "Google Ads account connection", ok: false, detail: "Demo / Not connected" },
      { label: "Developer token status", ok: false, detail: "Demo / Not connected" },
      { label: "Customer ID status", ok: false, detail: "Demo / Not connected" },
      { label: "Last sync", ok: false, detail: DEMO_SYNCED },
      { label: "Connected account", ok: true, detail: "Demo Google Ads Account" },
    ],
  }
}

export function getTikTokDemoKpis() {
  const overview = demoKpis([
    { label: "Followers", value: "18,420" },
    { label: "New followers", value: "276" },
    { label: "Video views", value: "94,800" },
    { label: "Likes", value: "4,950" },
    { label: "Comments", value: "480" },
    { label: "Shares", value: "780" },
    { label: "Engagement rate", value: "6.55%" },
    { label: "Profile views", value: "3,240" },
    { label: "Top video", value: "Weekend Bar Crowd Teaser" },
    { label: "Top video views", value: "29,600" },
  ])
  const engagement = demoKpis([
    { label: "Likes", value: "4,950" },
    { label: "Comments", value: "480" },
    { label: "Shares", value: "780" },
    { label: "Engagement rate", value: "6.55%" },
    { label: "Profile views", value: "3,240" },
  ])
  const audience = demoKpis([
    { label: "Followers", value: "18,420" },
    { label: "New followers", value: "276" },
    { label: "Profile views", value: "3,240" },
  ])
  return { overview, engagement, audience }
}

export function getYouTubeDemoKpis() {
  const overview = demoKpis([
    { label: "Subscribers", value: "7,850" },
    { label: "New subscribers", value: "88" },
    { label: "Views", value: "32,400" },
    { label: "Watch time", value: "1,240 hours" },
    { label: "Average view duration", value: "2 minutes 18 seconds" },
    { label: "Likes", value: "1,930" },
    { label: "Comments", value: "164" },
    { label: "Shares", value: "92" },
    { label: "Top video", value: "Neon Nights Event Recap" },
    { label: "Top video views", value: "12,900" },
  ])
  const engagement = demoKpis([
    { label: "Likes", value: "1,930" },
    { label: "Comments", value: "164" },
    { label: "Shares", value: "92" },
    { label: "Average view duration", value: "2m 18s" },
  ])
  const audience = demoKpis([
    { label: "Subscribers", value: "7,850" },
    { label: "New subscribers", value: "88" },
    { label: "Watch time", value: "1,240 hours" },
  ])
  return { overview, engagement, audience }
}

export function getGoogleDemoKpis() {
  const overview = demoKpis([
    { label: "Impressions", value: "412,500" },
    { label: "Clicks", value: "18,230" },
    { label: "CTR", value: "4.42%" },
    { label: "Average CPC", value: "₱7.80" },
    { label: "Spend", value: "₱142,194" },
    { label: "Leads / Conversions", value: "486" },
    { label: "Cost per lead", value: "₱292.58" },
    { label: "Active campaigns", value: 8 },
    { label: "Top campaign", value: "Father's Day Bundle Campaign" },
  ])
  const engagement: KpiMetric[] = []
  const audience = demoKpis([
    { label: "Top campaign", value: "Father's Day Bundle Campaign" },
    { label: "Cost per lead", value: "₱292.58" },
    { label: "Active campaigns", value: 8 },
  ])
  return { overview, engagement, audience }
}

export function getTikTokDemoContent(): ContentPerformanceRow[] {
  return [
    {
      id: "tt-1",
      rank: 1,
      title: "Weekend Bar Crowd Teaser",
      publishedAt: "2026-05-10T18:00:00Z",
      views: 29600,
      likes: 2100,
      comments: 180,
      shares: 320,
      engagementRate: "6.55",
      impressions: null,
      engaged: null,
      clicks: null,
      watchTime: null,
      avgViewDuration: null,
      profileVisits: 1240,
      source: DEMO_SOURCE,
      link: null,
      isDemo: true,
    },
    {
      id: "tt-2",
      rank: 2,
      title: "Product Drop Reveal",
      publishedAt: "2026-05-05T14:00:00Z",
      views: 21400,
      likes: 1680,
      comments: 142,
      shares: 210,
      engagementRate: "5.92",
      impressions: null,
      engaged: null,
      clicks: null,
      watchTime: null,
      avgViewDuration: null,
      profileVisits: 890,
      source: DEMO_SOURCE,
      link: null,
      isDemo: true,
    },
  ]
}

export function getYouTubeDemoContent(): ContentPerformanceRow[] {
  return [
    {
      id: "yt-1",
      rank: 1,
      title: "Neon Nights Event Recap",
      publishedAt: "2026-05-08T12:00:00Z",
      views: 12900,
      likes: 890,
      comments: 72,
      shares: 41,
      engagementRate: "4.12",
      impressions: null,
      engaged: null,
      clicks: null,
      watchTime: "420 hours",
      avgViewDuration: "2m 24s",
      profileVisits: null,
      source: DEMO_SOURCE,
      link: null,
      isDemo: true,
    },
  ]
}

export function getGoogleDemoCampaigns(): CampaignPerformanceRow[] {
  return [
    {
      id: "g-1",
      campaignName: "Father's Day Bundle Campaign",
      status: "Active",
      impressions: 182400,
      clicks: 9200,
      ctr: "5.04%",
      cpc: "₱6.90",
      spend: "₱63,480",
      conversions: 214,
      costPerConversion: "₱296.64",
      source: DEMO_SOURCE,
      isDemo: true,
    },
    {
      id: "g-2",
      campaignName: "Brand Awareness — Metro",
      status: "Active",
      impressions: 128000,
      clicks: 5100,
      ctr: "3.98%",
      cpc: "₱8.40",
      spend: "₱42,840",
      conversions: 96,
      costPerConversion: "₱446.25",
      source: DEMO_SOURCE,
      isDemo: true,
    },
  ]
}

export function getDemoGrowthSnapshots(
  platform: "TIKTOK" | "YOUTUBE"
): GrowthSnapshotRow[] {
  if (platform === "TIKTOK") {
    return [
      {
        id: "tt-s1",
        date: "2026-05-24",
        followers: 18420,
        secondaryLabel: "Video views",
        secondaryValue: 94800,
      },
      {
        id: "tt-s2",
        date: "2026-05-23",
        followers: 18144,
        secondaryLabel: "Video views",
        secondaryValue: 91200,
      },
    ]
  }
  return [
    {
      id: "yt-s1",
      date: "2026-05-24",
      followers: 7850,
      secondaryLabel: "Views",
      secondaryValue: 32400,
    },
    {
      id: "yt-s2",
      date: "2026-05-23",
      followers: 7762,
      secondaryLabel: "Views",
      secondaryValue: 30100,
    },
  ]
}

export function getDemoActivityLogs(
  platform: "TIKTOK" | "YOUTUBE" | "GOOGLE"
): ActivityLogRow[] {
  return [
    {
      id: `${platform}-demo-1`,
      platform,
      eventType: "webhook_placeholder",
      status: "DEMO",
      receivedAt: new Date().toISOString(),
      summary: "Webhook integration pending — sample log entry",
      isDemo: true,
    },
  ]
}

export function getDemoSyncHistory(
  platform: "TIKTOK" | "YOUTUBE" | "GOOGLE"
): SyncLogRow[] {
  return [
    {
      id: `${platform}-sync-demo`,
      platform,
      syncType: "scheduled_metrics",
      accountId: "demo",
      status: "DEMO",
      startedAt: new Date().toISOString(),
      recordsSynced: 0,
      errorMessage: null,
      isDemo: true,
    },
  ]
}

export function buildDemoPlatformSlice(platform: "TIKTOK" | "YOUTUBE" | "GOOGLE") {
  if (platform === "TIKTOK") {
    const kpis = getTikTokDemoKpis()
    return {
      accounts: [TIKTOK_DEMO_ACCOUNT],
      connection: getTikTokDemoConnection(),
      overviewKpis: kpis.overview,
      engagementKpis: kpis.engagement,
      audienceInsightKpis: kpis.audience,
      growthSnapshots: getDemoGrowthSnapshots("TIKTOK"),
      contentPerformance: getTikTokDemoContent(),
      campaignPerformance: [] as CampaignPerformanceRow[],
      activityLogs: getDemoActivityLogs("TIKTOK"),
      syncHistory: getDemoSyncHistory("TIKTOK"),
      metaNeedsBootstrap: false,
      isDemo: true,
    }
  }
  if (platform === "YOUTUBE") {
    const kpis = getYouTubeDemoKpis()
    return {
      accounts: [YOUTUBE_DEMO_ACCOUNT],
      connection: getYouTubeDemoConnection(),
      overviewKpis: kpis.overview,
      engagementKpis: kpis.engagement,
      audienceInsightKpis: kpis.audience,
      growthSnapshots: getDemoGrowthSnapshots("YOUTUBE"),
      contentPerformance: getYouTubeDemoContent(),
      campaignPerformance: [] as CampaignPerformanceRow[],
      activityLogs: getDemoActivityLogs("YOUTUBE"),
      syncHistory: getDemoSyncHistory("YOUTUBE"),
      metaNeedsBootstrap: false,
      isDemo: true,
    }
  }
  const kpis = getGoogleDemoKpis()
  return {
    accounts: [GOOGLE_DEMO_ACCOUNT],
    connection: getGoogleDemoConnection(),
    overviewKpis: kpis.overview,
    engagementKpis: kpis.engagement,
    audienceInsightKpis: kpis.audience,
    growthSnapshots: [] as GrowthSnapshotRow[],
    contentPerformance: [] as ContentPerformanceRow[],
    campaignPerformance: getGoogleDemoCampaigns(),
    activityLogs: getDemoActivityLogs("GOOGLE"),
    syncHistory: getDemoSyncHistory("GOOGLE"),
    metaNeedsBootstrap: false,
    isDemo: true,
  }
}
