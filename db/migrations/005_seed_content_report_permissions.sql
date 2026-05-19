-- Seed Marketing Director role and content approval permissions.

INSERT INTO "role" (name, slug, description, level, is_system, is_active)
VALUES
  (
    'Marketing Director',
    'marketing-director',
    'Director-level marketing approval and publishing access',
    90,
    true,
    true
  )
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO permission (key, module, action, description)
VALUES
  ('content_reports.view', 'content_reports', 'view', 'View content reports'),
  ('content_reports.create', 'content_reports', 'create', 'Create content reports'),
  ('content_reports.update', 'content_reports', 'update', 'Update content reports'),
  ('content_reports.delete', 'content_reports', 'delete', 'Delete or cancel content reports'),
  ('content_reports.submit', 'content_reports', 'submit', 'Submit content reports'),

  ('approvals.supervisor_review', 'approvals', 'supervisor_review', 'Submit supervisor content reviews'),
  ('approvals.director_review', 'approvals', 'director_review', 'Submit director content reviews'),
  ('approvals.publish_update', 'approvals', 'publish_update', 'Update publishing status and scheduled dates')
ON CONFLICT (key)
DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = now();

-- Existing admin-side roles should retain all current and future permissions.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
CROSS JOIN permission p
WHERE r.slug IN ('executive', 'manager', 'supervisor')
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Marketing Director gets director review and publishing permissions.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN (
  'dashboard.view',
  'approvals.view',
  'approvals.director_review',
  'approvals.publish_update',
  'content_reports.view',
  'analytics.view',
  'reports.view'
)
WHERE r.slug = 'marketing-director'
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Supervisor-focused review permissions.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN (
  'dashboard.view',
  'approvals.view',
  'approvals.supervisor_review',
  'approvals.publish_update',
  'content_reports.view',
  'reports.view'
)
WHERE r.slug = 'supervisor'
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Employee/content creation permissions.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN (
  'dashboard.view',
  'content_reports.view',
  'content_reports.create',
  'content_reports.update',
  'content_reports.submit'
)
WHERE r.slug IN ('employee', 'content-creator', 'brand-officer')
ON CONFLICT (role_id, permission_id)
DO NOTHING;
