CREATE TABLE IF NOT EXISTS study_folders (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS study_folders_user_name_idx
  ON study_folders (user_id, lower(name));

ALTER TABLE study_sets
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES study_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS study_sets_folder_idx
  ON study_sets (folder_id, created_at DESC);
