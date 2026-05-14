/** node-pg lowercases unquoted SQL aliases — read camelCase, lowercase, or any case-matching key. */
export function pgVal(row: Record<string, unknown>, key: string): unknown {
  if (row == null || typeof row !== 'object') return undefined;
  const rec = row as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(rec, key)) return rec[key];
  const lower = key.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(rec, lower)) return rec[lower];
  for (const k of Object.keys(rec)) {
    if (k.toLowerCase() === lower) return rec[k];
  }
  return undefined;
}

export function pgDateIso(row: Record<string, unknown>, key: string): string | undefined {
  const v = pgVal(row, key);
  if (v == null || v === '') return undefined;
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v.toISOString() : undefined;
  const d = new Date(typeof v === 'number' ? v : String(v));
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
}

export function pgDateIsoReq(row: Record<string, unknown>, key: string): string {
  return pgDateIso(row, key) ?? new Date(0).toISOString();
}
