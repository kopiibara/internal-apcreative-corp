BEGIN;

-- Brand Officers may assign graded tasks to Multimedia / Content Creator on shared brands.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.key = 'tasks.assign'
WHERE r.slug = 'brand-officer'
ON CONFLICT (role_id, permission_id)
DO NOTHING;

COMMIT;
