-- Content report approvals and role updates
-- Requires:
-- Better Auth tables
-- profile
-- brand
-- role
-- permission
-- role_permission

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add missing roles
INSERT INTO "role" (name, slug, description, level, is_system, is_active)
VALUES
  ('Full-stack Developer', 'full-stack-developer', 'Developer role with account control access', 95, true, true),
  ('Director', 'director', 'Director-level approval and management role', 90, true, true),
  ('Marketing Director', 'marketing-director', 'Director of Marketing approval role', 90, true, true)
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Add content report permissions
INSERT INTO permission (key, module, action, description)
VALUES
  ('content_reports.view', 'content_reports', 'view', 'View content reports'),
  ('content_reports.create', 'content_reports', 'create', 'Create content reports'),
  ('content_reports.update', 'content_reports', 'update', 'Update content reports'),
  ('content_reports.delete', 'content_reports', 'delete', 'Delete content reports'),
  ('content_reports.submit', 'content_reports', 'submit', 'Submit content reports'),

  ('approvals.view', 'approvals', 'view', 'View approvals'),
  ('approvals.supervisor_review', 'approvals', 'supervisor_review', 'Supervisor review approval requests'),
  ('approvals.director_review', 'approvals', 'director_review', 'Director review approval requests'),
  ('approvals.publish_update', 'approvals', 'publish_update', 'Update publish status and publish date')
ON CONFLICT (key)
DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = now();

-- Full-stack Developer, Director, Marketing Director: all existing permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
CROSS JOIN permission p
WHERE r.slug IN ('full-stack-developer', 'director', 'marketing-director')
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Supervisor approval permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN (
  'approvals.view',
  'approvals.supervisor_review',
  'approvals.publish_update',
  'content_reports.view'
)
WHERE r.slug = 'supervisor'
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Employee/content creation permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM "role" r
JOIN permission p ON p.key IN (
  'content_reports.view',
  'content_reports.create',
  'content_reports.update',
  'content_reports.submit'
)
WHERE r.slug IN ('employee', 'content-creator', 'brand-officer')
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Content report table
CREATE TABLE IF NOT EXISTS content_report (
  id SERIAL PRIMARY KEY,

  submitted_by_profile_id INTEGER NOT NULL
    REFERENCES profile(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  brand_id INTEGER
    REFERENCES brand(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  content_type TEXT NOT NULL CHECK (
    content_type IN (
      'Graphic',
      'Photo',
      'Video',
      'Reel',
      'Carousel',
      'Story',
      'Blog',
      'Ad Creative',
      'Event Poster',
      'Promo Announcement',
      'Testimonial',
      'Menu/Product Feature'
    )
  ),

  content_inspo TEXT,
  caption TEXT NOT NULL,
  asset_link TEXT,

  date_submitted TIMESTAMPTZ NOT NULL DEFAULT now(),

  supervisor_status TEXT NOT NULL DEFAULT 'Pending' CHECK (
    supervisor_status IN ('Pending', 'Approved', 'Rejected', 'Revision')
  ),
  supervisor_notes TEXT,
  supervisor_reviewed_by_profile_id INTEGER
    REFERENCES profile(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  supervisor_reviewed_at TIMESTAMPTZ,

  director_status TEXT NOT NULL DEFAULT 'Pending' CHECK (
    director_status IN ('Pending', 'Approved', 'Rejected', 'Revision')
  ),
  director_notes TEXT,
  director_reviewed_by_profile_id INTEGER
    REFERENCES profile(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  director_reviewed_at TIMESTAMPTZ,

  publish_status TEXT NOT NULL DEFAULT 'Pending' CHECK (
    publish_status IN ('Pending', 'Scheduled', 'Published', 'Cancelled')
  ),
  scheduled_published_date TIMESTAMPTZ,
  remarks_revision_summary TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_report_submitted_by
ON content_report(submitted_by_profile_id);

CREATE INDEX IF NOT EXISTS idx_content_report_brand_id
ON content_report(brand_id);

CREATE INDEX IF NOT EXISTS idx_content_report_content_type
ON content_report(content_type);

CREATE INDEX IF NOT EXISTS idx_content_report_supervisor_status
ON content_report(supervisor_status);

CREATE INDEX IF NOT EXISTS idx_content_report_director_status
ON content_report(director_status);

CREATE INDEX IF NOT EXISTS idx_content_report_publish_status
ON content_report(publish_status);

CREATE INDEX IF NOT EXISTS idx_content_report_date_submitted
ON content_report(date_submitted);

DROP TRIGGER IF EXISTS set_content_report_updated_at ON content_report;

CREATE TRIGGER set_content_report_updated_at
BEFORE UPDATE ON content_report
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();