-- Content report submission and approval workflow.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS content_report (
  id SERIAL PRIMARY KEY,

  submitted_by_profile_id INTEGER NOT NULL
    REFERENCES profile(id)
    ON DELETE RESTRICT
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

CREATE INDEX IF NOT EXISTS idx_content_report_submitted_by_profile_id
ON content_report(submitted_by_profile_id);

CREATE INDEX IF NOT EXISTS idx_content_report_brand_id
ON content_report(brand_id);

CREATE INDEX IF NOT EXISTS idx_content_report_supervisor_status
ON content_report(supervisor_status);

CREATE INDEX IF NOT EXISTS idx_content_report_director_status
ON content_report(director_status);

CREATE INDEX IF NOT EXISTS idx_content_report_publish_status
ON content_report(publish_status);

DROP TRIGGER IF EXISTS set_content_report_updated_at ON content_report;

CREATE TRIGGER set_content_report_updated_at
BEFORE UPDATE ON content_report
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
