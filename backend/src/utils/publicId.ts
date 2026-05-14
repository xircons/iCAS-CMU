import { customAlphabet } from 'nanoid';

export const PUBLIC_ID_LENGTH = 10;
const PUBLIC_ID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-';

const generatePublicId = customAlphabet(PUBLIC_ID_ALPHABET, PUBLIC_ID_LENGTH);

export function generateClubPublicId(): string {
  return generatePublicId();
}

export function generateAssignmentPublicId(): string {
  return generatePublicId();
}

export function isValidPublicIdSegment(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length !== PUBLIC_ID_LENGTH) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return false;
  if (/^\d+$/.test(trimmed)) return false;
  return true;
}
