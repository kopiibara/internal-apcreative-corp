-- Allow daily_insights Meta sync job type.

ALTER TABLE meta_sync_run
  DROP CONSTRAINT IF EXISTS meta_sync_run_sync_type_check;

ALTER TABLE meta_sync_run
  ADD CONSTRAINT meta_sync_run_sync_type_check
  CHECK (
    sync_type IN (
      'hourly_posts',
      'daily_page',
      'daily_insights',
      'weekly_summary',
      'monthly_summary'
    )
  );
