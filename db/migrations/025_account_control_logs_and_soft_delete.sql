BEGIN;

ALTER TABLE profile
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS deleted_by_profile_id INTEGER NULL,
ADD COLUMN IF NOT EXISTS deleted_reason TEXT NULL;

DO $$
DECLARE
  profile_status_constraint_name TEXT;
BEGIN
  SELECT conname
  INTO profile_status_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'profile'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%'
  LIMIT 1;

  IF profile_status_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE profile DROP CONSTRAINT %I', profile_status_constraint_name);
  END IF;

  ALTER TABLE profile
  ADD CONSTRAINT profile_status_check
  CHECK (status IN ('ACTIVE', 'INVITED', 'DISABLED', 'SUSPENDED', 'ARCHIVED', 'DELETED'));
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profile_deleted_by_profile_id_fkey'
  ) THEN
    ALTER TABLE profile
    ADD CONSTRAINT profile_deleted_by_profile_id_fkey
    FOREIGN KEY (deleted_by_profile_id)
    REFERENCES profile(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS account_control_logs (
  id SERIAL PRIMARY KEY,
  actor_profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  target_profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  action TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_control_logs_actor_profile_id
ON account_control_logs(actor_profile_id);

CREATE INDEX IF NOT EXISTS idx_account_control_logs_target_profile_id
ON account_control_logs(target_profile_id);

CREATE INDEX IF NOT EXISTS idx_account_control_logs_action
ON account_control_logs(action);

CREATE INDEX IF NOT EXISTS idx_account_control_logs_created_at
ON account_control_logs(created_at);

COMMIT;
