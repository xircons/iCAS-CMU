import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import { ApiError } from '../../../middleware/errorHandler';
import pool from '../../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
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
      const error: ApiError = new Error('Invalid event ID');
      error.statusCode = 400;
      return next(error);
    }

    // Check if event exists
    const [eventRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM events WHERE id = ?',
      [eventId]
    );

    if (eventRows.length === 0) {
      const error: ApiError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    // Check if there's already an active session for this event
    const [existingSessionRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM check_in_sessions 
       WHERE event_id = ? AND is_active = 1 AND expires_at > NOW()`,
      [eventId]
    );

    if (existingSessionRows.length > 0) {
      const error: ApiError = new Error('An active check-in session already exists for this event. Please end the current session before creating a new one.');
      error.statusCode = 409;
      return next(error);
    }

    // Deactivate any expired sessions for this event (cleanup)
    await pool.execute(
      'UPDATE check_in_sessions SET is_active = 0 WHERE event_id = ? AND (expires_at <= NOW() OR is_active = 0)',
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
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO check_in_sessions 
       (event_id, passcode, qr_code_data, expires_at, created_by, is_active, regenerate_on_checkin) 
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [eventId, passcode, qrCodeData, expiresAt, userId, regenerateOnCheckin ? 1 : 0]
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
      const error: ApiError = new Error('QR code data is required');
      error.statusCode = 400;
      return next(error);
    }

    // Parse and validate QR code data
    let qrData;
    try {
      qrData = JSON.parse(qrCodeData);
    } catch {
      const error: ApiError = new Error('Invalid QR code format');
      error.statusCode = 400;
      return next(error);
    }

    // Find active session by QR code data
    // If eventId is provided, use it for faster lookup, otherwise find by sessionId
    let sessionRows: RowDataPacket[];
    if (eventId && qrData.eventId) {
      // Use eventId if provided
      [sessionRows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM check_in_sessions 
         WHERE event_id = ? AND is_active = 1 AND expires_at > NOW()`,
        [eventId]
      );
    } else {
      // Find by matching QR code data (sessionId)
      [sessionRows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM check_in_sessions 
         WHERE is_active = 1 AND expires_at > NOW()`,
        []
      );
    }

    if (sessionRows.length === 0) {
      const error: ApiError = new Error('No active check-in session found');
      error.statusCode = 404;
      return next(error);
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
      const error: ApiError = new Error('Invalid QR code');
      error.statusCode = 400;
      return next(error);
    }

    const actualEventId = session.event_id;

    // Get event info to check club membership
    const [eventRows] = await pool.execute<RowDataPacket[]>(
      'SELECT club_id FROM events WHERE id = ?',
      [actualEventId]
    );

    if (eventRows.length === 0) {
      const error: ApiError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    const clubId = eventRows[0].club_id;

    // Check if user is a member of the club that organized this event
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM club_memberships 
       WHERE user_id = ? AND club_id = ? AND status = 'approved'`,
      [userId, clubId]
    );

    if (membershipRows.length === 0) {
      const error: ApiError = new Error('You must be a member of this club to check in');
      error.statusCode = 403;
      return next(error);
    }

    // Check if already checked in
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM check_ins WHERE event_id = ? AND user_id = ?',
      [actualEventId, userId]
    );

    if (existingRows.length > 0) {
      const error: ApiError = new Error('You have already checked in for this event');
      error.statusCode = 409;
      return next(error);
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
        const error: ApiError = new Error('Failed to record check-in');
        error.statusCode = 500;
        return next(error);
      }
      console.log(`[Check-in QR] Successfully inserted check-in record. Insert ID: ${insertResult.insertId}, Affected rows: ${insertResult.affectedRows}`);
    } catch (insertError: any) {
      console.error('[Check-in QR] Error inserting check-in record:', insertError);
      // If it's a duplicate key error, handle it gracefully
      if (insertError.code === 'ER_DUP_ENTRY' || insertError.errno === 1062) {
        const error: ApiError = new Error('You have already checked in for this event');
        error.statusCode = 409;
        return next(error);
      }
      // Otherwise, rethrow as generic error
      const error: ApiError = new Error('Failed to record check-in');
      error.statusCode = 500;
      return next(error);
    }

    // Check if we should regenerate QR code and passcode after check-in
    const shouldRegenerate = session.regenerate_on_checkin === 1 || session.regenerate_on_checkin === true;

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
         WHERE event_id = ? AND is_active = 1`,
        [newPasscode, newQrCodeData, actualEventId]
      );
    }

    // Get user info for WebSocket event
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT first_name, last_name FROM users WHERE id = ?',
      [userId]
    );

    const user = userRows[0];

    // Emit WebSocket events
    if (io) {
      // Emit check-in success
      io.to(`event-${actualEventId}`).emit('check-in-success', {
        eventId: actualEventId,
        userId,
        firstName: user.first_name,
        lastName: user.last_name,
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
      message: 'Successfully checked in via QR code',
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
      const error: ApiError = new Error('Passcode is required');
      error.statusCode = 400;
      return next(error);
    }

    // Convert passcode to string to ensure consistent format
    const passcodeStr = String(passcode).trim();

    if (!isValidPasscodeFormat(passcodeStr)) {
      console.log(`[Check-in Passcode] Invalid passcode format: "${passcodeStr}"`);
      const error: ApiError = new Error('Invalid passcode format. Passcode must be 6 digits.');
      error.statusCode = 400;
      return next(error);
    }

    // Find active session with matching passcode
    // If eventId is provided, use it for faster lookup, otherwise find by passcode only
    let sessionRows: RowDataPacket[];
    if (eventId) {
      console.log(`[Check-in Passcode] Searching for session with eventId: ${eventId}, passcode: ${passcodeStr}`);
      [sessionRows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM check_in_sessions 
         WHERE event_id = ? AND passcode = ? AND is_active = 1 AND expires_at > NOW()`,
        [eventId, passcodeStr]
      );
    } else {
      console.log(`[Check-in Passcode] Searching for session with passcode only: ${passcodeStr}`);
      [sessionRows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM check_in_sessions 
         WHERE passcode = ? AND is_active = 1 AND expires_at > NOW()`,
        [passcodeStr]
      );
    }

    console.log(`[Check-in Passcode] Found ${sessionRows.length} active session(s) matching passcode`);

    if (sessionRows.length === 0) {
      // Also check if there are any sessions with this passcode but expired or inactive
      let debugRows: RowDataPacket[] = [];
      try {
        if (eventId) {
          [debugRows] = await pool.execute<RowDataPacket[]>(
            `SELECT id, event_id, passcode, is_active, expires_at, NOW() as current_time
             FROM check_in_sessions 
             WHERE event_id = ? AND passcode = ?`,
            [eventId, passcodeStr]
          );
        } else {
          [debugRows] = await pool.execute<RowDataPacket[]>(
            `SELECT id, event_id, passcode, is_active, expires_at, NOW() as current_time
             FROM check_in_sessions 
             WHERE passcode = ?`,
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

      const error: ApiError = new Error('Invalid or expired passcode');
      error.statusCode = 400;
      return next(error);
    }

    // Get the event ID from the session
    const session = sessionRows[0] as CheckInSession;
    const actualEventId = session.event_id;

    // Get event info to check club membership
    const [eventRows] = await pool.execute<RowDataPacket[]>(
      'SELECT club_id FROM events WHERE id = ?',
      [actualEventId]
    );

    if (eventRows.length === 0) {
      const error: ApiError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

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
      const error: ApiError = new Error('You must be a member of this club to check in');
      error.statusCode = 403;
      return next(error);
    }

    console.log(`[Check-in Passcode] User ${userId} is a member/leader of club ${clubId}`);

    // Check if already checked in
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM check_ins WHERE event_id = ? AND user_id = ?',
      [actualEventId, userId]
    );

    if (existingRows.length > 0) {
      console.log(`[Check-in Passcode] User ${userId} has already checked in for event ${actualEventId}`);
      const error: ApiError = new Error('You have already checked in for this event');
      error.statusCode = 409;
      return next(error);
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
        const error: ApiError = new Error('Failed to record check-in');
        error.statusCode = 500;
        return next(error);
      }
      console.log(`[Check-in Passcode] Successfully inserted check-in record. Insert ID: ${insertResult.insertId}, Affected rows: ${insertResult.affectedRows}`);
    } catch (insertError: any) {
      console.error('[Check-in Passcode] Error inserting check-in record:', insertError);
      // If it's a duplicate key error, handle it gracefully
      if (insertError.code === 'ER_DUP_ENTRY' || insertError.errno === 1062) {
        const error: ApiError = new Error('You have already checked in for this event');
        error.statusCode = 409;
        return next(error);
      }
      // Otherwise, rethrow as generic error
      const error: ApiError = new Error('Failed to record check-in');
      error.statusCode = 500;
      return next(error);
    }

    // Check if we should regenerate QR code and passcode after check-in
    const shouldRegenerate = session.regenerate_on_checkin === 1 || session.regenerate_on_checkin === true;

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
         WHERE event_id = ? AND is_active = 1`,
        [newPasscode, newQrCodeData, actualEventId]
      );
    }

    // Get user info for WebSocket event
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT first_name, last_name FROM users WHERE id = ?',
      [userId]
    );

    const user = userRows[0];

    // Emit WebSocket events
    if (io) {
      // Emit check-in success
      io.to(`event-${actualEventId}`).emit('check-in-success', {
        eventId: actualEventId,
        userId,
        firstName: user.first_name,
        lastName: user.last_name,
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
      message: 'Successfully checked in via passcode',
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
      const error: ApiError = new Error('Invalid event ID');
      error.statusCode = 400;
      return next(error);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        passcode,
        qr_code_data as qrCodeData,
        expires_at as expiresAt,
        is_active as isActive,
        regenerate_on_checkin as regenerateOnCheckin
       FROM check_in_sessions 
       WHERE event_id = ? AND is_active = 1 AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [eventId]
    );

    if (rows.length === 0) {
      res.json({
        success: true,
        data: null,
      });
      return;
    }

    const session = rows[0];
    res.json({
      success: true,
      data: {
        passcode: session.passcode,
        qrCodeData: session.qrCodeData,
        expiresAt: session.expiresAt,
        isActive: session.isActive === 1,
        regenerateOnCheckin: session.regenerateOnCheckin === 1 || session.regenerateOnCheckin === true,
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
      const error: ApiError = new Error('Invalid event ID');
      error.statusCode = 400;
      return next(error);
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
        members: rows.map((row) => ({
          userId: row.userId,
          firstName: row.firstName,
          lastName: row.lastName,
          checkInTime: row.checkInTime,
          method: row.method,
        })),
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
      const error: ApiError = new Error('Invalid event ID');
      error.statusCode = 400;
      return next(error);
    }

    // Deactivate all sessions for this event
    await pool.execute(
      'UPDATE check_in_sessions SET is_active = 0 WHERE event_id = ?',
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
      message: 'Check-in session ended successfully',
    });
  } catch (error) {
    next(error);
  }
};

