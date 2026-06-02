-- YouTube multi-channel: link OAuth integrations to configured channel keys.

ALTER TABLE platform_integration
  ADD COLUMN IF NOT EXISTS channel_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_integration_youtube_channel_key
  ON platform_integration (platform, channel_key)
  WHERE platform = 'YOUTUBE'
    AND channel_key IS NOT NULL
    AND status IN ('ACTIVE', 'ERROR');

CREATE INDEX IF NOT EXISTS idx_platform_integration_channel_key
  ON platform_integration (channel_key)
  WHERE channel_key IS NOT NULL;
