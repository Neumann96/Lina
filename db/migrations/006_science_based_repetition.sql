ALTER TABLE card_reviews
  ADD COLUMN IF NOT EXISTS rating text,
  ADD COLUMN IF NOT EXISTS response_ms integer,
  ADD COLUMN IF NOT EXISTS review_kind text NOT NULL DEFAULT 'scheduled';

UPDATE card_reviews
SET rating = CASE WHEN is_correct THEN 'A' ELSE 'C' END
WHERE rating IS NULL;

ALTER TABLE card_reviews
  ALTER COLUMN rating SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_reviews_rating_check') THEN
    ALTER TABLE card_reviews
      ADD CONSTRAINT card_reviews_rating_check CHECK (rating IN ('A', 'B', 'C'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_reviews_response_ms_check') THEN
    ALTER TABLE card_reviews
      ADD CONSTRAINT card_reviews_response_ms_check
      CHECK (response_ms IS NULL OR response_ms BETWEEN 0 AND 300000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_reviews_review_kind_check') THEN
    ALTER TABLE card_reviews
      ADD CONSTRAINT card_reviews_review_kind_check
      CHECK (review_kind IN ('scheduled', 'same_session'));
  END IF;
END $$;

ALTER TABLE card_spaced_repetitions
  ADD COLUMN IF NOT EXISTS successful_reviews integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lapses integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'learning',
  ADD COLUMN IF NOT EXISTS last_rating text,
  ADD COLUMN IF NOT EXISTS reminder_attempted_at timestamptz;

UPDATE card_spaced_repetitions
SET successful_reviews = GREATEST(successful_reviews, repetitions),
    stage = CASE WHEN repetitions >= 3 THEN 'review' ELSE 'learning' END,
    last_rating = COALESCE(last_rating, CASE WHEN last_is_correct THEN 'A' ELSE 'C' END);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_spaced_repetitions_successful_reviews_check') THEN
    ALTER TABLE card_spaced_repetitions
      ADD CONSTRAINT card_spaced_repetitions_successful_reviews_check CHECK (successful_reviews >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_spaced_repetitions_lapses_check') THEN
    ALTER TABLE card_spaced_repetitions
      ADD CONSTRAINT card_spaced_repetitions_lapses_check CHECK (lapses >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_spaced_repetitions_stage_check') THEN
    ALTER TABLE card_spaced_repetitions
      ADD CONSTRAINT card_spaced_repetitions_stage_check CHECK (stage IN ('learning', 'review', 'relearning'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_spaced_repetitions_last_rating_check') THEN
    ALTER TABLE card_spaced_repetitions
      ADD CONSTRAINT card_spaced_repetitions_last_rating_check
      CHECK (last_rating IS NULL OR last_rating IN ('A', 'B', 'C'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS card_spaced_repetitions_reminder_attempt_idx
  ON card_spaced_repetitions (due_at, reminder_attempted_at)
  WHERE reminder_sent_at IS NULL;
