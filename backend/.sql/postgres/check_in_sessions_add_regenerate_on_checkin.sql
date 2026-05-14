-- Optional: align Postgres with app expectations (MySQL dump already includes this column).
ALTER TABLE check_in_sessions
  ADD COLUMN IF NOT EXISTS regenerate_on_checkin BOOLEAN NOT NULL DEFAULT true;
