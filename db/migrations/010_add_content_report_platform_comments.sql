ALTER TABLE content_report
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'Meta (Instagram and Facebook)',
  ADD COLUMN IF NOT EXISTS employee_comments TEXT;

ALTER TABLE content_report
  DROP CONSTRAINT IF EXISTS content_report_platform_check;

ALTER TABLE content_report
  ADD CONSTRAINT content_report_platform_check CHECK (
    platform IN (
      'Meta (Instagram and Facebook)',
      'TikTok',
      'YouTube',
      'All Platforms'
    )
  );

CREATE INDEX IF NOT EXISTS idx_content_report_platform
ON content_report(platform);
