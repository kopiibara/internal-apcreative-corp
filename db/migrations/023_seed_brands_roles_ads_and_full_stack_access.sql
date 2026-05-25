BEGIN;

-- =====================================================
-- 1. Allow FULL_STACK_DEVELOPER account type if needed
-- =====================================================

DO $$
DECLARE
  profile_constraint_name TEXT;
  invite_constraint_name TEXT;
BEGIN
  SELECT conname
  INTO profile_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'profile'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%account_type%'
  LIMIT 1;

  IF profile_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE profile DROP CONSTRAINT %I', profile_constraint_name);
  END IF;

  ALTER TABLE profile
  ADD CONSTRAINT profile_account_type_check
  CHECK (
    account_type IN (
      'CLIENT',
      'EMPLOYEE',
      'SUPERVISOR',
      'MANAGER',
      'DIRECTOR',
      'EXECUTIVE',
      'FULL_STACK_DEVELOPER'
    )
  );

  SELECT conname
  INTO invite_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'account_invite'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%account_type%'
  LIMIT 1;

  IF invite_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE account_invite DROP CONSTRAINT %I', invite_constraint_name);
  END IF;

  ALTER TABLE account_invite
  ADD CONSTRAINT account_invite_account_type_check
  CHECK (
    account_type IN (
      'CLIENT',
      'EMPLOYEE',
      'SUPERVISOR',
      'MANAGER',
      'DIRECTOR',
      'EXECUTIVE',
      'FULL_STACK_DEVELOPER'
    )
  );
END $$;

-- =====================================================
-- 2. Seed official brands
-- =====================================================

INSERT INTO brand (name, slug, description, is_active)
VALUES
  ('Al Qaysar', 'al-qaysar', 'Al Qaysar Restaurant brand workspace.', true),
  ('Neon Nights Corp', 'neon-nights-corp', 'Neon Nights Corp brand workspace.', true),
  ('Oculto', 'oculto', 'Oculto brand workspace.', true),
  ('Pro Group', 'pro-group', 'Pro Group brand workspace.', true),
  ('All Brand', 'all-brand', 'Restricted all-brand workspace for Full Stack Developer accounts only.', true)
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();

UPDATE brand
SET is_active = false,
    updated_at = now()
WHERE slug NOT IN (
  'al-qaysar',
  'neon-nights-corp',
  'oculto',
  'pro-group',
  'all-brand'
);

-- =====================================================
-- 3. Seed system roles
-- =====================================================

INSERT INTO role (name, slug, description, level, is_system, is_active)
VALUES
  ('Full Stack Developer', 'full-stack-developer', 'Developer-level full access across all dashboard features.', 1000, true, true),
  ('Director', 'director', 'Director-level admin access.', 900, true, true),
  ('Ads Specialist', 'ads-specialist', 'Employee role with additional Ads Campaigns access.', 200, true, true)
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_system = true,
  is_active = true,
  updated_at = now();

-- =====================================================
-- 4. Seed Ads Campaign permissions
-- =====================================================

INSERT INTO permission (key, module, action, description)
VALUES
  ('ads_campaigns.view', 'ads_campaigns', 'view', 'View Ads Campaigns page.'),
  ('ads_campaigns.manage', 'ads_campaigns', 'manage', 'Manage Ads Campaigns module.'),
  ('ads_campaigns.import', 'ads_campaigns', 'import', 'Import Ads Campaign CSV data.'),
  ('ads_campaigns.create', 'ads_campaigns', 'create', 'Create ads campaign records.'),
  ('ads_campaigns.update', 'ads_campaigns', 'update', 'Update ads campaign records.'),
  ('ads_campaigns.delete', 'ads_campaigns', 'delete', 'Delete ads campaign records.')
ON CONFLICT (key)
DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = now();

-- =====================================================
-- 5. Give full-access roles all permissions
-- =====================================================

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
CROSS JOIN permission p
WHERE r.slug IN (
  'full-stack-developer',
  'executive',
  'manager',
  'supervisor',
  'director'
)
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- =====================================================
-- 6. Give Ads Specialist only Ads Campaign permissions
-- =====================================================

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.key IN (
  'ads_campaigns.view',
  'ads_campaigns.manage',
  'ads_campaigns.import',
  'ads_campaigns.create',
  'ads_campaigns.update',
  'ads_campaigns.delete'
)
WHERE r.slug = 'ads-specialist'
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- =====================================================
-- 7. Restrict All Brand to Full Stack Developer only
-- =====================================================

CREATE OR REPLACE FUNCTION restrict_all_brand_access_to_full_stack_developer()
RETURNS TRIGGER AS $$
DECLARE
  selected_brand_slug TEXT;
  selected_role_slug TEXT;
  selected_account_type TEXT;
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

    SELECT account_type
    INTO selected_account_type
    FROM profile
    WHERE id = NEW.profile_id;

    IF selected_role_slug <> 'full-stack-developer'
       AND selected_account_type <> 'FULL_STACK_DEVELOPER' THEN
      RAISE EXCEPTION 'All Brand can only be assigned to Full Stack Developer accounts.';
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
  selected_account_type TEXT;
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

    SELECT account_type
    INTO selected_account_type
    FROM account_invite
    WHERE id = NEW.account_invite_id;

    IF selected_role_slug <> 'full-stack-developer'
       AND selected_account_type <> 'FULL_STACK_DEVELOPER' THEN
      RAISE EXCEPTION 'All Brand can only be invited for Full Stack Developer accounts.';
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