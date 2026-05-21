/** Format a Date for `<input type="date">` using the local calendar (avoids UTC off-by-one). */
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse API/DB date values as a local calendar date (no UTC day shift). */
export function parseCalendarDate(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const s = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const parsed = new Date(s);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

/** `<input type="date">` value is already YYYY-MM-DD — pass through to the API. */
export function dateInputToApi(dateInput: string): string {
  return dateInput.trim();
}
