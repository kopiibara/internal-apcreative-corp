-- Generic platform analytics (Meta, TikTok, YouTube, Google).
-- Meta-specific tables from 020 remain; new tables support multi-platform reporting.

INSERT INTO permission (key, module, action, description)
VALUES
  ('platform_analytics.view', 'platform_analytics', 'view', 'View unified Platform Analytics dashboard'),
  ('platform_analytics.manage', 'platform_analytics', 'manage', 'Manage platform analytics connections and sync')
ON CONFLICT (key)
DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = now();

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN ('platform_analytics.view', 'platform_analytics.manage')
WHERE r.slug IN (
  'executive',
  'manager',
  'supervisor',
  'director',
  'marketing-director',
  'full-stack-developer',
  'ads-specialist'
)
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Mirror existing meta_monitoring access for supervisor/manager/executive roles
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN ('platform_analytics.view', 'platform_analytics.manage')
WHERE r.slug IN ('executive', 'manager', 'supervisor', 'director', 'marketing-director', 'full-stack-developer')
ON CONFLICT (role_id, permission_id)
DO NOTHING;

CREATE TABLE IF NOT EXISTS platform_integration (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('META', 'TIKTOK', 'YOUTUBE', 'GOOGLE')),
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  external_account_id TEXT NOT NULL,
  token_reference TEXT,
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'ERROR', 'DEMO')),
  last_synced_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES profile(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_integration_unique UNIQUE (platform, external_account_id, account_type)
);

CREATE INDEX IF NOT EXISTS idx_platform_integration_platform ON platform_integration(platform);
CREATE INDEX IF NOT EXISTS idx_platform_integration_status ON platform_integration(status);

CREATE TABLE IF NOT EXISTS platform_metric_snapshot (
  id BIGSERIAL PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('META', 'TIKTOK', 'YOUTUBE', 'GOOGLE')),
  external_account_id TEXT NOT NULL,
  metric_date DATE NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC(18, 4) NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'API'
    CHECK (source_type IN ('LIVE', 'API', 'WEBHOOK', 'DEMO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_metric_snapshot_unique UNIQUE (platform, external_account_id, metric_date, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_platform_metric_snapshot_lookup
  ON platform_metric_snapshot(platform, external_account_id, metric_date DESC);

CREATE TABLE IF NOT EXISTS platform_content_performance (
  id BIGSERIAL PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('META', 'TIKTOK', 'YOUTUBE', 'GOOGLE')),
  external_account_id TEXT NOT NULL,
  external_content_id TEXT NOT NULL,
  title TEXT,
  content_type TEXT,
  published_at TIMESTAMPTZ,
  thumbnail_url TEXT,
  views_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  shares_count INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(8, 4),
  source_type TEXT NOT NULL DEFAULT 'API'
    CHECK (source_type IN ('LIVE', 'API', 'WEBHOOK', 'DEMO')),
  insights JSONB NOT NULL DEFAULT '{}'::JSONB,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_content_performance_unique UNIQUE (platform, external_content_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_content_performance_account
  ON platform_content_performance(platform, external_account_id, last_synced_at DESC);

CREATE TABLE IF NOT EXISTS platform_campaign_performance (
  id BIGSERIAL PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('META', 'TIKTOK', 'YOUTUBE', 'GOOGLE')),
  external_account_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  spend NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ctr NUMERIC(8, 4),
  cpc NUMERIC(14, 4),
  conversions INTEGER NOT NULL DEFAULT 0,
  cost_per_conversion NUMERIC(14, 4),
  date_range_start DATE,
  date_range_end DATE,
  source_type TEXT NOT NULL DEFAULT 'API'
    CHECK (source_type IN ('LIVE', 'API', 'WEBHOOK', 'DEMO')),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_campaign_performance_unique UNIQUE (platform, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_campaign_performance_account
  ON platform_campaign_performance(platform, external_account_id, last_synced_at DESC);

CREATE TABLE IF NOT EXISTS platform_activity_log (
  id BIGSERIAL PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('META', 'TIKTOK', 'YOUTUBE', 'GOOGLE')),
  external_account_id TEXT,
  event_type TEXT,
  event_source TEXT NOT NULL DEFAULT 'WEBHOOK'
    CHECK (event_source IN ('WEBHOOK', 'API', 'SYNC', 'DEMO')),
  payload_summary TEXT,
  status TEXT NOT NULL DEFAULT 'RECEIVED'
    CHECK (status IN ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error_log TEXT
);

CREATE INDEX IF NOT EXISTS idx_platform_activity_log_platform_received
  ON platform_activity_log(platform, received_at DESC);

CREATE TABLE IF NOT EXISTS platform_sync_log (
  id BIGSERIAL PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('META', 'TIKTOK', 'YOUTUBE', 'GOOGLE')),
  external_account_id TEXT,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('STARTED', 'SUCCESS', 'FAILED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  records_synced INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_platform_sync_log_platform_started
  ON platform_sync_log(platform, started_at DESC);
