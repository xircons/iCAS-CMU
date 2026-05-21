const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Normalize request date to YYYY-MM-DD without UTC timezone shift. */
export function normalizeCalendarDateInput(dateInput: string): string | null {
  const s = String(dateInput).trim();
  const m = YMD_RE.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const check = new Date(y, mo - 1, d);
    if (check.getFullYear() !== y || check.getMonth() !== mo - 1 || check.getDate() !== d) {
      return null;
    }
    return s;
  }
  const parsed = new Date(s);
  if (!Number.isFinite(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const mo = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** Build a local-midnight Date from a Postgres DATE / ISO / Date value (for JSON responses). */
export function localDateFromPgValue(value: unknown): Date {
  if (value == null || value === '') {
    return new Date(0);
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const s = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const parsed = new Date(s);
  if (!Number.isFinite(parsed.getTime())) {
    return new Date(0);
  }
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}
