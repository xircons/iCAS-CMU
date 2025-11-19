-- Add regenerate_on_checkin column to check_in_sessions table
-- Run this SQL directly in your database

ALTER TABLE check_in_sessions 
ADD COLUMN IF NOT EXISTS regenerate_on_checkin tinyint(1) NOT NULL DEFAULT 1 
AFTER is_active;

