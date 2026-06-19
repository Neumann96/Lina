CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash char(128) NOT NULL,
  salt char(32) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_normalized CHECK (email = lower(trim(email)))
);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  scope text NOT NULL,
  key_hash char(64) NOT NULL,
  window_started_at timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts > 0),
  PRIMARY KEY (scope, key_hash)
);

CREATE INDEX IF NOT EXISTS auth_rate_limits_window_idx
  ON auth_rate_limits (window_started_at);

CREATE TABLE IF NOT EXISTS study_sets (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS study_sets_user_created_idx
  ON study_sets (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY,
  set_id uuid NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE,
  term text NOT NULL CHECK (char_length(term) BETWEEN 1 AND 500),
  definition text NOT NULL CHECK (char_length(definition) BETWEEN 1 AND 1000),
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (set_id, position)
);

CREATE INDEX IF NOT EXISTS cards_set_idx ON cards (set_id);

CREATE TABLE IF NOT EXISTS card_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  is_correct boolean NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS card_reviews_user_date_idx
  ON card_reviews (user_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS card_reviews_card_idx ON card_reviews (card_id);
