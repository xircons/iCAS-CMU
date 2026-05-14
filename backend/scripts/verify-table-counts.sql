-- Run in MariaDB (temp) and Supabase SQL editor after migration; compare counts.
SELECT relname AS table_name, n_live_tup AS approximate_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;

-- Per-table exact counts (Postgres):
-- SELECT 'users' AS t, COUNT(*) FROM users
-- UNION ALL SELECT 'events', COUNT(*) FROM events;
