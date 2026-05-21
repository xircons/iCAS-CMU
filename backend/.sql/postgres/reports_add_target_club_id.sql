-- Routes member feedback to a specific club for leader inbox filtering.
-- Run once on Postgres (Supabase SQL editor or psql -f this file).

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS target_club_id INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_reports_target_club_id ON reports (target_club_id);

DO $$
BEGIN
  ALTER TABLE reports
    ADD CONSTRAINT reports_target_club_id_fkey
    FOREIGN KEY (target_club_id) REFERENCES clubs (id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
