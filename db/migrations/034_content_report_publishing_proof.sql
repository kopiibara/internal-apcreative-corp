BEGIN;

ALTER TABLE content_report
  ADD COLUMN IF NOT EXISTS publishing_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS publishing_proof_note TEXT,
  ADD COLUMN IF NOT EXISTS publishing_proof_submitted_by_profile_id INTEGER
    REFERENCES profile(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS publishing_proof_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by_profile_id INTEGER
    REFERENCES profile(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_by_profile_id INTEGER
    REFERENCES profile(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_content_report_published_by_profile_id
ON content_report(published_by_profile_id);

CREATE INDEX IF NOT EXISTS idx_content_report_scheduled_by_profile_id
ON content_report(scheduled_by_profile_id);

CREATE INDEX IF NOT EXISTS idx_content_report_publishing_proof_submitted_by
ON content_report(publishing_proof_submitted_by_profile_id);

COMMIT;
