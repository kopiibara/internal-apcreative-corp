-- Allow reviewers to reject submitted task proof instead of only approving or requesting revision.

ALTER TABLE task_assignment
DROP CONSTRAINT IF EXISTS task_assignment_status_check;

ALTER TABLE task_assignment
ADD CONSTRAINT task_assignment_status_check
CHECK (status IN ('ASSIGNED', 'BLOCKER', 'PENDING', 'REVISION', 'REJECTED', 'DONE'));
