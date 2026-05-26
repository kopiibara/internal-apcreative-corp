BEGIN;

-- Ads Specialist is still an employee account and uses Approvals + To-Do like other employees.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.key IN (
  'dashboard.view',
  'content_reports.view',
  'content_reports.create',
  'content_reports.update',
  'content_reports.submit'
)
WHERE r.slug = 'ads-specialist'
ON CONFLICT (role_id, permission_id)
DO NOTHING;

COMMIT;
