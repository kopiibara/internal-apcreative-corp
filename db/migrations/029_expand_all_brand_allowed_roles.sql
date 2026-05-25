BEGIN;

-- All Brand is a system-wide workspace for admin-level roles, not only Full Stack Developer.

CREATE OR REPLACE FUNCTION restrict_all_brand_access_to_full_stack_developer()
RETURNS TRIGGER AS $$
DECLARE
  selected_brand_slug TEXT;
  selected_role_slug TEXT;
BEGIN
  SELECT slug
  INTO selected_brand_slug
  FROM brand
  WHERE id = NEW.brand_id;

  IF selected_brand_slug = 'all-brand' THEN
    SELECT slug
    INTO selected_role_slug
    FROM role
    WHERE id = NEW.role_id;

    IF selected_role_slug NOT IN (
      'full-stack-developer',
      'director',
      'executive',
      'manager',
      'supervisor',
      'marketing-director',
      'multimedia'
    ) THEN
      RAISE EXCEPTION 'All Brand can only be assigned with director, executive, manager, supervisor, multimedia, or full stack developer roles.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION restrict_all_brand_invite_to_full_stack_developer()
RETURNS TRIGGER AS $$
DECLARE
  selected_brand_slug TEXT;
  selected_role_slug TEXT;
BEGIN
  SELECT slug
  INTO selected_brand_slug
  FROM brand
  WHERE id = NEW.brand_id;

  IF selected_brand_slug = 'all-brand' THEN
    SELECT slug
    INTO selected_role_slug
    FROM role
    WHERE id = NEW.role_id;

    IF selected_role_slug NOT IN (
      'full-stack-developer',
      'director',
      'executive',
      'manager',
      'supervisor',
      'marketing-director',
      'multimedia'
    ) THEN
      RAISE EXCEPTION 'All Brand can only be invited with director, executive, manager, supervisor, multimedia, or full stack developer roles.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
