import pool from './database';

/**
 * Auth and admin handlers expect Postgres column users.is_suspended.
 * Applies IF NOT EXISTS (idempotent). Set SKIP_AUTO_SCHEMA_PATCH=true when migrations only.
 */
export async function ensureUserSuspensionSchema(): Promise<void> {
  if (process.env.SKIP_AUTO_SCHEMA_PATCH === 'true') {
    return;
  }
  try {
    await pool.execute(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE`,
      [],
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[schema] Could not ensure users.is_suspended:', msg);
  }
}
