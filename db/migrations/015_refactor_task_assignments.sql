-- Refactor tasks: parent task + per-employee task_assignment rows.

CREATE TABLE IF NOT EXISTS task_assignment (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES task(id) ON DELETE CASCADE ON UPDATE CASCADE,
  assigned_to_profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (
    status IN ('ASSIGNED', 'PENDING', 'DONE', 'REVISION')
  ),
  proof_type TEXT CHECK (proof_type IN ('IMAGE', 'VIDEO', 'LINK', 'NOTE')),
  proof_url TEXT,
  proof_note TEXT,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reviewed_by_profile_id INTEGER REFERENCES profile(id) ON DELETE SET NULL ON UPDATE CASCADE,
  reviewed_at TIMESTAMPTZ,
  revision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT task_assignment_unique UNIQUE (task_id, assigned_to_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignment_task_id
ON task_assignment(task_id);

CREATE INDEX IF NOT EXISTS idx_task_assignment_assigned_to_profile_id
ON task_assignment(assigned_to_profile_id);

CREATE INDEX IF NOT EXISTS idx_task_assignment_status
ON task_assignment(status);

-- Migrate legacy single-assignee task rows when old columns still exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'task'
      AND column_name = 'assigned_to_profile_id'
  ) THEN
    INSERT INTO task_assignment (
      task_id,
      assigned_to_profile_id,
      status,
      completed_at,
      reviewed_by_profile_id,
      reviewed_at,
      revision_note,
      proof_note,
      submitted_at
    )
    SELECT
      t.id,
      t.assigned_to_profile_id,
      CASE
        WHEN t.status = 'COMPLETED' THEN 'DONE'
        ELSE 'ASSIGNED'
      END,
      t.completed_at,
      CASE WHEN t.status = 'COMPLETED' THEN t.completed_by_profile_id ELSE NULL END,
      CASE WHEN t.status = 'COMPLETED' THEN t.completed_at ELSE NULL END,
      t.revision_note,
      t.notes,
      CASE WHEN t.status IN ('IN_PROGRESS', 'COMPLETED') THEN t.updated_at ELSE NULL END
    FROM task t
    WHERE NOT EXISTS (
      SELECT 1
      FROM task_assignment ta
      WHERE ta.task_id = t.id
        AND ta.assigned_to_profile_id = t.assigned_to_profile_id
    );

    ALTER TABLE task DROP COLUMN IF EXISTS status;
    ALTER TABLE task DROP COLUMN IF EXISTS assigned_to_profile_id;
    ALTER TABLE task DROP COLUMN IF EXISTS brand_id;
    ALTER TABLE task DROP COLUMN IF EXISTS completed_at;
    ALTER TABLE task DROP COLUMN IF EXISTS completed_by_profile_id;
    ALTER TABLE task DROP COLUMN IF EXISTS notes;
    ALTER TABLE task DROP COLUMN IF EXISTS revision_note;
    ALTER TABLE task DROP COLUMN IF EXISTS cancelled_at;
    ALTER TABLE task DROP COLUMN IF EXISTS cancelled_by_profile_id;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_task_status;
DROP INDEX IF EXISTS idx_task_assigned_to_profile_id;
DROP INDEX IF EXISTS idx_task_brand_id;

DROP TRIGGER IF EXISTS set_task_assignment_updated_at ON task_assignment;

CREATE TRIGGER set_task_assignment_updated_at
BEFORE UPDATE ON task_assignment
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO permission (key, module, action, description)
VALUES
  ('tasks.submit_proof', 'tasks', 'submit_proof', 'Submit task proof'),
  ('tasks.review', 'tasks', 'review', 'Review and confirm task assignments')
ON CONFLICT (key)
DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = now();

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN ('tasks.submit_proof', 'tasks.review')
WHERE r.slug IN (
  'executive',
  'manager',
  'supervisor',
  'director',
  'marketing-director',
  'full-stack-developer'
)
ON CONFLICT (role_id, permission_id)
DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key = 'tasks.submit_proof'
WHERE r.slug IN ('brand-officer', 'ads-specialist')
ON CONFLICT (role_id, permission_id)
DO NOTHING;
