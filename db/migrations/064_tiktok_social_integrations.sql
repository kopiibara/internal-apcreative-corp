-- TikTok brand-level OAuth integrations and analytics snapshots

CREATE TYPE social_integration_provider AS ENUM ('TIKTOK');

CREATE TYPE social_integration_status AS ENUM (
  'ACTIVE',
  'ERROR',
  'RECONNECT_REQUIRED',
  'DISCONNECTED'
);

CREATE TABLE social_integrations (
  id BIGSERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brand (id) ON DELETE CASCADE,
  provider social_integration_provider NOT NULL DEFAULT 'TIKTOK',
  account_id TEXT NOT NULL,
  account_name TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  status social_integration_status NOT NULL DEFAULT 'ACTIVE',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT social_integrations_brand_provider_account_unique
    UNIQUE (brand_id, provider, account_id)
);

CREATE INDEX social_integrations_brand_provider_idx
  ON social_integrations (brand_id, provider);

CREATE INDEX social_integrations_status_idx
  ON social_integrations (status)
  WHERE status = 'ACTIVE';

CREATE TABLE tiktok_account_snapshots (
  id BIGSERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brand (id) ON DELETE CASCADE,
  integration_id BIGINT NOT NULL REFERENCES social_integrations (id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  follower_count BIGINT,
  following_count BIGINT,
  likes_count BIGINT,
  video_count BIGINT,
  profile_deep_link TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tiktok_account_snapshots_unique
    UNIQUE (integration_id, snapshot_date)
);

CREATE INDEX tiktok_account_snapshots_brand_date_idx
  ON tiktok_account_snapshots (brand_id, snapshot_date DESC);

CREATE TABLE tiktok_video_posts (
  id BIGSERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brand (id) ON DELETE CASCADE,
  integration_id BIGINT NOT NULL REFERENCES social_integrations (id) ON DELETE CASCADE,
  tiktok_video_id TEXT NOT NULL,
  title TEXT,
  cover_image_url TEXT,
  embed_link TEXT,
  duration INTEGER,
  create_time TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tiktok_video_posts_unique
    UNIQUE (integration_id, tiktok_video_id)
);

CREATE INDEX tiktok_video_posts_brand_idx
  ON tiktok_video_posts (brand_id, create_time DESC NULLS LAST);

CREATE TABLE tiktok_video_snapshots (
  id BIGSERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brand (id) ON DELETE CASCADE,
  integration_id BIGINT NOT NULL REFERENCES social_integrations (id) ON DELETE CASCADE,
  tiktok_video_id TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  view_count BIGINT,
  like_count BIGINT,
  comment_count BIGINT,
  share_count BIGINT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tiktok_video_snapshots_unique
    UNIQUE (integration_id, tiktok_video_id, snapshot_date)
);

CREATE INDEX tiktok_video_snapshots_brand_date_idx
  ON tiktok_video_snapshots (brand_id, snapshot_date DESC);
