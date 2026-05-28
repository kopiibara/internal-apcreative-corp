-- Add brand scoping to Meta analytics storage.
-- Required for multi-page / multi-brand Meta connections (e.g., Neon Nights + Al Qaysar).

ALTER TABLE meta_page_daily_snapshot
ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brand(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE meta_post_metrics
ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brand(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE meta_sync_run
ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brand(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill brand_id from meta_facebook_page mapping.
UPDATE meta_page_daily_snapshot s
SET brand_id = p.brand_id
FROM meta_facebook_page p
WHERE p.facebook_page_id = s.facebook_page_id
  AND s.brand_id IS NULL;

UPDATE meta_post_metrics m
SET brand_id = p.brand_id
FROM meta_facebook_page p
WHERE p.facebook_page_id = m.facebook_page_id
  AND m.brand_id IS NULL;

UPDATE meta_sync_run r
SET brand_id = p.brand_id
FROM meta_facebook_page p
WHERE p.facebook_page_id = r.facebook_page_id
  AND r.brand_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_meta_page_daily_snapshot_brand_id
ON meta_page_daily_snapshot(brand_id);

CREATE INDEX IF NOT EXISTS idx_meta_post_metrics_brand_id
ON meta_post_metrics(brand_id);

CREATE INDEX IF NOT EXISTS idx_meta_sync_run_brand_id
ON meta_sync_run(brand_id);

