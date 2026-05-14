export const PUBLIC_ID_LENGTH = 10;

/** Matches backend `isValidPublicIdSegment` for `/clubs/:clubId/...` route segments. */
export function isValidPublicIdSegment(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length !== PUBLIC_ID_LENGTH) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return false;
  if (/^\d+$/.test(trimmed)) return false;
  return true;
}

/** `/clubs/:clubId/...` expects `public_id` (10 chars), not numeric DB id. */
export function clubPublicRouteSegment(
  clubPublicIdProp: string | number | undefined,
  doc: { clubPublicId?: string; clubId?: number } | null | undefined,
): string | undefined {
  if (typeof clubPublicIdProp === 'string' && isValidPublicIdSegment(clubPublicIdProp)) {
    return clubPublicIdProp.trim();
  }
  const fromDoc = doc?.clubPublicId;
  if (typeof fromDoc === 'string' && isValidPublicIdSegment(fromDoc)) {
    return fromDoc.trim();
  }
  return undefined;
}
