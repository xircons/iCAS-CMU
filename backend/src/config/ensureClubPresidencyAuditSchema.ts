import pool from './database';

/**
 * Admin UI reads/writes presidency change history via club_presidency_audit.
 * Idempotent DDL on current search_path. Set SKIP_AUTO_SCHEMA_PATCH=true when migrations only.
 */
export async function ensureClubPresidencyAuditSchema(): Promise<void> {
  if (process.env.SKIP_AUTO_SCHEMA_PATCH === 'true') {
    return;
  }
  try {
    await pool.execute(
      `CREATE TABLE IF NOT EXISTS club_presidency_audit (
        id BIGSERIAL PRIMARY KEY,
        club_id INTEGER NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
        previous_president_user_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
        new_president_user_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
        changed_by_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      [],
    );
    await pool.execute(
      `CREATE INDEX IF NOT EXISTS idx_club_presidency_audit_club ON club_presidency_audit (club_id)`,
      [],
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[schema] Could not ensure club_presidency_audit:', msg);
  }
}
