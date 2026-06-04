INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.key IN (
  'daily_progress.submit',
  'daily_progress.view_own'
)
WHERE r.slug = 'pr'
ON CONFLICT (role_id, permission_id)
DO NOTHING;
