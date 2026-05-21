-- Meta / Facebook Page monitoring: webhooks, analytics snapshots, post metrics.

INSERT INTO permission (key, module, action, description)
VALUES
  ('meta_monitoring.view', 'meta_monitoring', 'view', 'View Facebook Page monitoring and analytics'),
  ('meta_monitoring.manage', 'meta_monitoring', 'manage', 'Manage Facebook Page connections and sync settings')
ON CONFLICT (key)
DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = now();

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN ('meta_monitoring.view', 'meta_monitoring.manage')
WHERE r.slug IN (
  'executive',
  'manager',
  'supervisor',
  'director',
  'marketing-director',
  'full-stack-developer'
)
ON CONFLICT (role_id, permission_id)
DO NOTHING;

CREATE TABLE IF NOT EXISTS meta_facebook_page (
  id SERIAL PRIMARY KEY,
  facebook_page_id TEXT NOT NULL UNIQUE,
  page_name TEXT NOT NULL,
  brand_id INTEGER REFERENCES brand(id) ON DELETE SET NULL ON UPDATE CASCADE,
  access_token_env_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  webhook_subscribed_fields TEXT[] NOT NULL DEFAULT ARRAY['feed']::TEXT[],
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_facebook_page_brand_id ON meta_facebook_page(brand_id);
CREATE INDEX IF NOT EXISTS idx_meta_facebook_page_is_active ON meta_facebook_page(is_active);

CREATE TABLE IF NOT EXISTS meta_webhook_event (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  object_type TEXT NOT NULL,
  page_id TEXT,
  field_name TEXT,
  post_id TEXT,
  comment_id TEXT,
  sender_id TEXT,
  event_type TEXT,
  raw_payload JSONB NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'UNPROCESSED'
    CHECK (processing_status IN ('UNPROCESSED', 'PROCESSING', 'PROCESSED', 'FAILED')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error_log TEXT
);

CREATE INDEX IF NOT EXISTS idx_meta_webhook_event_page_id ON meta_webhook_event(page_id);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_event_processing_status ON meta_webhook_event(processing_status);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_event_received_at ON meta_webhook_event(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_event_event_type ON meta_webhook_event(event_type);

CREATE TABLE IF NOT EXISTS meta_page_daily_snapshot (
  id SERIAL PRIMARY KEY,
  facebook_page_id TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  followers_count INTEGER,
  page_likes INTEGER,
  metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT meta_page_daily_snapshot_unique UNIQUE (facebook_page_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_meta_page_daily_snapshot_date ON meta_page_daily_snapshot(snapshot_date DESC);

CREATE TABLE IF NOT EXISTS meta_post_metrics (
  id SERIAL PRIMARY KEY,
  facebook_page_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  message TEXT,
  permalink TEXT,
  published_at TIMESTAMPTZ,
  reactions_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  shares_count INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(8, 4),
  performance_rank INTEGER,
  insights JSONB NOT NULL DEFAULT '{}'::JSONB,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT meta_post_metrics_unique UNIQUE (facebook_page_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_post_metrics_page_synced ON meta_post_metrics(facebook_page_id, last_synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_post_metrics_rank ON meta_post_metrics(facebook_page_id, performance_rank);

CREATE TABLE IF NOT EXISTS meta_sync_run (
  id SERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('hourly_posts', 'daily_page', 'weekly_summary', 'monthly_summary')),
  facebook_page_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('STARTED', 'SUCCESS', 'FAILED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  records_affected INTEGER NOT NULL DEFAULT 0,
  error_log TEXT
);

CREATE INDEX IF NOT EXISTS idx_meta_sync_run_type_started ON meta_sync_run(sync_type, started_at DESC);
