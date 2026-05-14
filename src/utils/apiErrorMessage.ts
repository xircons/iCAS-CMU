/**
 * Normalize API error payloads for Thai user-visible copy during mixed deployments.
 * Prefer stable `error.code` from the backend when present.
 */

const THAI_CHAR = /[\u0E00-\u0E7F]/;

export function messageLooksThai(text: string): boolean {
  return THAI_CHAR.test(text);
}

/** Check-in: mirrors backend `createApiError` messages in `checkinController`. */
const CHECKIN_ERROR_CODE_THAI: Record<string, string> = {
  CHECKIN_NOT_YET_TIME: 'ยังไม่ถึงเวลากิจกรรม',
  CHECKIN_INVALID_EVENT_ID: 'รหัสกิจกรรมไม่ถูกต้อง',
  CHECKIN_EVENT_NOT_FOUND: 'ไม่พบกิจกรรม',
  CHECKIN_SESSION_CONFLICT:
    'มีเซสชันเช็กอินที่เปิดอยู่แล้วสำหรับกิจกรรมนี้ กรุณาปิดเซสชันปัจจุบันก่อนเริ่มใหม่',
  CHECKIN_QR_REQUIRED: 'กรุณาส่งข้อมูล QR Code',
  CHECKIN_QR_INVALID_FORMAT: 'รูปแบบ QR Code ไม่ถูกต้อง',
  CHECKIN_NO_ACTIVE_SESSION: 'ไม่พบเซสชันเช็กอินที่เปิดอยู่',
  CHECKIN_QR_INVALID: 'QR Code ไม่ถูกต้อง',
  CHECKIN_NOT_CLUB_MEMBER: 'คุณต้องเป็นสมาชิกชมรมที่จัดกิจกรรมนี้จึงจะเช็กอินได้',
  CHECKIN_ALREADY_CHECKED_IN: 'คุณเช็กอินกิจกรรมนี้แล้ว',
  CHECKIN_RECORD_FAILED: 'บันทึกการเช็กอินไม่สำเร็จ กรุณาลองอีกครั้ง',
  CHECKIN_PASSCODE_REQUIRED: 'กรุณากรอกรหัส Passcode',
  CHECKIN_PASSCODE_INVALID_FORMAT: 'รหัส Passcode ต้องเป็นตัวเลข 6 หลัก',
  CHECKIN_PASSCODE_INVALID: 'รหัส Passcode ไม่ถูกต้องหรือหมดอายุ',
};

function legacyCheckinEnglishToThai(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  if (/expired/i.test(s) || /no active/i.test(s) || /invalid qr code/i.test(s)) {
    return 'QR Code หมดอายุ กรุณาขอ QR Code ใหม่จากหัวหน้าชมรม';
  }
  return undefined;
}

export function axiosApiErrorPayload(error: unknown): { message?: string; code?: string } {
  const e = error as {
    response?: { data?: { error?: { message?: unknown; code?: unknown }; message?: unknown } };
  };
  const block = e.response?.data?.error;
  const message =
    typeof block?.message === 'string'
      ? block.message
      : typeof e.response?.data?.message === 'string'
        ? e.response.data.message
        : undefined;
  const code = typeof block?.code === 'string' ? block.code : undefined;
  return { message, code };
}

/**
 * @param rawMessage server `error.message` (may be English on old deployments)
 * @param errorCode server `error.code` when present
 * @param fallbackThai Thai string when nothing else applies
 */
export function toUserThaiMessage(
  rawMessage: string | undefined,
  errorCode: string | undefined,
  fallbackThai: string,
): string {
  const code = errorCode?.trim();
  if (code && CHECKIN_ERROR_CODE_THAI[code]) {
    return CHECKIN_ERROR_CODE_THAI[code];
  }

  const raw = rawMessage?.trim() ?? '';
  if (raw && messageLooksThai(raw)) {
    return raw;
  }

  const legacy = raw ? legacyCheckinEnglishToThai(raw) : undefined;
  if (legacy) return legacy;

  if (!raw) return fallbackThai;
  if (!messageLooksThai(raw)) return fallbackThai;
  return raw;
}