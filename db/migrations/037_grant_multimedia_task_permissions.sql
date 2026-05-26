BEGIN;

-- Multimedia was added in 031 but omitted from 016 employee task permission seed.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.key IN (
  'tasks.view',
  'tasks.create',
  'tasks.submit_proof'
)
WHERE r.slug = 'multimedia'
ON CONFLICT (role_id, permission_id)
DO NOTHING;

COMMIT;
