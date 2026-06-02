-- Store internal AP Creative form submissions.

CREATE TABLE IF NOT EXISTS form_submission (
  id SERIAL PRIMARY KEY,
  form_type TEXT NOT NULL CHECK (
    form_type IN (
      'STRATEGY_CALL_NOTES',
      'CLIENT_ONBOARDING',
      'STRATEGY_CALL_BOOKING',
      'INTERNAL_ONBOARDING_CHECKLIST',
      'MONTHLY_REPORT_RENEWAL'
    )
  ),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_submission_form_type
ON form_submission(form_type);

CREATE INDEX IF NOT EXISTS idx_form_submission_created_by_profile_id
ON form_submission(created_by_profile_id);

CREATE INDEX IF NOT EXISTS idx_form_submission_created_at
ON form_submission(created_at DESC);
