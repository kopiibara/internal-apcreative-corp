BEGIN;

-- Ensure employee-side roles can create approval requests (content_report).
-- Migration 003 only granted daily-report keys (reports.*) to content-creator.
-- Migration 031 added multimedia without content_reports permissions.

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
WHERE r.slug IN (
  'employee',
  'content-creator',
  'brand-officer',
  'multimedia'
)
ON CONFLICT (role_id, permission_id)
DO NOTHING;

COMMIT;
