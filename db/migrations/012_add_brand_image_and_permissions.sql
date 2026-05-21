ALTER TABLE brand
ADD COLUMN IF NOT EXISTS brand_image_url TEXT;

INSERT INTO permission (key, module, action, description)
VALUES
  ('brands.deactivate', 'brands', 'deactivate', 'Deactivate or reactivate brands'),
  ('brands.analytics.view', 'brands', 'analytics.view', 'View brand approval analytics')
ON CONFLICT (key)
DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = now();

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
CROSS JOIN permission p
WHERE r.slug IN (
  'executive',
  'manager',
  'supervisor',
  'full-stack-developer',
  'director',
  'marketing-director'
)
ON CONFLICT (role_id, permission_id)
DO NOTHING;
