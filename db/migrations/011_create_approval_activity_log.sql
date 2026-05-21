-- Approval-specific activity trail for content report workflow changes.

CREATE TABLE IF NOT EXISTS approval_activity_log (
  id SERIAL PRIMARY KEY,
  content_report_id INTEGER NOT NULL
    REFERENCES content_report(id)
    ON DELETE CASCADE,
  actor_profile_id INTEGER NOT NULL
    REFERENCES profile(id)
    ON DELETE RESTRICT,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  notes TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_activity_log_content_report_id
ON approval_activity_log(content_report_id);

CREATE INDEX IF NOT EXISTS idx_approval_activity_log_actor_profile_id
ON approval_activity_log(actor_profile_id);

CREATE INDEX IF NOT EXISTS idx_approval_activity_log_created_at
ON approval_activity_log(created_at);
