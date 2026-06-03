-- Allow reviewers to override completed graded task scoring with an audit trail.

ALTER TABLE task_assignment
ADD COLUMN IF NOT EXISTS points_awarded_override INTEGER,
ADD COLUMN IF NOT EXISTS late_deduction_override INTEGER,
ADD COLUMN IF NOT EXISTS scoring_override_reason TEXT,
ADD COLUMN IF NOT EXISTS scoring_overridden_by_profile_id INTEGER REFERENCES profile(id) ON DELETE SET NULL ON UPDATE CASCADE,
ADD COLUMN IF NOT EXISTS scoring_overridden_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_assignment_points_awarded_override_non_negative'
  ) THEN
    ALTER TABLE task_assignment
    ADD CONSTRAINT task_assignment_points_awarded_override_non_negative
    CHECK (points_awarded_override IS NULL OR points_awarded_override >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_assignment_late_deduction_override_non_negative'
  ) THEN
    ALTER TABLE task_assignment
    ADD CONSTRAINT task_assignment_late_deduction_override_non_negative
    CHECK (late_deduction_override IS NULL OR late_deduction_override >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_task_assignment_scoring_overridden_by
ON task_assignment(scoring_overridden_by_profile_id);
