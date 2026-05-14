import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import { createApiError } from '../../../middleware/errorHandler';
import pool from '../../../config/database';
import type { RowDataPacket, ResultSetHeader } from '../../../types/db';
import { pgDateIso, pgVal } from '../../../utils/pgRowHelpers';
import { generatePasscode, isValidPasscodeFormat } from '../utils/passcodeGenerator';
import crypto from 'crypto';

// Get socket.io instance (will be set by socketServer)
let io: any = null;
export const setSocketIO = (socketIO: any) => {
  io = socketIO;
};

interface CheckInSession {
  id: number;
  event_id: number;
  passcode: string;
  qr_code_data: string;
  expires_at: Date;
  created_by: number;
  is_active: boolean;
  regenerate_on_checkin?: number | boolean;
}

/** Active row: Postgres boolean true, or legacy 0/1. Never compare boolean to integer on Postgres. */
const SQL_SESSION_ACTIVE =
  "(lower(trim(both from coalesce(is_active::text, ''))) IN ('1','true','t'))";
/** Inactive for cleanup (includes null and false). */
const SQL_SESSION_INACTIVE =
  "(is_active IS NULL OR lower(trim(both from coalesce(is_active::text, ''))) IN ('0','false','f',''))";
/** Compare passcode ignoring char(n) padding (Postgres). */
const SQL_PASSCODE_EQUALS = `trim(both from coalesce(passcode::text, '')) = trim(both from ?::text)`;

let cachedCheckInSessionsHasRegenerateColumn: boolean | undefined;

async function checkInSessionsHasRegenerateColumn(): Promise<boolean> {
  if (cachedCheckInSessionsHasRegenerateColumn !== undefined) {
    return cachedCheckInSessionsHasRegenerateColumn;
  }
  try {
    await pool.execute<RowDataPacket[]>('SELECT regenerate_on_checkin FROM check_in_sessions LIMIT 1');
    cachedCheckInSessionsHasRegenerateColumn = true;
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err ? String((err as { code?: unknown }).code) : '';
    if (code === '42703') {
      cachedCheckInSessionsHasRegenerateColumn = false;
    } else {
      console.warn('[check-in] regenerate_on_checkin column probe failed; assuming absent:', err);
      cachedCheckInSessionsHasRegenerateColumn = false;
    }
  }
  return cachedCheckInSessionsHasRegenerateColumn;
}

function sessionRowRegeneratesOnCheckin(session: CheckInSession | Record<string, unknown>): boolean {
  const row = session as Record<string, unknown>;
  const raw =
    row.regenerate_on_checkin ??
    row.regenerateOnCheckin ??
    pgVal(row, 'regenerate_on_checkin') ??
    pgVal(row, 'regenerateOnCheckin');
  if (raw === undefined || raw === null) return true;
  return raw === 1 || raw === true;
}

function parsePositiveIntId(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v) && v > 0) {
    return v;
  }
  if (typeof v === 'string' && /^\d+$/.test(v)) {
    const n = parseInt(v, 10);
    return n > 0 ? n : undefined;
  }
  return undefined;
}

const MSG_CHECKIN_BEFORE_EVENT_TIME = 'ยังไม่ถึงเวลากิจกรรม';

/** Block member/leader check-in until event date+time (server local wall clock). Admins bypass. */
function assertCanCheckInByEventSchedule(
  eventRow: Record<string, unknown>,
  userRole: string | undefined
): void {
  if (userRole === 'admin') return;

  const isoDate = pgDateIso(eventRow, 'date');
  if (!isoDate) return;

  const ymd = isoDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return;

  const timeRaw = String(pgVal(eventRow, 'time') ?? '').trim();
  const tm = timeRaw.match(/^(\d{1,2}):(\d{2})/);
  const hh = tm ? parseInt(tm[1], 10) : 0;
  const min = tm ? parseInt(tm[2], 10) : 0;

  const [y, mo, da] = ymd.split('-').map((x) => parseInt(x, 10));
  const startMs = new Date(y, mo - 1, da, hh, min, 0, 0).getTime();
  if (!Number.isFinite(startMs)) return;

  if (Date.now() < startMs) {
    throw createApiError(MSG_CHECKIN_BEFORE_EVENT_TIME, 400, 'CHECKIN_NOT_YET_TIME');
  }
}

/**
 * Start a check-in session for an event
 * POST /api/checkin/session/:eventId
 */
export const startCheckInSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const userId = req.user!.userId;

    if (!eventId || isNaN(eventId)) {
      return next(createApiError('รหัสกิจกรรมไม่ถูกต้อง', 400, 'CHECKIN_INVALID_EVENT_ID'));
    }

    // Check if event exists
    const [eventRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM events WHERE id = ?',
      [eventId]
    );

    if (eventRows.length === 0) {
      return next(createApiError('ไม่พบกิจกรรม', 404, 'CHECKIN_EVENT_NOT_FOUND'));
    }

    // Check if there's already an active session for this event
    const [existingSessionRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM check_in_sessions 
       WHERE event_id = ? AND ${SQL_SESSION_ACTIVE} AND expires_at > NOW()`,
      [eventId]
    );

    if (existingSessionRows.length > 0) {
      return next(
        createApiError(
          'มีเซสชันเช็กอินที่เปิดอยู่แล้วสำหรับกิจกรรมนี้ กรุณาปิดเซสชันปัจจุบันก่อนเริ่มใหม่',
          409,
          'CHECKIN_SESSION_CONFLICT',
        ),
      );
    }

    // Deactivate any expired sessions for this event (cleanup)
    await pool.execute(
      `UPDATE check_in_sessions SET is_active = false WHERE event_id = ? AND (expires_at <= NOW() OR ${SQL_SESSION_INACTIVE})`,
      [eventId]
    );

    // Generate passcode and QR code data
    const passcode = generatePasscode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes from now

    // Generate QR code data with security token
    const sessionId = crypto.randomBytes(16).toString('hex');
    const qrCodeData = JSON.stringify({
      eventId,
      sessionId,
      timestamp: Date.now(),
      token: crypto.createHash('sha256').update(`${eventId}-${sessionId}-${process.env.JWT_SECRET || 'secret'}`).digest('hex').substring(0, 16),
    });

    // Get regenerate_on_checkin option from request body (default: true for security)
    const regenerateOnCheckin = req.body.regenerateOnCheckin !== false; // Default to true

    // Create new session
    const hasRegenerateCol = await checkInSessionsHasRegenerateColumn();
    const [result] = await pool.execute<ResultSetHeader>(
      hasRegenerateCol
        ? `INSERT INTO check_in_sessions 
       (event_id, passcode, qr_code_data, expires_at, created_by, is_active, regenerate_on_checkin) 
       VALUES (?, ?, ?, ?, ?, true, ?)`
        : `INSERT INTO check_in_sessions 
       (event_id, passcode, qr_code_data, expires_at, created_by, is_active) 
       VALUES (?, ?, ?, ?, ?, true)`,
      hasRegenerateCol
        ? [eventId, passcode, qrCodeData, expiresAt, userId, regenerateOnCheckin ? 1 : 0]
        : [eventId, passcode, qrCodeData, expiresAt, userId],
    );

    // Emit WebSocket event
    if (io) {
      io.to(`event-${eventId}`).emit('check-in-session-started', {
        eventId,
        passcode,
        expiresAt,
      });
    }

    res.json({
      success: true,
      data: {
        passcode,
        qrCodeData,
        expiresAt: expiresAt.toISOString(),
        regenerateOnCheckin: regenerateOnCheckin,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check in via QR code
 * POST /api/checkin/qr
 */
export const checkInViaQR = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId, qrCodeData } = req.body;
    const userId = req.user!.userId;

    if (!qrCodeData) {
      return next(createApiError('กรุณาส่งข้อมูล QR Code', 400, 'CHECKIN_QR_REQUIRED'));
    }

    // Parse and validate QR code data
    let qrData;
    try {
      qrData = JSON.parse(qrCodeData);
    } catch {
      return next(createApiError('รูปแบบ QR Code ไม่ถูกต้อง', 400, 'CHECKIN_QR_INVALID_FORMAT'));
    }

    // Prefer event id from body or from QR payload (frontend often omits body.eventId)
    const effectiveEventId = parsePositiveIntId(eventId) ?? parsePositiveIntId(qrData.eventId);

    let sessionRows: RowDataPacket[];
    if (effectiveEventId) {
      [sessionRows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM check_in_sessions 
         WHERE event_id = ? AND ${SQL_SESSION_ACTIVE} AND expires_at > NOW()`,
        [effectiveEventId]
      );
    } else {
      [sessionRows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM check_in_sessions 
         WHERE ${SQL_SESSION_ACTIVE} AND expires_at > NOW()`,
        []
      );
    }

    if (sessionRows.length === 0) {
      return next(createApiError('ไม่พบเซสชันเช็กอินที่เปิดอยู่', 400, 'CHECKIN_NO_ACTIVE_SESSION'));
    }

    // Find the session that matches the QR code and validate token
    let session: CheckInSession | null = null;
    for (const row of sessionRows) {
      const storedQrData = JSON.parse(row.qr_code_data);
      if (storedQrData.sessionId === qrData.sessionId) {
        // Validate token for security
        const expectedToken = crypto.createHash('sha256')
          .update(`${row.event_id}-${qrData.sessionId}-${process.env.JWT_SECRET || 'secret'}`)
          .digest('hex')
          .substring(0, 16);
        
        if (qrData.token && qrData.token !== expectedToken) {
          // Token doesn't match - invalid QR code
          continue;
        }
        
        session = row as CheckInSession;
        break;
      }
    }

    if (!session) {
      return next(createApiError('QR Code ไม่ถูกต้อง', 400, 'CHECKIN_QR_INVALID'));
    }

    const actualEventId = session.event_id;

    // Get event info to check club membership
    const [eventRows] = await pool.execute<RowDataPacket[]>(
      'SELECT club_id, date, time FROM events WHERE id = ?',
      [actualEventId]
    );

    if (eventRows.length === 0) {
      return next(createApiError('ไม่พบกิจกรรม', 404, 'CHECKIN_EVENT_NOT_FOUND'));
    }

    const eventRow = eventRows[0] as Record<string, unknown>;
    assertCanCheckInByEventSchedule(eventRow, req.user?.role);

    const clubId = eventRows[0].club_id;

    // Check if user is a member of the club that organized this event
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM club_memberships 
       WHERE user_id = ? AND club_id = ? AND status = 'approved'`,
      [userId, clubId]
    );

    if (membershipRows.length === 0) {
      return next(
        createApiError(
          'คุณต้องเป็นสมาชิกชมรมที่จัดกิจกรรมนี้จึงจะเช็กอินได้',
          403,
          'CHECKIN_NOT_CLUB_MEMBER',
        ),
      );
    }

    // Check if already checked in
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM check_ins WHERE event_id = ? AND user_id = ?',
      [actualEventId, userId]
    );

    if (existingRows.length > 0) {
      return next(createApiError('คุณเช็กอินกิจกรรมนี้แล้ว', 409, 'CHECKIN_ALREADY_CHECKED_IN'));
    }

    // Create check-in record
    try {
      console.log(`[Check-in QR] Attempting to insert check-in record for event ${actualEventId}, user ${userId}`);
      const [insertResult] = await pool.execute<ResultSetHeader>(
        'INSERT INTO check_ins (event_id, user_id, check_in_method) VALUES (?, ?, ?)',
        [actualEventId, userId, 'qr']
      );

      if (!insertResult || insertResult.affectedRows === 0) {
        console.error(`[Check-in QR] Failed to insert check-in record - no rows affected`);
        return next(createApiError('บันทึกการเช็กอินไม่สำเร็จ กรุณาลองอีกครั้ง', 500, 'CHECKIN_RECORD_FAILED'));
      }
      console.log(`[Check-in QR] Successfully inserted check-in record. Insert ID: ${insertResult.insertId}, Affected rows: ${insertResult.affectedRows}`);
    } catch (insertError: any) {
      console.error('[Check-in QR] Error inserting check-in record:', insertError);
      // If it's a duplicate key error, handle it gracefully
      if (insertError.code === 'ER_DUP_ENTRY' || insertError.errno === 1062) {
        return next(createApiError('คุณเช็กอินกิจกรรมนี้แล้ว', 409, 'CHECKIN_ALREADY_CHECKED_IN'));
      }
      // Otherwise, rethrow as generic error
      return next(createApiError('บันทึกการเช็กอินไม่สำเร็จ กรุณาลองอีกครั้ง', 500, 'CHECKIN_RECORD_FAILED'));
    }

    // Check if we should regenerate QR code and passcode after check-in
    const shouldRegenerate = sessionRowRegeneratesOnCheckin(session);

    let newPasscode = null;
    let newQrCodeData = null;

    if (shouldRegenerate) {
      // Generate new passcode and QR code to prevent sharing
      newPasscode = generatePasscode();
      const newSessionId = crypto.randomBytes(16).toString('hex');
      newQrCodeData = JSON.stringify({
        eventId: actualEventId,
        sessionId: newSessionId,
        timestamp: Date.now(),
        token: crypto.createHash('sha256').update(`${actualEventId}-${newSessionId}-${process.env.JWT_SECRET || 'secret'}`).digest('hex').substring(0, 16),
      });

      // Update session with new passcode and QR code
      await pool.execute(
        `UPDATE check_in_sessions 
         SET passcode = ?, qr_code_data = ? 
         WHERE event_id = ? AND ${SQL_SESSION_ACTIVE}`,
        [newPasscode, newQrCodeData, actualEventId]
      );
    }

    // Get user info for WebSocket event
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT first_name, last_name FROM users WHERE id = ?',
      [userId]
    );

    const urow = userRows[0] as Record<string, unknown> | undefined;
    const firstName = String(pgVal(urow ?? {}, 'firstName') ?? pgVal(urow ?? {}, 'first_name') ?? '');
    const lastName = String(pgVal(urow ?? {}, 'lastName') ?? pgVal(urow ?? {}, 'last_name') ?? '');

    // Emit WebSocket events
    if (io) {
      // Emit check-in success
      io.to(`event-${actualEventId}`).emit('check-in-success', {
        eventId: actualEventId,
        userId,
        firstName,
        lastName,
        method: 'qr',
        checkInTime: new Date().toISOString(),
      });

      // Emit updated session if QR/passcode was regenerated
      if (shouldRegenerate && newPasscode && newQrCodeData) {
        io.to(`event-${actualEventId}`).emit('check-in-session-updated', {
          eventId: actualEventId,
          passcode: newPasscode,
          qrCodeData: newQrCodeData,
        });
      }
    }

    res.json({
      success: true,
      message: 'เช็กอินด้วย QR Code สำเร็จ',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check in via passcode
 * POST /api/checkin/passcode
 */
export const checkInViaPasscode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId, passcode } = req.body;
    const userId = req.user!.userId;

    console.log(`[Check-in Passcode] Request received - userId: ${userId}, passcode: ${passcode}, eventId: ${eventId || 'not provided'}`);

    if (!passcode) {
      return next(createApiError('กรุณากรอกรหัส Passcode', 400, 'CHECKIN_PASSCODE_REQUIRED'));
    }

    // Convert passcode to string to ensure consistent format
    const passcodeStr = String(passcode).trim();

    if (!isValidPasscodeFormat(passcodeStr)) {
      console.log(`[Check-in Passcode] Invalid passcode format: "${passcodeStr}"`);
      return next(
        createApiError('รหัส Passcode ต้องเป็นตัวเลข 6 หลัก', 400, 'CHECKIN_PASSCODE_INVALID_FORMAT'),
      );
    }

    // Find active session with matching passcode
    // If eventId is provided, use it for faster lookup, otherwise find by passcode only
    const parsedEventId = parsePositiveIntId(eventId);
    let sessionRows: RowDataPacket[];
    if (parsedEventId) {
      console.log(`[Check-in Passcode] Searching for session with eventId: ${parsedEventId}, passcode: ${passcodeStr}`);
      [sessionRows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM check_in_sessions 
         WHERE event_id = ? AND ${SQL_PASSCODE_EQUALS} AND ${SQL_SESSION_ACTIVE} AND expires_at > NOW()`,
        [parsedEventId, passcodeStr]
      );
    } else {
      console.log(`[Check-in Passcode] Searching for session with passcode only: ${passcodeStr}`);
      [sessionRows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM check_in_sessions 
         WHERE ${SQL_PASSCODE_EQUALS} AND ${SQL_SESSION_ACTIVE} AND expires_at > NOW()`,
        [passcodeStr]
      );
    }

    console.log(`[Check-in Passcode] Found ${sessionRows.length} active session(s) matching passcode`);

    if (sessionRows.length === 0) {
      // Also check if there are any sessions with this passcode but expired or inactive
      let debugRows: RowDataPacket[] = [];
      try {
        if (parsedEventId) {
          [debugRows] = await pool.execute<RowDataPacket[]>(
            `SELECT id, event_id, passcode, is_active, expires_at, NOW() as current_time
             FROM check_in_sessions 
             WHERE event_id = ? AND ${SQL_PASSCODE_EQUALS}`,
            [parsedEventId, passcodeStr]
          );
        } else {
          [debugRows] = await pool.execute<RowDataPacket[]>(
            `SELECT id, event_id, passcode, is_active, expires_at, NOW() as current_time
             FROM check_in_sessions 
             WHERE ${SQL_PASSCODE_EQUALS}`,
            [passcodeStr]
          );
        }
        
        if (debugRows.length > 0) {
          console.log(`[Check-in Passcode] Found ${debugRows.length} session(s) with this passcode but not active/expired:`, debugRows);
        } else {
          console.log(`[Check-in Passcode] No sessions found with passcode: ${passcodeStr}`);
        }
      } catch (debugError: any) {
        console.error('[Check-in Passcode] Error during debug query:', debugError);
        // Continue with error response even if debug query fails
      }

      return next(createApiError('รหัส Passcode ไม่ถูกต้องหรือหมดอายุ', 400, 'CHECKIN_PASSCODE_INVALID'));
    }

    // Get the event ID from the session
    const session = sessionRows[0] as CheckInSession;
    const actualEventId = session.event_id;

    // Get event info to check club membership
    const [eventRows] = await pool.execute<RowDataPacket[]>(
      'SELECT club_id, date, time FROM events WHERE id = ?',
      [actualEventId]
    );

    if (eventRows.length === 0) {
      return next(createApiError('ไม่พบกิจกรรม', 404, 'CHECKIN_EVENT_NOT_FOUND'));
    }

    const eventRow = eventRows[0] as Record<string, unknown>;
    assertCanCheckInByEventSchedule(eventRow, req.user?.role);

    const clubId = eventRows[0].club_id;

    // Check if user is a member of the club that organized this event
    // Leaders should also be able to check in
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, role FROM club_memberships 
       WHERE user_id = ? AND club_id = ? AND status = 'approved'`,
      [userId, clubId]
    );

    console.log(`[Check-in Passcode] Membership check - userId: ${userId}, clubId: ${clubId}, found: ${membershipRows.length} membership(s)`);

    if (membershipRows.length === 0) {
      console.log(`[Check-in Passcode] User ${userId} is not a member of club ${clubId}`);
      return next(
        createApiError(
          'คุณต้องเป็นสมาชิกชมรมที่จัดกิจกรรมนี้จึงจะเช็กอินได้',
          403,
          'CHECKIN_NOT_CLUB_MEMBER',
        ),
      );
    }

    console.log(`[Check-in Passcode] User ${userId} is a member/leader of club ${clubId}`);

    // Check if already checked in
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM check_ins WHERE event_id = ? AND user_id = ?',
      [actualEventId, userId]
    );

    if (existingRows.length > 0) {
      console.log(`[Check-in Passcode] User ${userId} has already checked in for event ${actualEventId}`);
      return next(createApiError('คุณเช็กอินกิจกรรมนี้แล้ว', 409, 'CHECKIN_ALREADY_CHECKED_IN'));
    }

    // Create check-in record
    try {
      console.log(`[Check-in Passcode] Attempting to insert check-in record for event ${actualEventId}, user ${userId}`);
      const [insertResult] = await pool.execute<ResultSetHeader>(
        'INSERT INTO check_ins (event_id, user_id, check_in_method) VALUES (?, ?, ?)',
        [actualEventId, userId, 'passcode']
      );

      if (!insertResult || insertResult.affectedRows === 0) {
        console.error(`[Check-in Passcode] Failed to insert check-in record - no rows affected`);
        return next(createApiError('บันทึกการเช็กอินไม่สำเร็จ กรุณาลองอีกครั้ง', 500, 'CHECKIN_RECORD_FAILED'));
      }
      console.log(`[Check-in Passcode] Successfully inserted check-in record. Insert ID: ${insertResult.insertId}, Affected rows: ${insertResult.affectedRows}`);
    } catch (insertError: any) {
      console.error('[Check-in Passcode] Error inserting check-in record:', insertError);
      // If it's a duplicate key error, handle it gracefully
      if (insertError.code === 'ER_DUP_ENTRY' || insertError.errno === 1062) {
        return next(createApiError('คุณเช็กอินกิจกรรมนี้แล้ว', 409, 'CHECKIN_ALREADY_CHECKED_IN'));
      }
      // Otherwise, rethrow as generic error
      return next(createApiError('บันทึกการเช็กอินไม่สำเร็จ กรุณาลองอีกครั้ง', 500, 'CHECKIN_RECORD_FAILED'));
    }

    // Check if we should regenerate QR code and passcode after check-in
    const shouldRegenerate = sessionRowRegeneratesOnCheckin(session);

    let newPasscode = null;
    let newQrCodeData = null;

    if (shouldRegenerate) {
      // Generate new passcode and QR code to prevent sharing
      newPasscode = generatePasscode();
      const newSessionId = crypto.randomBytes(16).toString('hex');
      newQrCodeData = JSON.stringify({
        eventId: actualEventId,
        sessionId: newSessionId,
        timestamp: Date.now(),
        token: crypto.createHash('sha256').update(`${actualEventId}-${newSessionId}-${process.env.JWT_SECRET || 'secret'}`).digest('hex').substring(0, 16),
      });

      // Update session with new passcode and QR code
      await pool.execute(
        `UPDATE check_in_sessions 
         SET passcode = ?, qr_code_data = ? 
         WHERE event_id = ? AND ${SQL_SESSION_ACTIVE}`,
        [newPasscode, newQrCodeData, actualEventId]
      );
    }

    // Get user info for WebSocket event
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT first_name, last_name FROM users WHERE id = ?',
      [userId]
    );

    const urow = userRows[0] as Record<string, unknown> | undefined;
    const firstName = String(pgVal(urow ?? {}, 'firstName') ?? pgVal(urow ?? {}, 'first_name') ?? '');
    const lastName = String(pgVal(urow ?? {}, 'lastName') ?? pgVal(urow ?? {}, 'last_name') ?? '');

    // Emit WebSocket events
    if (io) {
      // Emit check-in success
      io.to(`event-${actualEventId}`).emit('check-in-success', {
        eventId: actualEventId,
        userId,
        firstName,
        lastName,
        method: 'passcode',
        checkInTime: new Date().toISOString(),
      });

      // Emit updated session if QR/passcode was regenerated
      if (shouldRegenerate && newPasscode && newQrCodeData) {
        io.to(`event-${actualEventId}`).emit('check-in-session-updated', {
          eventId: actualEventId,
          passcode: newPasscode,
          qrCodeData: newQrCodeData,
        });
      }
    }

    res.json({
      success: true,
      message: 'เช็กอินด้วยรหัส Passcode สำเร็จ',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active check-in session for an event
 * GET /api/checkin/session/:eventId
 */
export const getCheckInSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const eventId = parseInt(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return next(createApiError('รหัสกิจกรรมไม่ถูกต้อง', 400, 'CHECKIN_INVALID_EVENT_ID'));
    }

    const hasRegenerateCol = await checkInSessionsHasRegenerateColumn();
    const selectCols = hasRegenerateCol
      ? `passcode,
        qr_code_data as qrCodeData,
        expires_at as expiresAt,
        is_active as isActive,
        regenerate_on_checkin as regenerateOnCheckin`
      : `passcode,
        qr_code_data as qrCodeData,
        expires_at as expiresAt,
        is_active as isActive`;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ${selectCols}
       FROM check_in_sessions 
       WHERE event_id = ? AND ${SQL_SESSION_ACTIVE} AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [eventId],
    );

    if (rows.length === 0) {
      res.json({
        success: true,
        data: null,
      });
      return;
    }

    const session = rows[0] as Record<string, unknown>;
    const regenDefault = !hasRegenerateCol;
    res.json({
      success: true,
      data: {
        passcode: pgVal(session, 'passcode') as string,
        qrCodeData: pgVal(session, 'qrCodeData') ?? pgVal(session, 'qr_code_data'),
        expiresAt: pgVal(session, 'expiresAt') ?? pgVal(session, 'expires_at'),
        isActive:
          pgVal(session, 'isActive') === 1 ||
          pgVal(session, 'is_active') === 1 ||
          pgVal(session, 'is_active') === true,
        regenerateOnCheckin: regenDefault
          ? true
          : pgVal(session, 'regenerateOnCheckin') === 1 ||
            pgVal(session, 'regenerate_on_checkin') === 1 ||
            pgVal(session, 'regenerate_on_checkin') === true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get checked-in members for an event
 * GET /api/checkin/:eventId/members
 */
export const getCheckedInMembers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const eventId = parseInt(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return next(createApiError('รหัสกิจกรรมไม่ถูกต้อง', 400, 'CHECKIN_INVALID_EVENT_ID'));
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        ci.user_id as userId,
        u.first_name as firstName,
        u.last_name as lastName,
        ci.check_in_time as checkInTime,
        ci.check_in_method as method
       FROM check_ins ci
       INNER JOIN users u ON ci.user_id = u.id
       WHERE ci.event_id = ?
       ORDER BY ci.check_in_time DESC`,
      [eventId]
    );

    res.json({
      success: true,
      data: {
        members: rows.map((row) => {
          const r = row as Record<string, unknown>;
          return {
            userId: Number(pgVal(r, 'userId') ?? pgVal(r, 'user_id')),
            firstName: (pgVal(r, 'firstName') ?? pgVal(r, 'first_name')) as string,
            lastName: (pgVal(r, 'lastName') ?? pgVal(r, 'last_name')) as string,
            checkInTime: pgVal(r, 'checkInTime') ?? pgVal(r, 'check_in_time'),
            method: pgVal(r, 'method') as string,
          };
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * End check-in session
 * DELETE /api/checkin/session/:eventId
 */
export const endCheckInSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const eventId = parseInt(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return next(createApiError('รหัสกิจกรรมไม่ถูกต้อง', 400, 'CHECKIN_INVALID_EVENT_ID'));
    }

    // Deactivate all sessions for this event
    await pool.execute(
      'UPDATE check_in_sessions SET is_active = false WHERE event_id = ?',
      [eventId]
    );

    // Emit WebSocket event
    if (io) {
      io.to(`event-${eventId}`).emit('check-in-session-ended', {
        eventId,
      });
    }

    res.json({
      success: true,
      message: 'ปิดเซสชันเช็กอินแล้ว',
    });
  } catch (error) {
    next(error);
  }
};

