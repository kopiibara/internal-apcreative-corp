import type { MetaSyncRunSummary } from "@/lib/meta/types"
import type { MetaMetricDisplayState } from "@/lib/platform-analytics/format"

export type MetaPageConfigKey = string

export type ResolvedPageTokenSource = "env_page_token" | "env_user_token_resolved"

export type MetaBusinessPageInsightSummary = {
  pageImpressions: number | null
  pageImpressionsUnique: number | null
  pageEngagedUsers: number | null
  pagePostEngagements: number | null
  pageViewsTotal: number | null
  pageFanAdds: number | null
  pageFans: number | null
  pageFollows: number | null
  insightsUnavailable: boolean
  insightsPermissionDenied: boolean
  insightsSyncFailed: boolean
}

export type MetaBusinessPagePostRow = {
  id: number
  postId: string
  message: string | null
  publishedAt: string | null
  permalink: string | null
  imageUrl: string | null
  postType: string | null
  reactions: number
  comments: number
  shares: number
  engagementTotal: number
}

export type MetaPostPreviewSection = {
  totalSynced: number
  lastPostsSyncAt: string | null
  topPerforming: MetaBusinessPagePostRow | null
  topPerformingState: MetaMetricDisplayState
  topPosts: MetaBusinessPagePostRow[]
  latestPosts: MetaBusinessPagePostRow[]
}

export type MetaCapabilityStatus =
  | "Available"
  | "Connected"
  | "Not connected yet"
  | "Permission required"
  | "Sync failed"
  | "No live data yet"

export type MetaPermissionCapabilities = {
  pageAccessToken: "OK" | "Missing" | "Expired" | "Invalid"
  pageSummary: MetaCapabilityStatus
  posts: MetaCapabilityStatus
  insights: MetaCapabilityStatus
  webhooks: "Connected" | "Not connected"
  ads: "Not connected" | "Available"
}

export type MetaSyncJobDisplayStatus = "Success" | "Failed" | "Never"

export type MetaSourceSyncStatus =
  | "success"
  | "partial"
  | "failed"
  | "missing_token"
  | "no_data"

export type MetaBusinessPageDashboard = {
  key: MetaPageConfigKey
  displayName: string
  platformLabel: string
  dateRangeLabel: string
  facebookPageId: string | null
  pageName: string | null
  connectionStatus: "Connected" | "Not connected" | "Needs configuration"
  facebookPageStatus: "Connected" | "Not connected"
  instagramStatus: "Not connected yet"
  pageAccessTokenStatus: "OK" | "Missing" | "Expired" | "Invalid"
  cronStatus: "OK" | "Missing"
  tokenSource: ResolvedPageTokenSource | null
  tokenResolutionHint: string | null
  lastSyncAt: string | null
  pageSummarySyncStatus: MetaSourceSyncStatus
  postsSyncStatus: MetaSourceSyncStatus
  insightsSyncStatus: MetaSourceSyncStatus
  postsSyncStatusLegacy: MetaSyncJobDisplayStatus
  insightsSyncStatusLegacy: MetaSyncJobDisplayStatus
  postsUnavailableMessage: string | null
  permissions: MetaPermissionCapabilities
  metrics: {
    totalFollowers: number | null
    pageLikes: number | null
    newFollowers: number | null
    newLikes: number | null
    postEngagements: number | null
    reactions: number
    comments: number
    shares: number
    reach: number | null
    impressions: number | null
    profileVisits: number | null
    linkClicks: number | null
    topPerformingPost: string | null
    topPerformingPostId: string | null
    states: {
      totalFollowers: MetaMetricDisplayState
      pageLikes: MetaMetricDisplayState
      newFollowers: MetaMetricDisplayState
      newLikes: MetaMetricDisplayState
      postEngagements: MetaMetricDisplayState
      reactions: MetaMetricDisplayState
      comments: MetaMetricDisplayState
      shares: MetaMetricDisplayState
      reach: MetaMetricDisplayState
      impressions: MetaMetricDisplayState
      profileVisits: MetaMetricDisplayState
      linkClicks: MetaMetricDisplayState
      topPerformingPost: MetaMetricDisplayState
    }
  }
  insights: MetaBusinessPageInsightSummary
  postPreview: MetaPostPreviewSection
  growthSnapshots: Array<{
    id: number
    date: string
    followers: number | null
    pageLikes: number | null
  }>
  recentSyncRuns: MetaSyncRunSummary[]
}
