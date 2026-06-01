BEGIN;

-- =====================================================
-- 1. Add PR account type
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
      'PR',
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
      'PR',
      'SUPERVISOR',
      'MANAGER',
      'DIRECTOR',
      'EXECUTIVE',
      'FULL_STACK_DEVELOPER'
    )
  );
END $$;

-- =====================================================
-- 2. PR request permissions
-- =====================================================

INSERT INTO permission (key, module, action, description)
VALUES
  ('pr_requests.create', 'pr_requests', 'create', 'Submit PR influencer or partnership recommendations'),
  ('pr_requests.view_all', 'pr_requests', 'view_all', 'View all PR requests'),
  ('pr_requests.manage', 'pr_requests', 'manage', 'Manage PR request follow-up actions'),
  ('pr_requests.read_only', 'pr_requests', 'read_only', 'View PR requests without managing follow-up')
ON CONFLICT (key)
DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = now();

-- Leadership read-only
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.key = 'pr_requests.read_only'
WHERE r.slug IN (
  'executive',
  'manager',
  'supervisor',
  'director',
  'marketing-director'
)
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Optional PR role for brand-access assignment patterns
INSERT INTO role (name, slug, description, level, is_system, is_active)
VALUES (
  'PR',
  'pr',
  'Public relations — manages influencer and partnership recommendations.',
  45,
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

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.key IN (
  'pr_requests.create',
  'pr_requests.view_all',
  'pr_requests.manage'
)
WHERE r.slug = 'pr'
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- =====================================================
-- 3. PR requests table
-- =====================================================

CREATE TABLE IF NOT EXISTS pr_request (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brand(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  request_type TEXT NOT NULL,
  influencer_size TEXT,
  recommendation TEXT NOT NULL,
  initial_details TEXT,
  requested_by_profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  requested_by_name_snapshot TEXT,
  contact_status TEXT NOT NULL DEFAULT 'PENDING',
  date_of_visit DATE,
  collaboration_status TEXT NOT NULL DEFAULT 'PENDING',
  follow_up_notes TEXT,
  declined_reason TEXT,
  created_by_profile_id INTEGER REFERENCES profile(id) ON DELETE SET NULL ON UPDATE CASCADE,
  updated_by_profile_id INTEGER REFERENCES profile(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pr_request_request_type_check
    CHECK (request_type IN ('INFLUENCER', 'BRAND_PARTNERSHIP')),
  CONSTRAINT pr_request_influencer_size_check
    CHECK (influencer_size IS NULL OR influencer_size IN ('MICRO', 'MACRO')),
  CONSTRAINT pr_request_influencer_size_required_check
    CHECK (
      (request_type = 'INFLUENCER' AND influencer_size IN ('MICRO', 'MACRO'))
      OR (request_type = 'BRAND_PARTNERSHIP' AND influencer_size IS NULL)
    ),
  CONSTRAINT pr_request_contact_status_check
    CHECK (contact_status IN ('PENDING', 'CONTACTED', 'DECLINED')),
  CONSTRAINT pr_request_collaboration_status_check
    CHECK (collaboration_status IN ('PENDING', 'PAID', 'NA')),
  CONSTRAINT pr_request_declined_reason_check
    CHECK (
      contact_status <> 'DECLINED'
      OR COALESCE(NULLIF(BTRIM(declined_reason), ''), NULLIF(BTRIM(follow_up_notes), '')) IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_pr_request_brand_id ON pr_request(brand_id);
CREATE INDEX IF NOT EXISTS idx_pr_request_request_type ON pr_request(request_type);
CREATE INDEX IF NOT EXISTS idx_pr_request_influencer_size ON pr_request(influencer_size);
CREATE INDEX IF NOT EXISTS idx_pr_request_contact_status ON pr_request(contact_status);
CREATE INDEX IF NOT EXISTS idx_pr_request_collaboration_status ON pr_request(collaboration_status);
CREATE INDEX IF NOT EXISTS idx_pr_request_date_of_visit ON pr_request(date_of_visit);
CREATE INDEX IF NOT EXISTS idx_pr_request_requested_by_profile_id ON pr_request(requested_by_profile_id);
CREATE INDEX IF NOT EXISTS idx_pr_request_created_at ON pr_request(created_at);

DROP TRIGGER IF EXISTS set_pr_request_updated_at ON pr_request;

CREATE TRIGGER set_pr_request_updated_at
BEFORE UPDATE ON pr_request
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
