BEGIN;

ALTER TABLE pr_request
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE pr_request
  DROP CONSTRAINT IF EXISTS pr_request_status_check;

ALTER TABLE pr_request
  ADD CONSTRAINT pr_request_status_check
    CHECK (status IN ('ACTIVE', 'DELETED'));

CREATE INDEX IF NOT EXISTS idx_pr_request_status ON pr_request(status);

COMMIT;
