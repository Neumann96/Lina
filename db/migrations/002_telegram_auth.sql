ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ALTER COLUMN salt DROP NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name text;

CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_idx
  ON users (telegram_id)
  WHERE telegram_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_has_login_method'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_has_login_method CHECK (
      (email IS NOT NULL AND password_hash IS NOT NULL AND salt IS NOT NULL)
      OR telegram_id IS NOT NULL
    );
  END IF;
END
$$;
