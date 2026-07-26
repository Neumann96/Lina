ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_username text;

ALTER TABLE auth_sessions
  ADD COLUMN IF NOT EXISTS auth_method text DEFAULT 'email';

ALTER TABLE auth_sessions
  ALTER COLUMN auth_method SET DEFAULT 'email';

UPDATE auth_sessions sessions
SET auth_method = CASE
  WHEN users.email IS NULL AND users.telegram_id IS NOT NULL THEN 'telegram'
  ELSE 'email'
END
FROM users
WHERE users.id = sessions.user_id
  AND sessions.auth_method IS NULL;

ALTER TABLE auth_sessions
  ALTER COLUMN auth_method SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auth_sessions_method_check'
  ) THEN
    ALTER TABLE auth_sessions
      ADD CONSTRAINT auth_sessions_method_check
      CHECK (auth_method IN ('email', 'telegram'));
  END IF;
END
$$;
