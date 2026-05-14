import { Request, Response, NextFunction } from 'express';
import pool from '../../../config/database';
import type { RowDataPacket, ResultSetHeader } from '../../../types/db';
import { ApiError, createApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import { pgVal, pgDateIso } from '../../../utils/pgRowHelpers';
import type { Event, EventType, CreateEventRequest, UpdateEventRequest, EventStats } from '../types/event';

// Get socket.io instance (will be set by socketServer)
let io: any = null;
export const setEventSocketIO = (socketIO: any) => {
  io = socketIO;
};

type EventsColumnHints = {
  hasClubIdColumn: boolean;
  reminderStoredAsBoolean: boolean;
};

let eventsColumnHintsCache: EventsColumnHints | null = null;

/** True when `events.id` is identity or sequence-backed (nextval). */
let eventsIdHasAutoCache: boolean | null = null;

async function eventsIdHasDbAuto(): Promise<boolean> {
  if (eventsIdHasAutoCache !== null) return eventsIdHasAutoCache;

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT (
       EXISTS (
         SELECT 1 FROM pg_attribute a
         WHERE a.attrelid = to_regclass('events')
           AND a.attname = 'id'
           AND a.attnum > 0
           AND COALESCE(a.attidentity, '') <> ''
       )
       OR EXISTS (
         SELECT 1
         FROM pg_attrdef d
         INNER JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
         WHERE a.attrelid = to_regclass('events')
           AND a.attname = 'id'
           AND lower(COALESCE(pg_get_expr(d.adbin, d.adrelid), '')) LIKE 'nextval(%'
       )
     ) AS ok`,
    []
  );
  eventsIdHasAutoCache = Boolean((rows?.[0] as Record<string, unknown>)?.ok);
  return eventsIdHasAutoCache;
}

async function nextManualEventsId(): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COALESCE(MAX(id), 0) + 1 AS nid FROM events`,
    []
  );
  const raw = (rows?.[0] as Record<string, unknown>)?.nid;
  const n =
    typeof raw === 'bigint'
      ? Number(raw)
      : typeof raw === 'number'
        ? raw
        : Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) {
    const err = createApiError('ไม่สามารถจัดสรรรหัสกิจกรรมได้', 500, 'EVENT_ID_ALLOC_FAILED');
    throw err;
  }
  return Math.trunc(n);
}

/** Uses pg_catalog keyed by search_path (`to_regclass`) so INSERT and introspection hit the same `events`. */
async function getEventsColumnHints(): Promise<EventsColumnHints> {
  if (eventsColumnHintsCache) return eventsColumnHintsCache;

  const [resolved] = await pool.execute<RowDataPacket[]>(
    `SELECT CAST(to_regclass('events') AS oid) AS eid`,
    []
  );

  const eid = (resolved?.[0] as Record<string, unknown> | undefined)?.eid;
  const oidNum =
    typeof eid === 'bigint'
      ? Number(eid)
      : typeof eid === 'number'
        ? eid
        : eid != null && eid !== ''
          ? Number.parseInt(String(eid), 10)
          : NaN;
  if (!Number.isFinite(oidNum) || oidNum <= 0) {
    const err = createApiError(
      'ไม่พบตาราง events ใน search_path ของฐานข้อมูล กำหนด PG_SEARCH_PATH ให้ชี้ไปยังสคีมาที่มีตาราง events',
      500,
      'EVENT_TABLE_UNRESOLVED',
    );
    throw err;
  }

  const [attrRows] = await pool.execute<RowDataPacket[]>(
    `SELECT a.attname::text AS attname,
            format_type(a.atttypid, a.atttypmod)::text AS pg_type
     FROM pg_attribute a
     WHERE a.attrelid = to_regclass('events')
       AND a.attnum > 0
       AND NOT a.attisdropped
       AND (a.attname::text IN ('club_id','reminder_enabled'))`,
    []
  );

  let hasClubIdColumn = false;
  let reminderStoredAsBoolean = false;
  for (const raw of attrRows || []) {
    const r = raw as Record<string, unknown>;
    const name = String(r.attname ?? '').toLowerCase();
    const pgType = String(r.pg_type ?? '').toLowerCase();
    if (name === 'club_id') hasClubIdColumn = true;
    if (name === 'reminder_enabled')
      reminderStoredAsBoolean =
        pgType === 'boolean' || pgType === 'bool';
  }

  eventsColumnHintsCache = { hasClubIdColumn, reminderStoredAsBoolean };
  return eventsColumnHintsCache;
}

function reminderParam(enabled: boolean, reminderStoredAsBoolean: boolean): boolean | number {
  return reminderStoredAsBoolean ? enabled : enabled ? 1 : 0;
}

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
      return next(createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED'));
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

    const events: Event[] = rows.map((row: any) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as number,
        title: pgVal(r, 'title') as string,
        type: pgVal(r, 'type') as EventType,
        date: new Date(pgDateIso(r, 'date') ?? new Date(0).toISOString()),
        time: pgVal(r, 'time') as string,
        location: pgVal(r, 'location') as string,
        description: (pgVal(r, 'description') as string | null) ?? null,
        attendees: Number(pgVal(r, 'attendees') ?? 0),
        createdBy: Number(pgVal(r, 'createdBy') ?? pgVal(r, 'created_by')),
        createdAt: new Date(pgDateIso(r, 'createdAt') ?? pgDateIso(r, 'created_at') ?? new Date(0).toISOString()),
        updatedAt: new Date(pgDateIso(r, 'updatedAt') ?? pgDateIso(r, 'updated_at') ?? new Date(0).toISOString()),
      };
    });

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
      return next(createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED'));
    }

    const eventId = parseInt(req.params.id);

    if (!eventId || isNaN(eventId)) {
      return next(createApiError('รหัสกิจกรรมไม่ถูกต้อง', 400, 'EVENT_INVALID_ID'));
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
      return next(createApiError('ไม่พบกิจกรรม', 404, 'EVENT_NOT_FOUND'));
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
      return next(createApiError('ไม่พบกิจกรรม', 404, 'EVENT_NOT_FOUND'));
    }

    const row = rows[0] as Record<string, unknown>;
    const event: Event = {
      id: row.id as number,
      title: pgVal(row, 'title') as string,
      type: pgVal(row, 'type') as EventType,
      date: new Date(pgDateIso(row, 'date') ?? new Date(0).toISOString()),
      time: pgVal(row, 'time') as string,
      location: pgVal(row, 'location') as string,
      description: (pgVal(row, 'description') as string | null) ?? null,
      attendees: Number(pgVal(row, 'attendees') ?? 0),
      createdBy: Number(pgVal(row, 'createdBy') ?? pgVal(row, 'created_by')),
      createdAt: new Date(pgDateIso(row, 'createdAt') ?? pgDateIso(row, 'created_at') ?? new Date(0).toISOString()),
      updatedAt: new Date(pgDateIso(row, 'updatedAt') ?? pgDateIso(row, 'updated_at') ?? new Date(0).toISOString()),
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
      return next(createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED'));
    }

    const userId = req.user.userId;
    const { title, type, date, time, location, description, clubId } = req.body as CreateEventRequest;

    // Validation
    if (!title || !type || !date || !time || !location) {
      return next(createApiError('กรุณากรอกหัวข้อ ประเภท วันที่ เวลา และสถานที่', 400, 'EVENT_FIELDS_REQUIRED'));
    }

    // Determine club_id: use provided clubId or get user's primary club
    let eventClubId = clubId;
    if (!eventClubId) {
      // Get user's primary club (leader role or first approved membership)
      const [membershipRows] = await pool.execute<RowDataPacket[]>(
        `SELECT club_id, role 
         FROM club_memberships 
         WHERE user_id = ? AND status = 'approved'
         ORDER BY CASE WHEN role = 'leader' THEN 1 ELSE 2 END
         LIMIT 1`,
        [userId]
      );

      if (membershipRows.length === 0) {
        return next(createApiError('คุณต้องเป็นสมาชิกชมรมจึงจะสร้างกิจกรรมได้', 400, 'EVENT_CLUB_MEMBER_REQUIRED'));
      }

      eventClubId = membershipRows[0].club_id;
    }

    // Verify user is a member of the specified club
    if (eventClubId) {
      const [membershipCheck] = await pool.execute<RowDataPacket[]>(
        `SELECT id FROM club_memberships 
         WHERE user_id = ? AND club_id = ? AND status = 'approved'`,
        [userId, eventClubId]
      );

      if (membershipCheck.length === 0) {
        return next(createApiError('คุณต้องเป็นสมาชิกชมรมที่ระบุจึงจะสร้างกิจกรรมได้', 403, 'EVENT_CLUB_SPECIFIC_REQUIRED'));
      }
    }

    // Validate event type
    const validTypes = ['practice', 'meeting', 'performance', 'workshop', 'other'];
    if (!validTypes.includes(type)) {
      return next(createApiError('ประเภทกิจกรรมไม่ถูกต้อง', 400, 'EVENT_TYPE_INVALID'));
    }

    // Validate date format
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return next(createApiError('รูปแบบวันที่ไม่ถูกต้อง', 400, 'EVENT_DATE_INVALID'));
    }

    // Validate time format (HH:mm or HH:mm - HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9](\s*-\s*([0-1][0-9]|2[0-3]):[0-5][0-9])?$/;
    if (!timeRegex.test(time)) {
      return next(createApiError('รูปแบบเวลาไม่ถูกต้อง ใช้ HH:mm หรือ HH:mm - HH:mm', 400, 'EVENT_TIME_INVALID'));
    }

    const columnHints = await getEventsColumnHints();
    const hasEventsClubIdColumn = columnHints.hasClubIdColumn;
    const reminderValue = reminderParam(false, columnHints.reminderStoredAsBoolean);

    const rawClub = eventClubId as unknown;
    const clubIdForInsert =
      rawClub == null || rawClub === ''
        ? NaN
        : Math.trunc(Number(rawClub));
    if (
      hasEventsClubIdColumn &&
      (!Number.isFinite(clubIdForInsert) || clubIdForInsert < 1)
    ) {
      return next(createApiError('ชมรมสำหรับกิจกรรมนี้ไม่ถูกต้อง', 400, 'EVENT_CLUB_INVALID'));
    }

    const dateStr = eventDate.toISOString().split('T')[0];

    const idAuto = await eventsIdHasDbAuto();
    const explicitId = idAuto ? undefined : await nextManualEventsId();

    let result: ResultSetHeader;
    if (hasEventsClubIdColumn) {
      if (explicitId !== undefined) {
        const [hdr] = await pool.execute<ResultSetHeader>(
          `INSERT INTO events 
           (id, club_id, title, type, date, time, location, description, attendees, reminder_enabled, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
           RETURNING id`,
          [
            explicitId,
            clubIdForInsert,
            title,
            type,
            dateStr,
            time,
            location,
            description || null,
            reminderValue,
            userId,
          ]
        );
        result = hdr;
      } else {
        const [hdr] = await pool.execute<ResultSetHeader>(
          `INSERT INTO events 
           (club_id, title, type, date, time, location, description, attendees, reminder_enabled, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
           RETURNING id`,
          [
            clubIdForInsert,
            title,
            type,
            dateStr,
            time,
            location,
            description || null,
            reminderValue,
            userId,
          ]
        );
        result = hdr;
      }
    } else if (explicitId !== undefined) {
      const [hdr] = await pool.execute<ResultSetHeader>(
        `INSERT INTO events 
         (id, title, type, date, time, location, description, attendees, reminder_enabled, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
         RETURNING id`,
        [
          explicitId,
          title,
          type,
          dateStr,
          time,
          location,
          description || null,
          reminderValue,
          userId,
        ]
      );
      result = hdr;
    } else {
      const [hdr] = await pool.execute<ResultSetHeader>(
        `INSERT INTO events 
         (title, type, date, time, location, description, attendees, reminder_enabled, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
         RETURNING id`,
        [title, type, dateStr, time, location, description || null, reminderValue, userId]
      );
      result = hdr;
    }

    if (!result.insertId) {
      return next(createApiError('สร้างกิจกรรมไม่สำเร็จ', 500, 'EVENT_CREATE_FAILED'));
    }

    // Get created event
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM events WHERE id = ?',
      [result.insertId]
    );

    if (rows.length === 0) {
      return next(createApiError('สร้างกิจกรรมแล้วแต่โหลดข้อมูลไม่สำเร็จ', 500, 'EVENT_LOAD_AFTER_CREATE_FAILED'));
    }

    const row = rows[0] as Record<string, unknown>;
    const event: Event = {
      id: row.id as number,
      title: pgVal(row, 'title') as string,
      type: pgVal(row, 'type') as EventType,
      date: new Date(pgDateIso(row, 'date') ?? new Date(0).toISOString()),
      time: pgVal(row, 'time') as string,
      location: pgVal(row, 'location') as string,
      description: (pgVal(row, 'description') as string | null) ?? null,
      attendees: Number(pgVal(row, 'attendees') ?? 0),
      createdBy: Number(pgVal(row, 'created_by')),
      createdAt: new Date(pgDateIso(row, 'created_at') ?? new Date(0).toISOString()),
      updatedAt: new Date(pgDateIso(row, 'updated_at') ?? new Date(0).toISOString()),
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
      return next(createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED'));
    }

    const eventId = parseInt(req.params.id);
    const { title, type, date, time, location, description } = req.body as UpdateEventRequest;

    if (!eventId || isNaN(eventId)) {
      return next(createApiError('รหัสกิจกรรมไม่ถูกต้อง', 400, 'EVENT_INVALID_ID'));
    }

    // Check if event exists
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM events WHERE id = ?',
      [eventId]
    );

    if (existingRows.length === 0) {
      return next(createApiError('ไม่พบกิจกรรม', 404, 'EVENT_NOT_FOUND'));
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
        return next(createApiError('ประเภทกิจกรรมไม่ถูกต้อง', 400, 'EVENT_TYPE_INVALID'));
      }
      updates.push('type = ?');
      values.push(type);
    }
    if (date !== undefined) {
      const eventDate = new Date(date);
      if (isNaN(eventDate.getTime())) {
        return next(createApiError('รูปแบบวันที่ไม่ถูกต้อง', 400, 'EVENT_DATE_INVALID'));
      }
      updates.push('date = ?');
      values.push(eventDate.toISOString().split('T')[0]);
    }
    if (time !== undefined) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9](\s*-\s*([0-1][0-9]|2[0-3]):[0-5][0-9])?$/;
      if (!timeRegex.test(time)) {
        return next(createApiError('รูปแบบเวลาไม่ถูกต้อง ใช้ HH:mm หรือ HH:mm - HH:mm', 400, 'EVENT_TIME_INVALID'));
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

    if (updates.length === 0) {
      return next(createApiError('ไม่มีฟิลด์ที่จะอัปเดต', 400, 'EVENT_NO_FIELDS'));
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

    const row = rows[0] as Record<string, unknown>;
    const event: Event = {
      id: row.id as number,
      title: pgVal(row, 'title') as string,
      type: pgVal(row, 'type') as EventType,
      date: new Date(pgDateIso(row, 'date') ?? new Date(0).toISOString()),
      time: pgVal(row, 'time') as string,
      location: pgVal(row, 'location') as string,
      description: (pgVal(row, 'description') as string | null) ?? null,
      attendees: Number(pgVal(row, 'attendees') ?? 0),
      createdBy: Number(pgVal(row, 'created_by')),
      createdAt: new Date(pgDateIso(row, 'created_at') ?? new Date(0).toISOString()),
      updatedAt: new Date(pgDateIso(row, 'updated_at') ?? new Date(0).toISOString()),
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
      return next(createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED'));
    }

    const eventId = parseInt(req.params.id);

    if (!eventId || isNaN(eventId)) {
      return next(createApiError('รหัสกิจกรรมไม่ถูกต้อง', 400, 'EVENT_INVALID_ID'));
    }

    // Check if event exists
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM events WHERE id = ?',
      [eventId]
    );

    if (rows.length === 0) {
      return next(createApiError('ไม่พบกิจกรรม', 404, 'EVENT_NOT_FOUND'));
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
      return next(createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED'));
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

    const eventsThisMonth = parseInt(String(monthEventsRows[0]?.count ?? '0'), 10);

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
        ) as event_attendance`,
        clubIds
      );

      // If no rows returned (no check_ins), default to 0
      const attendanceRow = (attendanceRows?.[0] ?? {}) as Record<string, unknown>;
      const rawAvg = pgVal(attendanceRow, 'avgAttendance');
      if (rawAvg != null) {
        averageAttendance = parseInt(String(rawAvg), 10) || 0;
      } else {
        averageAttendance = 0;
      }
    } catch (error: any) {
      // check_ins table may not exist; ER_NO_SUCH_TABLE is normalised from PG 42P01 by dbErrorMapper
      if (error.code === 'ER_NO_SUCH_TABLE') {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️  check_ins table not found, using 0 for average attendance');
        }
        averageAttendance = 0;
      } else {
        // If query fails for other reasons, default to 0
        console.error('Error calculating average attendance:', error);
        averageAttendance = 0;
      }
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

