CREATE TABLE IF NOT EXISTS ads_campaigns (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
  brand_id INTEGER NOT NULL REFERENCES brand(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('GOOGLE', 'META', 'TIKTOK')),
  campaign_name TEXT NOT NULL,
  objective TEXT NOT NULL,
  spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(8,2),
  roas NUMERIC(8,2),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'ENDED', 'MISSING')),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ads_campaigns_profile_id ON ads_campaigns(profile_id);
CREATE INDEX IF NOT EXISTS idx_ads_campaigns_brand_id ON ads_campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_ads_campaigns_platform ON ads_campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_ads_campaigns_status ON ads_campaigns(status);

CREATE TABLE IF NOT EXISTS google_ads_daily_metrics (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
  brand_id INTEGER NOT NULL REFERENCES brand(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  campaign_id INTEGER REFERENCES ads_campaigns(id) ON DELETE SET NULL ON UPDATE CASCADE,
  metric_date DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  avg_target_cpa NUMERIC(12,2),
  conversions NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  source_file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT google_ads_daily_metrics_import_unique UNIQUE (
    profile_id,
    brand_id,
    metric_date,
    source_file_name
  )
);

CREATE INDEX IF NOT EXISTS idx_google_ads_daily_metrics_profile_id ON google_ads_daily_metrics(profile_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_daily_metrics_brand_id ON google_ads_daily_metrics(brand_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_daily_metrics_metric_date ON google_ads_daily_metrics(metric_date);
