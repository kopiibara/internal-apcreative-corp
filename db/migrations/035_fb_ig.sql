BEGIN;

-- Drop the old check first so legacy rows (e.g. Meta (IG and FB)) can be normalized.
ALTER TABLE content_report
  DROP CONSTRAINT IF EXISTS content_report_platform_check;

UPDATE content_report
SET platform = 'Meta (IG and FB)'
WHERE platform IN (
  'Meta (Instagram and Facebook)',
  'IG and FB'
);

UPDATE content_report
SET platform = 'Meta (IG and FB)'
WHERE platform IS NULL
   OR platform NOT IN (
     'Meta (IG and FB)',
     'TikTok',
     'YouTube',
     'All Platforms'
   );

ALTER TABLE content_report
  ALTER COLUMN platform SET DEFAULT 'Meta (IG and FB)';

ALTER TABLE content_report
  ADD CONSTRAINT content_report_platform_check CHECK (
    platform IN (
      'Meta (IG and FB)',
      'TikTok',
      'YouTube',
      'All Platforms'
    )
  );

COMMIT;
