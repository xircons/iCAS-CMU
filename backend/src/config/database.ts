import '../envBootstrap';
import pg, { Pool, PoolClient } from 'pg';
import type { ResultSetHeader } from '../types/db';
import { normalizeDbError } from './dbErrorMapper';

function sanitizePgSchemaName(name: string): string | null {
  const t = name.trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t)) return null;
  return t;
}

/** Safe schema list from PG_SEARCH_PATH (comma-separated). Drops junk/trailing commas. */
function parseSearchPathParts(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const s = sanitizePgSchemaName(part);
    if (s) out.push(s);
  }
  return out;
}

/** Parses PG_SEARCH_PATH ("a, b") into safe schema names for SQL IN (...). */
function pgSearchPathSchemaList(): string[] {
  return parseSearchPathParts(process.env.PG_SEARCH_PATH);
}

function useSsl(): boolean {
  const url = process.env.DATABASE_URL?.toLowerCase() ?? '';
  if (url.includes('sslmode=disable')) return false;
  if (url.includes('sslmode=require') || url.includes('supabase.co')) return true;
  return process.env.DB_SSL === 'true';
}

function buildPoolConfig(): pg.PoolConfig {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const ssl = useSsl() ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined;
  const max = parseInt(process.env.DB_POOL_MAX || '5', 10);
  // Supabase session pooler (port 5432 or 6543) enforces a per-role connection limit;
  // keep the pool small. Raise via DB_POOL_MAX when self-hosting a larger Postgres.
  const connectionTimeoutMillis = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10);

  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      ssl,
      max,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgres',
    ssl,
    max,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis,
  };
}

export const pgPool = new Pool(buildPoolConfig());

const searchPathSchemasForPool = parseSearchPathParts(process.env.PG_SEARCH_PATH);

async function ensureSearchPathOnClient(c: PoolClient): Promise<void> {
  if (searchPathSchemasForPool.length === 0) return;
  const searchPathQuoted = searchPathSchemasForPool.map((s) => `"${s.replace(/"/g, '""')}"`).join(', ');
  await c.query(`SET search_path TO ${searchPathQuoted}`);
}

/** Rewrite common MySQL idioms used in this codebase (before `?` → `$n`). */
export function mysqlSqlToPostgres(sql: string): string {
  let out = sql;

  out = out.replace(
    /\bDATE_FORMAT\s*\(\s*([^,]+?)\s*,\s*'%Y-%m-%d %H:%i:%s'\s*\)/gi,
    (_match, col: string) =>
      `to_char((${col.trim()})::timestamp, 'YYYY-MM-DD HH24:MI:SS')`,
  );
  out = out.replace(
    /\bDATE_FORMAT\s*\(\s*([^,]+?)\s*,\s*'%Y-%m-%d'\s*\)/gi,
    (_match, col: string) => `to_char((${col.trim()})::date, 'YYYY-MM-DD')`,
  );

  out = out.replace(/\bCURDATE\s*\(\s*\)/gi, 'CURRENT_DATE');

  out = out.replace(
    /\bDATE_SUB\s*\(\s*NOW\s*\(\s*\)\s*,\s*INTERVAL\s+(\d+)\s+MINUTE\s*\)/gi,
    (_m, min: string) => `(NOW() - INTERVAL '${min} minutes')`,
  );

  out = out.replace(/\bDATE\s*\(\s*([^)]+?)\s*\)/gi, (_m, inner: string) => `(${inner.trim()})::date`);

  out = out.replace(/\bSELECT\s+DATABASE\s*\(\s*\)/gi, 'SELECT current_database()');

  // MySQL CONCAT(first, ' ', last) for sender display names (reports queries).
  out = out.replace(
    /\bCONCAT\s*\(\s*u\.first_name\s*,\s*' '\s*,\s*u\.last_name\s*\)/gi,
    "(trim(both from (coalesce(u.first_name::text, '') || ' ' || coalesce(u.last_name::text, ''))))",
  );

  const trimmed = out.trim();
  const showTablesLike = /^\s*SHOW\s+TABLES\s+LIKE\s+'([^']+)'\s*;?\s*$/i.exec(trimmed);
  const schemas = pgSearchPathSchemaList();
  const schemaFilter =
    schemas.length > 0
      ? `schemaname IN (${schemas.map((s) => `'${s}'`).join(', ')})`
      : 'schemaname = current_schema()';
  if (showTablesLike) {
    const like = showTablesLike[1];
    out = `SELECT tablename FROM pg_catalog.pg_tables WHERE ${schemaFilter} AND tablename LIKE '${like.replace(
      /'/g,
      "''",
    )}'`;
  } else if (/^\s*SHOW\s+TABLES\s*;?\s*$/i.test(trimmed)) {
    out = `SELECT tablename FROM pg_catalog.pg_tables WHERE ${schemaFilter} ORDER BY schemaname, tablename`;
  }

  return out;
}

function convertQuestionMarksToNumbered(sql: string, params: unknown[]): { text: string; values: unknown[] } {
  if (!params.length) {
    if (sql.includes('?')) throw new Error('SQL has "?" placeholders but no parameters');
    return { text: sql, values: [] };
  }

  let paramIndex = 0;
  let out = '';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      out += ch;
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          out += "''";
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          out += "'";
          break;
        }
        out += sql[i];
        i++;
      }
      continue;
    }
    if (ch === '?') {
      paramIndex += 1;
      out += `$${paramIndex}`;
      continue;
    }
    out += ch;
  }
  if (paramIndex !== params.length) {
    throw new Error(`SQL placeholder mismatch: ${paramIndex} "?" markers vs ${params.length} params`);
  }
  return { text: out, values: params };
}

function appendReturningIdForInsert(sql: string): string {
  const trimmed = sql.trim();
  if (!/^insert\s+/i.test(trimmed)) return sql;
  if (/\breturning\b/i.test(trimmed)) return sql;
  const withoutSemi = trimmed.replace(/;+\s*$/, '');
  return `${withoutSemi} RETURNING id`;
}

function insertIdFromReturningRow(row: unknown): number {
  if (!row || typeof row !== 'object') return 0;
  const id = (row as { id?: unknown }).id;
  if (id == null || id === '') return 0;
  if (typeof id === 'bigint') {
    const n = Number(id);
    return Number.isFinite(n) ? n : 0;
  }
  const n = typeof id === 'number' ? id : Number(String(id));
  return Number.isFinite(n) ? n : 0;
}

async function runQueryInner(
  client: Pool | PoolClient,
  sql: string,
  params?: unknown[],
): Promise<[unknown, undefined]> {
  let transformed = mysqlSqlToPostgres(sql);
  let finalSql = transformed;
  let values: unknown[] = params ?? [];

  if (params?.length) {
    const conv = convertQuestionMarksToNumbered(finalSql, params);
    finalSql = conv.text;
    values = conv.values;
  } else if (transformed.includes('?')) {
    throw new Error('Query has "?" placeholders but params were omitted');
  }

  let execSql = finalSql;
  if (/^\s*insert\s+/i.test(execSql.trim())) {
    execSql = appendReturningIdForInsert(execSql);
  }

  try {
    const execOnClient = async (c: PoolClient): Promise<[unknown, undefined]> => {
      await ensureSearchPathOnClient(c);
      const result = await c.query(execSql, values);

      if (result.command === 'SELECT') {
        return [result.rows, undefined];
      }
      if (result.command === 'INSERT') {
        const row = result.rows[0] as unknown;
        const insertId = insertIdFromReturningRow(row);
        const header: ResultSetHeader = {
          affectedRows: result.rowCount ?? 0,
          insertId,
        };
        return [header, undefined];
      }
      const header: ResultSetHeader = {
        affectedRows: result.rowCount ?? 0,
        insertId: 0,
      };
      return [header, undefined];
    };

    if (client === pgPool) {
      const leased = await pgPool.connect();
      try {
        return await execOnClient(leased);
      } finally {
        leased.release();
      }
    }

    return await execOnClient(client as PoolClient);
  } catch (err) {
    throw normalizeDbError(err);
  }
}

/** @deprecated Prefer `mysqlSqlToPostgres` + driver; exposed for diagnostics */
export function sqlToPg(sql: string): string {
  let n = 0;
  return mysqlSqlToPostgres(sql).replace(/\?/g, () => `$${++n}`);
}

async function execCompat<R = unknown>(sql: string, params?: unknown[]): Promise<[R, undefined]> {
  return runQueryInner(pgPool, sql, params) as unknown as [R, undefined];
}

const poolCompat = {
  execute: execCompat,

  /** mysql2-compatible: resolves to `[rowsOrHeader, fields]` (fields always undefined) */
  query: async <R = unknown>(sql: string, params?: unknown[]): Promise<[R, undefined]> =>
    runQueryInner(pgPool, sql, params) as unknown as [R, undefined],

  getConnection: async () => {
    const client = await pgPool.connect();
    return {
      execute: <R = unknown>(sql: string, params?: unknown[]) =>
        runQueryInner(client, sql, params) as unknown as Promise<[R, undefined]>,
      query: (sql: string, params?: unknown[]) => runQueryInner(client, sql, params),
      release: () => client.release(),
      ping: async () => client.query('SELECT 1'),
    };
  },

  end: () => pgPool.end(),
};

export default poolCompat;

export const testConnection = async (maxRetries = 10, delayMs = 2000): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const c = await pgPool.connect();
      await c.query('SELECT 1');
      c.release();
      console.log('Database connected successfully');
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: string }).code)
          : '';
      const detail = code ? `${code}: ${message}` : message;
      if (attempt < maxRetries) {
        console.warn(
          `Database connection attempt ${attempt}/${maxRetries} failed (${detail}). Retrying in ${delayMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error('Database connection failed after', maxRetries, 'attempts:', message);
        if (message.includes('tenant/user') && message.includes('not found')) {
          console.error(
            'Database hint: Supabase pooler rejected the user/project id embedded in DATABASE_URL (username postgres.<project_ref>).',
          );
          console.error(
            'Update backend/.env with a fresh connection string from Supabase: Project Settings > Database (URI must match this project).',
          );
        }
        return false;
      }
    }
  }
  return false;
};
