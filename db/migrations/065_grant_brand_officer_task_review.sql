BEGIN;

-- Brand Officers who assign graded tasks must be able to confirm or revise them.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.key = 'tasks.review'
WHERE r.slug = 'brand-officer'
ON CONFLICT (role_id, permission_id)
DO NOTHING;

COMMIT;
