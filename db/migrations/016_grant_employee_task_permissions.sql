-- Ensure employee-side roles can view and work with their own task assignments.

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN (
  'tasks.view',
  'tasks.create',
  'tasks.submit_proof'
)
WHERE r.slug IN ('employee', 'content-creator', 'brand-officer', 'ads-specialist')
ON CONFLICT (role_id, permission_id)
DO NOTHING;
