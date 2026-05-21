/** Interpret DB row / driver value for suspended flag */
export function isSuspendedValue(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (v === false || v === 0 || v == null) return false;
  if (typeof v === 'string') {
    const t = v.toLowerCase();
    return t === 't' || t === 'true' || t === '1';
  }
  return false;
}

export function isSuspendedDbRow(row: Record<string, unknown>): boolean {
  const v = row.is_suspended ?? row.isSuspended ?? row.s ?? row.S;
  return isSuspendedValue(v);
}
