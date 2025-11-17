import { Request, Response, NextFunction } from 'express';
import pool from '../../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { ApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import type { Event, CreateEventRequest, UpdateEventRequest, EventStats } from '../types/event';

// Get socket.io instance (will be set by socketServer)
let io: any = null;
export const setEventSocketIO = (socketIO: any) => {
  io = socketIO;
};

/**
 * Get events filtered by user's club memberships
 * GET /api/events
 */
export const getEvents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      return next(error);
    }

    const userId = req.user.userId;
    const upcoming = req.query.upcoming === 'true';

    // Get user's club memberships (approved only)
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT club_id 
       FROM club_memberships 
       WHERE user_id = ? AND status = 'approved'`,
      [userId]
    );

    const clubIds = membershipRows.map((row: any) => row.club_id);

    // If user has no club memberships, return empty array
    if (clubIds.length === 0) {
      return res.json({
        success: true,
        events: [],
      });
    }

    // Build query to get events where creator is member of same clubs
    let query = `
      SELECT DISTINCT
        e.id,
        e.title,
        e.type,
        e.date,
        e.time,
        e.location,
        e.description,
        e.attendees,
        e.reminder_enabled as reminderEnabled,
        e.created_by as createdBy,
        e.created_at as createdAt,
        e.updated_at as updatedAt
      FROM events e
      INNER JOIN club_memberships cm ON e.created_by = cm.user_id
      WHERE cm.club_id IN (${clubIds.map(() => '?').join(',')})
        AND cm.status = 'approved'
    `;

    const params: any[] = [...clubIds];

    // Filter for upcoming events only if requested
    if (upcoming) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query += ' AND e.date >= ?';
      params.push(today.toISOString().split('T')[0]);
    }

    query += ' ORDER BY e.date ASC, e.time ASC';

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    const events: Event[] = rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      date: new Date(row.date),
      time: row.time,
      location: row.location,
      description: row.description,
      attendees: row.attendees || 0,
      reminderEnabled: Boolean(row.reminderEnabled),
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));

    res.json({
      success: true,
      events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get event by ID
 * GET /api/events/:id
 */
export const getEventById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      return next(error);
    }

    const eventId = parseInt(req.params.id);

    if (!eventId || isNaN(eventId)) {
      const error: ApiError = new Error('Invalid event ID');
      error.statusCode = 400;
      return next(error);
    }

    const userId = req.user.userId;

    // Get user's club memberships
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT club_id 
       FROM club_memberships 
       WHERE user_id = ? AND status = 'approved'`,
      [userId]
    );

    const clubIds = membershipRows.map((row: any) => row.club_id);

    if (clubIds.length === 0) {
      const error: ApiError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    // Get event where creator is member of same clubs
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT
        e.id,
        e.title,
        e.type,
        e.date,
        e.time,
        e.location,
        e.description,
        e.attendees,
        e.reminder_enabled as reminderEnabled,
        e.created_by as createdBy,
        e.created_at as createdAt,
        e.updated_at as updatedAt
      FROM events e
      INNER JOIN club_memberships cm ON e.created_by = cm.user_id
      WHERE e.id = ?
        AND cm.club_id IN (${clubIds.map(() => '?').join(',')})
        AND cm.status = 'approved'`,
      [eventId, ...clubIds]
    );

    if (rows.length === 0) {
      const error: ApiError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    const row = rows[0] as any;
    const event: Event = {
      id: row.id,
      title: row.title,
      type: row.type,
      date: new Date(row.date),
      time: row.time,
      location: row.location,
      description: row.description,
      attendees: row.attendees || 0,
      reminderEnabled: Boolean(row.reminderEnabled),
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new event
 * POST /api/events
 */
export const createEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      return next(error);
    }

    const userId = req.user.userId;
    const { title, type, date, time, location, description, reminderEnabled } = req.body as CreateEventRequest;

    // Validation
    if (!title || !type || !date || !time || !location) {
      const error: ApiError = new Error('Missing required fields: title, type, date, time, location');
      error.statusCode = 400;
      return next(error);
    }

    // Validate event type
    const validTypes = ['practice', 'meeting', 'performance', 'workshop', 'other'];
    if (!validTypes.includes(type)) {
      const error: ApiError = new Error('Invalid event type');
      error.statusCode = 400;
      return next(error);
    }

    // Validate date format
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      const error: ApiError = new Error('Invalid date format');
      error.statusCode = 400;
      return next(error);
    }

    // Validate time format (HH:mm or HH:mm - HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9](\s*-\s*([0-1][0-9]|2[0-3]):[0-5][0-9])?$/;
    if (!timeRegex.test(time)) {
      const error: ApiError = new Error('Invalid time format. Use HH:mm or HH:mm - HH:mm format');
      error.statusCode = 400;
      return next(error);
    }

    // Insert event
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO events 
       (title, type, date, time, location, description, attendees, reminder_enabled, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        title,
        type,
        eventDate.toISOString().split('T')[0],
        time,
        location,
        description || null,
        reminderEnabled ? 1 : 0,
        userId,
      ]
    );

    // Get created event
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM events WHERE id = ?',
      [result.insertId]
    );

    const row = rows[0] as any;
    const event: Event = {
      id: row.id,
      title: row.title,
      type: row.type,
      date: new Date(row.date),
      time: row.time,
      location: row.location,
      description: row.description,
      attendees: row.attendees || 0,
      reminderEnabled: Boolean(row.reminder_enabled),
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    // Emit WebSocket event
    if (io) {
      io.emit('event-created', { event });
    }

    res.status(201).json({
      success: true,
      event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update event
 * PUT /api/events/:id
 */
export const updateEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      return next(error);
    }

    const eventId = parseInt(req.params.id);
    const { title, type, date, time, location, description, reminderEnabled } = req.body as UpdateEventRequest;

    if (!eventId || isNaN(eventId)) {
      const error: ApiError = new Error('Invalid event ID');
      error.statusCode = 400;
      return next(error);
    }

    // Check if event exists
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM events WHERE id = ?',
      [eventId]
    );

    if (existingRows.length === 0) {
      const error: ApiError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (type !== undefined) {
      const validTypes = ['practice', 'meeting', 'performance', 'workshop', 'other'];
      if (!validTypes.includes(type)) {
        const error: ApiError = new Error('Invalid event type');
        error.statusCode = 400;
        return next(error);
      }
      updates.push('type = ?');
      values.push(type);
    }
    if (date !== undefined) {
      const eventDate = new Date(date);
      if (isNaN(eventDate.getTime())) {
        const error: ApiError = new Error('Invalid date format');
        error.statusCode = 400;
        return next(error);
      }
      updates.push('date = ?');
      values.push(eventDate.toISOString().split('T')[0]);
    }
    if (time !== undefined) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9](\s*-\s*([0-1][0-9]|2[0-3]):[0-5][0-9])?$/;
      if (!timeRegex.test(time)) {
        const error: ApiError = new Error('Invalid time format. Use HH:mm or HH:mm - HH:mm format');
        error.statusCode = 400;
        return next(error);
      }
      updates.push('time = ?');
      values.push(time);
    }
    if (location !== undefined) {
      updates.push('location = ?');
      values.push(location);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }
    if (reminderEnabled !== undefined) {
      updates.push('reminder_enabled = ?');
      values.push(reminderEnabled ? 1 : 0);
    }

    if (updates.length === 0) {
      const error: ApiError = new Error('No fields to update');
      error.statusCode = 400;
      return next(error);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(eventId);

    await pool.execute(
      `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated event
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM events WHERE id = ?',
      [eventId]
    );

    const row = rows[0] as any;
    const event: Event = {
      id: row.id,
      title: row.title,
      type: row.type,
      date: new Date(row.date),
      time: row.time,
      location: row.location,
      description: row.description,
      attendees: row.attendees || 0,
      reminderEnabled: Boolean(row.reminder_enabled),
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    // Emit WebSocket event
    if (io) {
      io.emit('event-updated', { event });
    }

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete event
 * DELETE /api/events/:id
 */
export const deleteEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      return next(error);
    }

    const eventId = parseInt(req.params.id);

    if (!eventId || isNaN(eventId)) {
      const error: ApiError = new Error('Invalid event ID');
      error.statusCode = 400;
      return next(error);
    }

    // Check if event exists
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM events WHERE id = ?',
      [eventId]
    );

    if (rows.length === 0) {
      const error: ApiError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    // Delete event (cascade will handle check_ins and check_in_sessions)
    await pool.execute('DELETE FROM events WHERE id = ?', [eventId]);

    // Emit WebSocket event
    if (io) {
      io.emit('event-deleted', { eventId });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get event statistics for user's clubs
 * GET /api/events/stats
 */
export const getEventStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      return next(error);
    }

    const userId = req.user.userId;

    // Get user's club memberships
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT club_id 
       FROM club_memberships 
       WHERE user_id = ? AND status = 'approved'`,
      [userId]
    );

    const clubIds = membershipRows.map((row: any) => row.club_id);

    if (clubIds.length === 0) {
      return res.json({
        success: true,
        stats: {
          eventsThisMonth: 0,
          daysUntilNextEvent: null,
          averageAttendance: 0,
        },
      });
    }

    // Get current month start and end
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Count events this month
    const [monthEventsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT e.id) as count
       FROM events e
       INNER JOIN club_memberships cm ON e.created_by = cm.user_id
       WHERE cm.club_id IN (${clubIds.map(() => '?').join(',')})
         AND cm.status = 'approved'
         AND e.date >= ?
         AND e.date <= ?`,
      [
        ...clubIds,
        firstDayOfMonth.toISOString().split('T')[0],
        lastDayOfMonth.toISOString().split('T')[0],
      ]
    );

    const eventsThisMonth = parseInt(monthEventsRows[0]?.count || '0');

    // Get next upcoming event (excluding today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate tomorrow's date to exclude today's events
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const [nextEventRows] = await pool.execute<RowDataPacket[]>(
      `SELECT MIN(DATE(e.date)) as nextDate
       FROM events e
       INNER JOIN club_memberships cm ON e.created_by = cm.user_id
       WHERE cm.club_id IN (${clubIds.map(() => '?').join(',')})
         AND cm.status = 'approved'
         AND DATE(e.date) > DATE(?)`,
      [...clubIds, todayStr]
    );

    let daysUntilNextEvent: number | null = null;
    if (nextEventRows && nextEventRows.length > 0 && nextEventRows[0]?.nextDate != null) {
      // Handle date from database (could be Date object or string)
      let nextDate: Date;
      const nextDateValue = nextEventRows[0].nextDate;
      
      if (nextDateValue instanceof Date) {
        nextDate = new Date(nextDateValue);
      } else if (typeof nextDateValue === 'string' && nextDateValue.trim() !== '') {
        // Parse date string (format: YYYY-MM-DD)
        nextDate = new Date(nextDateValue + 'T00:00:00');
      } else {
        // Fallback: try to parse as-is
        nextDate = new Date(nextDateValue);
      }
      
      // Check if date is valid
      if (!isNaN(nextDate.getTime())) {
        nextDate.setHours(0, 0, 0, 0);
        
        // Calculate difference in days from today
        const diffTime = nextDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Only set if the date is in the future (should always be since we exclude today)
        if (daysDiff > 0) {
          daysUntilNextEvent = daysDiff;
        } else if (daysDiff === 0) {
          // If somehow we get today, set to 1 (shouldn't happen with > today)
          daysUntilNextEvent = 1;
        }
      }
    }

    // Calculate average attendance from check_ins
    // Average number of attendees per event
    let averageAttendance = 0;
    try {
      const [attendanceRows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
          COALESCE(ROUND(AVG(attendance_count), 0), 0) as avgAttendance
        FROM (
          SELECT ci.event_id, COUNT(DISTINCT ci.user_id) as attendance_count
          FROM check_ins ci
          INNER JOIN events e ON ci.event_id = e.id
          INNER JOIN club_memberships cm ON e.created_by = cm.user_id
          WHERE cm.club_id IN (${clubIds.map(() => '?').join(',')})
            AND cm.status = 'approved'
          GROUP BY ci.event_id
        ) as event_attendance`
      );

      // If no rows returned (no check_ins), default to 0
      if (attendanceRows && attendanceRows.length > 0 && attendanceRows[0]?.avgAttendance !== null) {
        averageAttendance = parseInt(attendanceRows[0].avgAttendance.toString());
      } else {
        averageAttendance = 0;
      }
    } catch (error) {
      // If query fails (e.g., no check_ins), default to 0
      console.error('Error calculating average attendance:', error);
      averageAttendance = 0;
    }

    const stats: EventStats = {
      eventsThisMonth,
      daysUntilNextEvent,
      averageAttendance,
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error in getEventStats:', error);
    next(error);
  }
};

