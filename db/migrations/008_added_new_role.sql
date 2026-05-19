-- Add DIRECTOR and FULL_STACK_DEVELOPER as valid profile.account_type values

ALTER TABLE profile
DROP CONSTRAINT IF EXISTS profile_account_type_check;

ALTER TABLE profile
ADD CONSTRAINT profile_account_type_check
CHECK (
  account_type IN (
    'CLIENT',
    'EMPLOYEE',
    'SUPERVISOR',
    'MANAGER',
    'EXECUTIVE',
    'FULL_STACK_DEVELOPER',
    'DIRECTOR'
  )
);