ALTER TABLE google_ads_daily_metrics
ADD COLUMN IF NOT EXISTS conversion_value NUMERIC(14,2),
ADD COLUMN IF NOT EXISTS conversion_value_per_click NUMERIC(14,2),
ADD COLUMN IF NOT EXISTS import_template TEXT,
ADD COLUMN IF NOT EXISTS raw_metrics JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE google_ads_daily_metrics
DROP CONSTRAINT IF EXISTS google_ads_daily_metrics_import_unique;

ALTER TABLE google_ads_daily_metrics
ADD CONSTRAINT google_ads_daily_metrics_daily_unique UNIQUE (profile_id, brand_id, metric_date);
