-- Task management for graded accountability and personal to-dos.

CREATE TABLE IF NOT EXISTS task (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('GRADED', 'NON_GRADED')),
  status TEXT NOT NULL DEFAULT 'TODO' CHECK (
    status IN ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
  ),
  priority TEXT CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  created_by_profile_id INTEGER NOT NULL REFERENCES profile(id),
  assigned_to_profile_id INTEGER NOT NULL REFERENCES profile(id),
  brand_id INTEGER REFERENCES brand(id),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by_profile_id INTEGER REFERENCES profile(id),
  notes TEXT,
  revision_note TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by_profile_id INTEGER REFERENCES profile(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_assigned_to_profile_id
ON task(assigned_to_profile_id);

CREATE INDEX IF NOT EXISTS idx_task_created_by_profile_id
ON task(created_by_profile_id);

CREATE INDEX IF NOT EXISTS idx_task_task_type
ON task(task_type);

CREATE INDEX IF NOT EXISTS idx_task_status
ON task(status);

CREATE INDEX IF NOT EXISTS idx_task_brand_id
ON task(brand_id);

CREATE INDEX IF NOT EXISTS idx_task_due_date
ON task(due_date);

DROP TRIGGER IF EXISTS set_task_updated_at ON task;

CREATE TRIGGER set_task_updated_at
BEFORE UPDATE ON task
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO permission (key, module, action, description)
VALUES
  ('tasks.view', 'tasks', 'view', 'View assigned and personal tasks'),
  ('tasks.create', 'tasks', 'create', 'Create personal tasks'),
  ('tasks.update', 'tasks', 'update', 'Update tasks'),
  ('tasks.complete', 'tasks', 'complete', 'Complete tasks'),
  ('tasks.delete', 'tasks', 'delete', 'Delete tasks'),
  ('tasks.assign', 'tasks', 'assign', 'Assign graded tasks to employees'),
  ('tasks.view_all', 'tasks', 'view_all', 'View team tasks'),
  ('tasks.manage_all', 'tasks', 'manage_all', 'Manage all tasks')
ON CONFLICT (key)
DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = now();

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN (
  'tasks.view',
  'tasks.create',
  'tasks.update',
  'tasks.complete',
  'tasks.delete',
  'tasks.assign',
  'tasks.view_all',
  'tasks.manage_all'
)
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
JOIN permission p ON p.key IN (
  'tasks.view',
  'tasks.create',
  'tasks.update',
  'tasks.complete'
)
WHERE r.slug IN ('brand-officer', 'ads-specialist')
ON CONFLICT (role_id, permission_id)
DO NOTHING;
