CREATE TABLE IF NOT EXISTS holiday_calendar (
  id SERIAL PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Regular Holiday', 'Special Non-working Holiday', 'Company Holiday')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holiday_calendar_holiday_date ON holiday_calendar(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holiday_calendar_is_active ON holiday_calendar(is_active);

CREATE TABLE IF NOT EXISTS employee_leave (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  approved_by_profile_id INTEGER NULL REFERENCES profile(id) ON DELETE SET NULL ON UPDATE CASCADE,
  approved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employee_leave_date_order CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_employee_leave_profile_id ON employee_leave(profile_id);
CREATE INDEX IF NOT EXISTS idx_employee_leave_status ON employee_leave(status);
CREATE INDEX IF NOT EXISTS idx_employee_leave_dates ON employee_leave(start_date, end_date);

CREATE TABLE IF NOT EXISTS daily_progress_report (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
  brand_id INTEGER NULL REFERENCES brand(id) ON DELETE SET NULL ON UPDATE CASCADE,
  report_date DATE NOT NULL,
  summary TEXT NULL,
  blockers TEXT NULL,
  proof_link TEXT NULL,
  submitted_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL CHECK (status IN ('Submitted', 'Late', 'Missed', 'Excused')),
  points_awarded INTEGER NOT NULL DEFAULT 0,
  deduction_applied INTEGER NOT NULL DEFAULT 0,
  excused_reason TEXT NULL,
  late_reason TEXT NULL,
  late_approval_status TEXT NULL CHECK (
    late_approval_status IS NULL
    OR late_approval_status IN ('Pending', 'Approved', 'Rejected')
  ),
  late_requested_at TIMESTAMPTZ NULL,
  late_reviewed_by_profile_id INTEGER NULL REFERENCES profile(id) ON DELETE SET NULL ON UPDATE CASCADE,
  late_reviewed_at TIMESTAMPTZ NULL,
  late_review_notes TEXT NULL,
  created_by_profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  updated_by_profile_id INTEGER NULL REFERENCES profile(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_progress_report_profile_date_unique UNIQUE (profile_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_progress_report_profile_id ON daily_progress_report(profile_id);
CREATE INDEX IF NOT EXISTS idx_daily_progress_report_brand_id ON daily_progress_report(brand_id);
CREATE INDEX IF NOT EXISTS idx_daily_progress_report_report_date ON daily_progress_report(report_date);
CREATE INDEX IF NOT EXISTS idx_daily_progress_report_status ON daily_progress_report(status);
CREATE INDEX IF NOT EXISTS idx_daily_progress_report_late_approval_status ON daily_progress_report(late_approval_status);
CREATE INDEX IF NOT EXISTS idx_daily_progress_report_profile_report_date ON daily_progress_report(profile_id, report_date);

INSERT INTO permission (key, module, action, description)
VALUES
  ('daily_progress.submit', 'daily_progress', 'submit', 'Submit own Daily Progress Report'),
  ('daily_progress.view_own', 'daily_progress', 'view_own', 'View own Daily Progress Reports'),
  ('daily_progress.view_all', 'daily_progress', 'view_all', 'View Daily Progress Reports for employees'),
  ('daily_progress.manage', 'daily_progress', 'manage', 'Manage Daily Progress Reports'),
  ('daily_progress.mark_missed', 'daily_progress', 'mark_missed', 'Mark missed Daily Progress Reports'),
  ('daily_progress.adjust', 'daily_progress', 'adjust', 'Adjust Daily Progress Reports'),
  ('daily_progress.approve_late', 'daily_progress', 'approve_late', 'Approve late Daily Progress Reports')
ON CONFLICT (key)
DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = now();

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.key IN (
  'daily_progress.submit',
  'daily_progress.view_own',
  'daily_progress.view_all',
  'daily_progress.manage',
  'daily_progress.mark_missed',
  'daily_progress.adjust',
  'daily_progress.approve_late'
)
WHERE r.slug IN (
  'executive',
  'manager',
  'supervisor',
  'director',
  'marketing-director',
  'full-stack-developer'
)
ON CONFLICT (role_id, permission_id)
DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.key IN (
  'daily_progress.submit',
  'daily_progress.view_own'
)
WHERE r.slug IN (
  'brand-officer',
  'ads-specialist',
  'content-creator',
  'employee',
  'client-viewer'
)
ON CONFLICT (role_id, permission_id)
DO NOTHING;

-- Future product decision: if per-brand progress reporting is required,
-- extend the uniqueness constraint to include brand_id with a clear migration.
