BEGIN;

INSERT INTO brand (
  name,
  slug,
  description,
  is_active
)
VALUES (
  'AP',
  'ap',
  'AP Creative internal brand workspace.',
  true
)
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();

COMMIT;