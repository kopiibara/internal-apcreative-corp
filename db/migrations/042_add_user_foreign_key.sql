-- Add FK from profile.auth_user_id to Better Auth "user" table only if that table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'user'
      AND table_schema = 'public'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'profile'
        AND constraint_name = 'fk_profile_auth_user_id'
    ) THEN
      ALTER TABLE profile
      ADD CONSTRAINT fk_profile_auth_user_id
      FOREIGN KEY (auth_user_id)
      REFERENCES "user"(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    END IF;
  END IF;
END;
$$;
