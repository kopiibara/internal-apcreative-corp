export type MetaWebhookProcessingStatus =
  | "UNPROCESSED"
  | "PROCESSING"
  | "PROCESSED"
  | "FAILED"

export type MetaSyncType =
  | "hourly_posts"
  | "daily_page"
  | "daily_insights"
  | "weekly_summary"
  | "monthly_summary"

export type MetaWebhookPayload = {
  object?: string
  entry?: MetaWebhookEntry[]
}

export type MetaWebhookEntry = {
  id?: string
  time?: number
  changes?: MetaWebhookChange[]
}

export type MetaWebhookChange = {
  field?: string
  value?: MetaWebhookChangeValue
}

export type MetaWebhookChangeValue = {
  item?: string
  verb?: string
  post_id?: string
  comment_id?: string
  parent_id?: string
  from?: { id?: string; name?: string }
  message?: string
  created_time?: number
  [key: string]: unknown
}

export type MetaFacebookPageRow = {
  id: number
  facebook_page_id: string
  page_name: string
  brand_id: number | null
  access_token_env_key: string | null
  is_active: boolean
  webhook_subscribed_fields: string[]
  last_synced_at: Date | null
}

export type MetaWebhookEventRow = {
  id: number
  event_id: string
  object_type: string
  page_id: string | null
  field_name: string | null
  post_id: string | null
  comment_id: string | null
  sender_id: string | null
  event_type: string | null
  raw_payload: Record<string, unknown>
  processing_status: MetaWebhookProcessingStatus
  received_at: Date
  processed_at: Date | null
  error_log: string | null
}

export type MetaPageDailySnapshotRow = {
  id: number
  facebook_page_id: string
  snapshot_date: string
  followers_count: number | null
  page_likes: number | null
  metrics: Record<string, unknown>
}

export type MetaPostMetricsRow = {
  id: number
  facebook_page_id: string
  post_id: string
  message: string | null
  permalink: string | null
  published_at: Date | null
  reactions_count: number
  comments_count: number
  shares_count: number
  engagement_rate: string | null
  performance_rank: number | null
  insights: Record<string, unknown>
  last_synced_at: Date
}

/** Sync run row shape for dashboards (safe to share with client components). */
export type MetaSyncRunSummary = {
  id: number
  sync_type: string
  facebook_page_id: string | null
  status: string
  started_at: Date | string
  finished_at: Date | string | null
  records_affected: number
  error_log: string | null
}
