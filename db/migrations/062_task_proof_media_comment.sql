-- Task proof IMAGE/VIDEO values are stored in existing task_assignment.proof_url.
-- proof_type already allows ('IMAGE', 'VIDEO', 'LINK', 'NOTE') from 015_refactor_task_assignments.sql.
-- Media proofs use base64 data URLs (see lib/tasks/task-proof-media.ts).

COMMENT ON COLUMN task_assignment.proof_type IS
  'Proof channel: IMAGE, VIDEO, LINK, or NOTE.';

COMMENT ON COLUMN task_assignment.proof_url IS
  'HTTP(S) link for LINK proofs, or base64 data URL for IMAGE/VIDEO proofs.';
