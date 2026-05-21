import pool from './database';

/**
 * Smart document archive support.
 * Adds archived_at for soft-archive flow if missing.
 */
export async function ensureSmartDocumentArchiveSchema(): Promise<void> {
  if (process.env.SKIP_AUTO_SCHEMA_PATCH === 'true') {
    return;
  }
  try {
    await pool.execute(
      `ALTER TABLE smart_documents ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL`,
      [],
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[schema] Could not ensure smart_documents.archived_at:', msg);
  }
}
