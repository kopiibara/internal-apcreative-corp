-- Daily Reports read-only command summary permissions.

INSERT INTO permission (key, module, action, description)
VALUES
  ('daily_reports.view', 'daily_reports', 'view', 'View daily command summary reports'),
  ('daily_reports.export', 'daily_reports', 'export', 'Export daily reports (placeholder)')
ON CONFLICT (key)
DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = now();

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN ('daily_reports.view', 'daily_reports.export')
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
