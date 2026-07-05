CREATE TABLE IF NOT EXISTS card_spaced_repetitions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  ease numeric(4,2) NOT NULL DEFAULT 2.50 CHECK (ease >= 1.30),
  interval_days integer NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  repetitions integer NOT NULL DEFAULT 0 CHECK (repetitions >= 0),
  due_at timestamptz NOT NULL DEFAULT NOW(),
  last_reviewed_at timestamptz NOT NULL DEFAULT NOW(),
  last_is_correct boolean NOT NULL DEFAULT false,
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS card_spaced_repetitions_due_idx
  ON card_spaced_repetitions (user_id, due_at);

CREATE INDEX IF NOT EXISTS card_spaced_repetitions_reminder_idx
  ON card_spaced_repetitions (due_at, reminder_sent_at);

INSERT INTO card_spaced_repetitions (
  user_id,
  card_id,
  ease,
  interval_days,
  repetitions,
  due_at,
  last_reviewed_at,
  last_is_correct,
  created_at,
  updated_at
)
SELECT DISTINCT ON (r.user_id, r.card_id)
  r.user_id,
  r.card_id,
  2.50,
  CASE WHEN r.is_correct THEN 1 ELSE 0 END,
  CASE WHEN r.is_correct THEN 1 ELSE 0 END,
  CASE WHEN r.is_correct THEN r.reviewed_at + INTERVAL '1 day' ELSE r.reviewed_at END,
  r.reviewed_at,
  r.is_correct,
  r.reviewed_at,
  r.reviewed_at
FROM card_reviews r
JOIN cards c ON c.id = r.card_id
JOIN study_sets s ON s.id = c.set_id AND s.user_id = r.user_id
ORDER BY r.user_id, r.card_id, r.reviewed_at DESC
ON CONFLICT (user_id, card_id) DO NOTHING;
