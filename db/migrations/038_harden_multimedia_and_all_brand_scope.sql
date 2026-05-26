BEGIN;

-- Multimedia accounts can receive tasks, but they should not create approval
-- requests. Keep content report viewing intact for assigned/visible workflow.
DELETE FROM role_permission rp
USING role r, permission p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.slug = 'multimedia'
  AND p.key IN (
    'content_reports.create',
    'content_reports.update',
    'content_reports.submit'
  );

-- All Brand is a scope key. The selected role still controls what the account
-- can do across all active brands.
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
      'marketing-director',
      'executive',
      'manager',
      'supervisor',
      'brand-officer',
      'content-creator',
      'employee',
      'multimedia'
    ) THEN
      RAISE EXCEPTION 'All Brand can only be assigned with an active dashboard role.';
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
      'marketing-director',
      'executive',
      'manager',
      'supervisor',
      'brand-officer',
      'content-creator',
      'employee',
      'multimedia'
    ) THEN
      RAISE EXCEPTION 'All Brand can only be invited with an active dashboard role.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
