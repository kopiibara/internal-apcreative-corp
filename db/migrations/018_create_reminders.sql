-- Personal reminders for the To-Do module.

CREATE TABLE IF NOT EXISTS reminder (
  id SERIAL PRIMARY KEY,
  creator_profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  remind_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'DUE', 'DONE', 'ARCHIVED')
  ),
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (
    priority IN ('LOW', 'MEDIUM', 'HIGH')
  ),
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminder_creator_profile_id
ON reminder(creator_profile_id);

CREATE INDEX IF NOT EXISTS idx_reminder_status
ON reminder(status);

CREATE INDEX IF NOT EXISTS idx_reminder_remind_at
ON reminder(remind_at);

CREATE INDEX IF NOT EXISTS idx_reminder_priority
ON reminder(priority);

CREATE INDEX IF NOT EXISTS idx_reminder_created_at
ON reminder(created_at);

DROP TRIGGER IF EXISTS set_reminder_updated_at ON reminder;

CREATE TRIGGER set_reminder_updated_at
BEFORE UPDATE ON reminder
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
