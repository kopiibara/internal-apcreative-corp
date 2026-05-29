-- Video proofs are not supported (files are too large for inline storage).

UPDATE task_assignment
SET
  proof_type = NULL,
  proof_url = NULL,
  proof_note = COALESCE(
    proof_note,
    'Legacy video proof was removed. Please resubmit as an image or link.'
  )
WHERE proof_type = 'VIDEO';

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname
  INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'task_assignment'
    AND nsp.nspname = 'public'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%proof_type%'
    AND pg_get_constraintdef(con.oid) LIKE '%VIDEO%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE task_assignment DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE task_assignment
ADD CONSTRAINT task_assignment_proof_type_check
CHECK (
  proof_type IS NULL
  OR proof_type IN ('IMAGE', 'LINK', 'NOTE')
);

COMMENT ON COLUMN task_assignment.proof_type IS
  'Proof channel: IMAGE, LINK, or NOTE.';

COMMENT ON COLUMN task_assignment.proof_url IS
  'HTTP(S) link for LINK proofs, or base64 data URL for IMAGE proofs.';
