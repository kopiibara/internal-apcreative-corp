BEGIN;

ALTER TABLE daily_progress_report
DROP CONSTRAINT IF EXISTS daily_progress_report_profile_date_unique;

CREATE UNIQUE INDEX IF NOT EXISTS daily_progress_report_profile_date_brand_unique
ON daily_progress_report (profile_id, report_date, brand_id)
WHERE brand_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS daily_progress_report_profile_date_no_brand_unique
ON daily_progress_report (profile_id, report_date)
WHERE brand_id IS NULL;

COMMIT;
