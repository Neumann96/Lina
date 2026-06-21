CREATE TABLE IF NOT EXISTS study_set_progress (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  set_id uuid NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE,
  next_position integer NOT NULL DEFAULT 0 CHECK (next_position >= 0),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, set_id)
);

CREATE INDEX IF NOT EXISTS study_set_progress_updated_idx
  ON study_set_progress (user_id, updated_at DESC);

INSERT INTO study_set_progress (user_id, set_id, next_position, updated_at)
SELECT
  s.user_id,
  s.id,
  LEAST(COUNT(DISTINCT r.card_id), COUNT(DISTINCT c.id))::integer,
  COALESCE(MAX(r.reviewed_at), s.created_at)
FROM study_sets s
JOIN cards c ON c.set_id = s.id
JOIN card_reviews r ON r.card_id = c.id AND r.user_id = s.user_id
GROUP BY s.id
ON CONFLICT (user_id, set_id) DO NOTHING;
