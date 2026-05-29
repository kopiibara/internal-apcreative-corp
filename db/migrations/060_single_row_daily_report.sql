BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- One daily progress report row is now the submission itself.
-- Multiple selected brands are stored in a bridge table instead of creating one report row per brand.
ALTER TABLE daily_progress_report
ADD COLUMN IF NOT EXISTS submission_id UUID DEFAULT gen_random_uuid();

UPDATE daily_progress_report
SET submission_id = gen_random_uuid()
WHERE submission_id IS NULL;

ALTER TABLE daily_progress_report
ALTER COLUMN submission_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS daily_progress_report_submission_id_unique
ON daily_progress_report (submission_id);

CREATE TABLE IF NOT EXISTS daily_progress_report_brand (
  daily_progress_report_id INTEGER NOT NULL REFERENCES daily_progress_report(id) ON DELETE CASCADE ON UPDATE CASCADE,
  brand_id INTEGER NOT NULL REFERENCES brand(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (daily_progress_report_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_progress_report_brand_brand_id
ON daily_progress_report_brand (brand_id);

-- Backfill bridge rows from the old single brand_id column.
INSERT INTO daily_progress_report_brand (daily_progress_report_id, brand_id)
SELECT id, brand_id
FROM daily_progress_report
WHERE brand_id IS NOT NULL
ON CONFLICT (daily_progress_report_id, brand_id)
DO NOTHING;

-- If a previous multi-brand-per-row migration created duplicates, merge duplicate report rows
-- back into one report row per employee/date before restoring the one-report-per-date rule.
WITH ranked AS (
  SELECT
    id,
    profile_id,
    report_date,
    MIN(id) OVER (PARTITION BY profile_id, report_date) AS keeper_id
  FROM daily_progress_report
), duplicate_brands AS (
  SELECT DISTINCT
    ranked.keeper_id AS daily_progress_report_id,
    COALESCE(report_brand.brand_id, duplicate_report.brand_id) AS brand_id
  FROM ranked
  JOIN daily_progress_report duplicate_report ON duplicate_report.id = ranked.id
  LEFT JOIN daily_progress_report_brand report_brand
    ON report_brand.daily_progress_report_id = duplicate_report.id
  WHERE ranked.id <> ranked.keeper_id
    AND COALESCE(report_brand.brand_id, duplicate_report.brand_id) IS NOT NULL
)
INSERT INTO daily_progress_report_brand (daily_progress_report_id, brand_id)
SELECT daily_progress_report_id, brand_id
FROM duplicate_brands
ON CONFLICT (daily_progress_report_id, brand_id)
DO NOTHING;

DELETE FROM daily_progress_report dpr
USING (
  SELECT
    id,
    MIN(id) OVER (PARTITION BY profile_id, report_date) AS keeper_id
  FROM daily_progress_report
) ranked
WHERE dpr.id = ranked.id
  AND ranked.id <> ranked.keeper_id;

-- Remove the old per-brand uniqueness indexes if they were added.
DROP INDEX IF EXISTS daily_progress_report_profile_date_brand_unique;
DROP INDEX IF EXISTS daily_progress_report_profile_date_no_brand_unique;

-- Restore the intended business rule: one Daily Progress submission per employee per date.
ALTER TABLE daily_progress_report
DROP CONSTRAINT IF EXISTS daily_progress_report_profile_date_unique;

ALTER TABLE daily_progress_report
ADD CONSTRAINT daily_progress_report_profile_date_unique
UNIQUE (profile_id, report_date);

COMMIT;
