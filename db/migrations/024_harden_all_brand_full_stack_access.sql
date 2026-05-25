BEGIN;

-- All Brand is a system-wide workspace and must only be granted through the
-- Full Stack Developer role. Account type is recomputed from active roles, so
-- the role is the safest source of truth at insert/update time.

UPDATE user_brand_access uba
SET is_active = false,
    is_primary = false,
    revoked_at = COALESCE(uba.revoked_at, now()),
    updated_at = now()
FROM brand b
JOIN role r ON true
WHERE b.id = uba.brand_id
  AND r.id = uba.role_id
  AND b.slug = 'all-brand'
  AND r.slug <> 'full-stack-developer';

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

    IF selected_role_slug <> 'full-stack-developer' THEN
      RAISE EXCEPTION 'All Brand can only be assigned with the Full Stack Developer role.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS restrict_all_brand_access_to_full_stack_developer_trigger
ON user_brand_access;

CREATE TRIGGER restrict_all_brand_access_to_full_stack_developer_trigger
BEFORE INSERT OR UPDATE OF profile_id, brand_id, role_id
ON user_brand_access
FOR EACH ROW
EXECUTE FUNCTION restrict_all_brand_access_to_full_stack_developer();

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

    IF selected_role_slug <> 'full-stack-developer' THEN
      RAISE EXCEPTION 'All Brand can only be invited with the Full Stack Developer role.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS restrict_all_brand_invite_to_full_stack_developer_trigger
ON account_invite_brand_access;

CREATE TRIGGER restrict_all_brand_invite_to_full_stack_developer_trigger
BEFORE INSERT OR UPDATE OF account_invite_id, brand_id, role_id
ON account_invite_brand_access
FOR EACH ROW
EXECUTE FUNCTION restrict_all_brand_invite_to_full_stack_developer();

COMMIT;
