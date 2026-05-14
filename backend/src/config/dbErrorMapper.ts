/**
 * Map Postgres error codes onto legacy MySQL-style codes used in controllers.
 * Returns a proper Error instance so message/stack survive Express handling.
 */
export function normalizeDbError(error: unknown): Error {
  if (error instanceof Error) {
    const err = error as Error & {
      code?: string;
      detail?: string;
      constraint?: string;
      table?: string;
    };
    const message =
      (typeof err.message === 'string' && err.message) ||
      (typeof err.detail === 'string' && err.detail) ||
      'Database error';

    const out = Object.assign(new Error(message), err) as Error & Record<string, unknown>;
    const code = err.code;

    switch (code) {
      case '42P01': // undefined_table
        out.code = 'ER_NO_SUCH_TABLE';
        break;
      case '23505': // unique_violation
        (out as { errno?: number }).errno = 1062;
        out.code = 'ER_DUP_ENTRY';
        break;
      case '23503': // foreign_key_violation
        out.code = 'ER_NO_REFERENCED_ROW_2';
        break;
      case '23502': {
        // not_null_violation — common after pgloader without DEFAULT on surrogate keys
        const isClubMembershipId =
          /club_memberships/i.test(message) &&
          /null value in column/i.test(message) &&
          /column\s+"id"/i.test(message);
        if (isClubMembershipId) {
          out.message =
            'We could not save your club join request. Please try again. If this keeps happening, redeploy or restart the server with the latest version, or ask an administrator to apply the Postgres fix for membership IDs.';
          (out as Error & { statusCode?: number }).statusCode = 503;
          (out as Error & { clientCode?: string }).clientCode =
            'CLUB_MEMBERSHIP_ID_NOT_NULL';
        }
        break;
      }
      case '42710': // duplicate_object
        out.code = 'ER_TABLE_EXISTS_ERROR';
        break;
      case '42703': // undefined_column
        out.code = 'ER_BAD_FIELD_ERROR';
        if (/\bpublic_id\b/i.test(message)) {
          out.message =
            'Database is missing public_id columns for NanoID URLs. Apply the migration in backend/.sql/postgres/supplementary.sql (sections that ALTER clubs and club_assignments). Run that script in the Supabase SQL editor (or psql) against the same database as DATABASE_URL.';
          (out as Error & { statusCode?: number }).statusCode = 503;
        } else if (/\breports\b/i.test(message) && /\btarget_club_id\b/i.test(message)) {
          out.message =
            'Database is missing reports.target_club_id. Apply backend/.sql/postgres/reports_add_target_club_id.sql in Supabase SQL (or psql), then redeploy.';
          (out as Error & { statusCode?: number }).statusCode = 503;
        }
        break;
      default:
        break;
    }

    out.sqlMessage = message;
    return out;
  }

  return error instanceof Error ? error : new Error(String(error));
}
