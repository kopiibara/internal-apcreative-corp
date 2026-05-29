BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE daily_progress_report
ADD COLUMN IF NOT EXISTS submission_group_id UUID DEFAULT gen_random_uuid();

WITH grouped_reports AS (
  SELECT
    profile_id,
    report_date,
    status,
    COALESCE(late_approval_status, '') AS late_approval_status,
    COALESCE(summary, '') AS summary,
    COALESCE(blockers, '') AS blockers,
    COALESCE(proof_link, '') AS proof_link,
    COALESCE(late_reason, '') AS late_reason,
    created_by_profile_id,
    gen_random_uuid() AS group_id
  FROM daily_progress_report
  WHERE submission_group_id IS NULL
  GROUP BY
    profile_id,
    report_date,
    status,
    COALESCE(late_approval_status, ''),
    COALESCE(summary, ''),
    COALESCE(blockers, ''),
    COALESCE(proof_link, ''),
    COALESCE(late_reason, ''),
    created_by_profile_id
)
UPDATE daily_progress_report dpr
SET submission_group_id = grouped_reports.group_id
FROM grouped_reports
WHERE dpr.submission_group_id IS NULL
  AND dpr.profile_id = grouped_reports.profile_id
  AND dpr.report_date = grouped_reports.report_date
  AND dpr.status = grouped_reports.status
  AND COALESCE(dpr.late_approval_status, '') = grouped_reports.late_approval_status
  AND COALESCE(dpr.summary, '') = grouped_reports.summary
  AND COALESCE(dpr.blockers, '') = grouped_reports.blockers
  AND COALESCE(dpr.proof_link, '') = grouped_reports.proof_link
  AND COALESCE(dpr.late_reason, '') = grouped_reports.late_reason
  AND dpr.created_by_profile_id = grouped_reports.created_by_profile_id;

ALTER TABLE daily_progress_report
ALTER COLUMN submission_group_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_progress_report_submission_group_id
ON daily_progress_report(submission_group_id);

COMMIT;