-- Ensure request-revision permission exists and is linked to admin-side roles.

INSERT INTO permission (key, module, action, description)
VALUES (
  'approvals.request_revision',
  'approvals',
  'request_revision',
  'Request revisions on approval submissions'
)
ON CONFLICT (key)
DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = now();

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key = 'approvals.request_revision'
WHERE r.slug IN ('supervisor', 'manager', 'executive')
ON CONFLICT (role_id, permission_id)
DO NOTHING;
