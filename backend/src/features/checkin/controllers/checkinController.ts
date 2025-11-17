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

    // Deactivate any existing sessions for this event
    await pool.execute(
      'UPDATE check_in_sessions SET is_active = 0 WHERE event_id = ?',
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

    // Create new session
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO check_in_sessions 
       (event_id, passcode, qr_code_data, expires_at, created_by, is_active) 
       VALUES (?, ?, ?, ?, ?, 1)`,
      [eventId, passcode, qrCodeData, expiresAt, userId]
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

    // Find the session that matches the QR code
    let session: CheckInSession | null = null;
    for (const row of sessionRows) {
      const storedQrData = JSON.parse(row.qr_code_data);
      if (storedQrData.sessionId === qrData.sessionId) {
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
    await pool.execute(
      'INSERT INTO check_ins (event_id, user_id, check_in_method) VALUES (?, ?, ?)',
      [actualEventId, userId, 'qr']
    );

    // Get user info for WebSocket event
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT first_name, last_name FROM users WHERE id = ?',
      [userId]
    );

    const user = userRows[0];

    // Emit WebSocket event
    if (io) {
      io.to(`event-${actualEventId}`).emit('check-in-success', {
        eventId: actualEventId,
        userId,
        firstName: user.first_name,
        lastName: user.last_name,
        method: 'qr',
        checkInTime: new Date().toISOString(),
      });
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

    if (!passcode) {
      const error: ApiError = new Error('Passcode is required');
      error.statusCode = 400;
      return next(error);
    }

    if (!isValidPasscodeFormat(passcode)) {
      const error: ApiError = new Error('Invalid passcode format');
      error.statusCode = 400;
      return next(error);
    }

    // Find active session with matching passcode
    // If eventId is provided, use it for faster lookup, otherwise find by passcode only
    let sessionRows: RowDataPacket[];
    if (eventId) {
      [sessionRows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM check_in_sessions 
         WHERE event_id = ? AND passcode = ? AND is_active = 1 AND expires_at > NOW()`,
        [eventId, passcode]
      );
    } else {
      // Find session by passcode only (more user-friendly)
      [sessionRows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM check_in_sessions 
         WHERE passcode = ? AND is_active = 1 AND expires_at > NOW()`,
        [passcode]
      );
    }

    if (sessionRows.length === 0) {
      const error: ApiError = new Error('Invalid or expired passcode');
      error.statusCode = 400;
      return next(error);
    }

    // Get the event ID from the session
    const session = sessionRows[0] as CheckInSession;
    const actualEventId = session.event_id;

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
    await pool.execute(
      'INSERT INTO check_ins (event_id, user_id, check_in_method) VALUES (?, ?, ?)',
      [actualEventId, userId, 'passcode']
    );

    // Get user info for WebSocket event
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT first_name, last_name FROM users WHERE id = ?',
      [userId]
    );

    const user = userRows[0];

    // Emit WebSocket event
    if (io) {
      io.to(`event-${actualEventId}`).emit('check-in-success', {
        eventId: actualEventId,
        userId,
        firstName: user.first_name,
        lastName: user.last_name,
        method: 'passcode',
        checkInTime: new Date().toISOString(),
      });
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
        is_active as isActive
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

