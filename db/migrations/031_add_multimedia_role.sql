BEGIN;

-- Employee-tier role; may be assigned to All Brand (see 029_expand_all_brand_allowed_roles.sql).
INSERT INTO role (
  name,
  slug,
  description,
  level,
  is_system,
  is_active
)
VALUES (
  'Multimedia',
  'multimedia',
  'Multimedia team role for creative, design, video, and media-related access.',
  35,
  true,
  true
)
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_system = EXCLUDED.is_system,
  is_active = true,
  updated_at = now();

COMMIT;
