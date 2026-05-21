-- Add blocker workflow and task accountability timeline.

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname
  INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'task_assignment'
    AND nsp.nspname = 'public'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%status%'
    AND pg_get_constraintdef(con.oid) LIKE '%ASSIGNED%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE task_assignment DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE task_assignment
ADD CONSTRAINT task_assignment_status_check
CHECK (status IN ('ASSIGNED', 'BLOCKER', 'PENDING', 'REVISION', 'DONE'));

ALTER TABLE task_assignment
ADD COLUMN IF NOT EXISTS blocker_note TEXT,
ADD COLUMN IF NOT EXISTS blocker_reported_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS blocker_reported_by_profile_id INTEGER REFERENCES profile(id) ON DELETE SET NULL ON UPDATE CASCADE,
ADD COLUMN IF NOT EXISTS blocker_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS blocker_confirmed_by_profile_id INTEGER REFERENCES profile(id) ON DELETE SET NULL ON UPDATE CASCADE,
ADD COLUMN IF NOT EXISTS blocker_resolution_note TEXT;

CREATE INDEX IF NOT EXISTS idx_task_assignment_blocker_reported_by_profile_id
ON task_assignment(blocker_reported_by_profile_id);

CREATE INDEX IF NOT EXISTS idx_task_assignment_blocker_confirmed_by_profile_id
ON task_assignment(blocker_confirmed_by_profile_id);

CREATE TABLE IF NOT EXISTS task_activity_log (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES task(id) ON DELETE CASCADE ON UPDATE CASCADE,
  task_assignment_id INTEGER REFERENCES task_assignment(id) ON DELETE CASCADE ON UPDATE CASCADE,
  actor_profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_activity_log_task_id
ON task_activity_log(task_id);

CREATE INDEX IF NOT EXISTS idx_task_activity_log_task_assignment_id
ON task_activity_log(task_assignment_id);

CREATE INDEX IF NOT EXISTS idx_task_activity_log_actor_profile_id
ON task_activity_log(actor_profile_id);

CREATE INDEX IF NOT EXISTS idx_task_activity_log_created_at
ON task_activity_log(created_at);

CREATE INDEX IF NOT EXISTS idx_task_activity_log_action
ON task_activity_log(action);
