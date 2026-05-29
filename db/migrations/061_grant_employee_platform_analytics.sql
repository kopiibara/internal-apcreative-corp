-- Grant Platform Analytics view access to employee-facing roles.

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN ('meta_monitoring.view', 'platform_analytics.view')
WHERE r.slug IN (
  'brand-officer',
  'multimedia',
  'ads-specialist',
  'content-creator',
  'client-viewer'
)
ON CONFLICT (role_id, permission_id)
DO NOTHING;
