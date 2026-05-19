CREATE TABLE IF NOT EXISTS rate_limit_bucket (
  id SERIAL PRIMARY KEY,
  rate_key TEXT NOT NULL,
  bucket TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rate_limit_bucket_unique UNIQUE (rate_key, bucket)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_bucket_expires_at
ON rate_limit_bucket(expires_at);

CREATE INDEX IF NOT EXISTS idx_rate_limit_bucket_rate_key_bucket
ON rate_limit_bucket(rate_key, bucket);
