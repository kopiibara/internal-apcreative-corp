-- Seed brands
INSERT INTO brand (name, slug, description, is_active)
VALUES
  ('Neon Nights', 'neon-nights', 'Nightlife and bar brand', true),
  ('Al Qaysar', 'al-qaysar', 'Restaurant and food business brand', true),
  ('Pro Group', 'pro-group', 'E-bike and mobility brand', true),
  ('Fyre', 'fyre', 'Nightlife and bar brand', true)
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Seed roles
INSERT INTO "role" (name, slug, description, level, is_system, is_active)
VALUES
  ('Executive', 'executive', 'Full executive-level access', 100, true, true),
  ('Manager', 'manager', 'Full manager-level access', 80, true, true),
  ('Supervisor', 'supervisor', 'Full supervisor-level access', 60, true, true),
  ('Brand Officer', 'brand-officer', 'Manages brand reports and analytics', 40, true, true),
  ('Ads Specialist', 'ads-specialist', 'Manages ads and analytics reports', 30, true, true),
  ('Content Creator', 'content-creator', 'Creates and submits content reports', 20, true, true),
  ('Employee', 'employee', 'Basic employee access', 10, true, true),
  ('Client Viewer', 'client-viewer', 'Client-facing viewer access', 10, true, true)
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Seed permissions
INSERT INTO permission (key, module, action, description)
VALUES
  ('dashboard.view', 'dashboard', 'view', 'View dashboard'),
  ('analytics.view', 'analytics', 'view', 'View analytics'),
  ('analytics.export', 'analytics', 'export', 'Export analytics'),

  ('reports.view', 'reports', 'view', 'View reports'),
  ('reports.create', 'reports', 'create', 'Create reports'),
  ('reports.update', 'reports', 'update', 'Update reports'),
  ('reports.delete', 'reports', 'delete', 'Delete reports'),
  ('reports.submit', 'reports', 'submit', 'Submit reports'),

  ('approvals.view', 'approvals', 'view', 'View approvals'),
  ('approvals.approve', 'approvals', 'approve', 'Approve submissions'),
  ('approvals.reject', 'approvals', 'reject', 'Reject submissions'),
  ('approvals.request_revision', 'approvals', 'request_revision', 'Request revisions'),

  ('accounts.view', 'accounts', 'view', 'View accounts'),
  ('accounts.create', 'accounts', 'create', 'Create accounts'),
  ('accounts.update', 'accounts', 'update', 'Update accounts'),
  ('accounts.disable', 'accounts', 'disable', 'Disable accounts'),
  ('accounts.delete', 'accounts', 'delete', 'Delete accounts'),

  ('brands.view', 'brands', 'view', 'View brands'),
  ('brands.create', 'brands', 'create', 'Create brands'),
  ('brands.update', 'brands', 'update', 'Update brands'),
  ('brands.delete', 'brands', 'delete', 'Delete brands'),

  ('permissions.view', 'permissions', 'view', 'View permissions'),
  ('permissions.manage', 'permissions', 'manage', 'Manage permissions'),

  ('integrations.view', 'integrations', 'view', 'View integrations'),
  ('integrations.manage', 'integrations', 'manage', 'Manage integrations'),

  ('ads.view', 'ads', 'view', 'View ads'),
  ('staff.view', 'staff', 'view', 'View staff')
ON CONFLICT (key)
DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = now();

-- Executive, Manager, Supervisor: all permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
CROSS JOIN permission p
WHERE r.slug IN ('executive', 'manager', 'supervisor')
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Brand Officer permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN (
  'dashboard.view',
  'reports.view',
  'reports.create',
  'reports.update',
  'reports.submit',
  'analytics.view'
)
WHERE r.slug = 'brand-officer'
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Ads Specialist permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN (
  'dashboard.view',
  'analytics.view',
  'analytics.export',
  'reports.view',
  'reports.create',
  'reports.submit',
  'ads.view'
)
WHERE r.slug = 'ads-specialist'
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Content Creator permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN (
  'dashboard.view',
  'reports.view',
  'reports.create',
  'reports.submit'
)
WHERE r.slug = 'content-creator'
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Employee permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN (
  'dashboard.view',
  'reports.view',
  'reports.create'
)
WHERE r.slug = 'employee'
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Client Viewer permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN (
  'dashboard.view',
  'reports.view',
  'analytics.view'
)
WHERE r.slug = 'client-viewer'
ON CONFLICT (role_id, permission_id)
DO NOTHING;