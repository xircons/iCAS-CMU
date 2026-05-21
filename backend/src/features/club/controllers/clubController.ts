import { Request, Response, NextFunction } from 'express';
import pool from '../../../config/database';
import type { RowDataPacket, ResultSetHeader } from '../../../types/db';
import { createApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import type { Club, ClubMembership, CreateClubRequest, JoinClubRequest } from '../types/club';
import { pgDateIso, pgDateIsoReq, pgVal } from '../../../utils/pgRowHelpers';
import { generateClubPublicId, isValidPublicIdSegment } from '../../../utils/publicId';
import { reconcileAggregateUserRole } from '../../../utils/userRoleHelpers';
import { isSuspendedDbRow } from '../../../utils/suspendedHelpers';

/** Postgres lowercases unquoted column aliases; support both camelCase and lowercase keys. */
function pgField(row: Record<string, unknown>, camelKey: string): unknown {
  return row[camelKey] ?? row[camelKey.toLowerCase()];
}

function numOptional(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(String(v));
  return Number.isFinite(n) ? n : undefined;
}

function memberCountFromRow(row: Record<string, unknown>): number {
  const mc = pgField(row, 'memberCount');
  if (mc == null || mc === '') return 0;
  const n = typeof mc === 'number' ? mc : Number(String(mc));
  return Number.isFinite(n) ? n : 0;
}

function createdAtFromRow(row: Record<string, unknown>): Date {
  const v = pgField(row, 'createdAt');
  if (v instanceof Date) return v;
  return new Date(String(v ?? 0));
}

/** Postgres after pgloader: club_memberships.id may have no DEFAULT (23502). */
async function nextClubMembershipPrimaryKey(): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT COALESCE(MAX(id), 0) + 1 AS nid FROM club_memberships',
  );
  const row0 = rows[0] as Record<string, unknown> | undefined;
  if (!row0) return 1;
  const nid = Number(pgVal(row0, 'nid'));
  return Number.isFinite(nid) && nid >= 1 ? nid : 1;
}

/** Postgres after pgloader: clubs.id may have no DEFAULT (23502). */
async function nextClubPrimaryKey(): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT COALESCE(MAX(id), 0) + 1 AS nid FROM clubs',
  );
  const row0 = rows[0] as Record<string, unknown> | undefined;
  if (!row0) return 1;
  const nid = Number(pgVal(row0, 'nid'));
  return Number.isFinite(nid) && nid >= 1 ? nid : 1;
}

async function insertPendingClubMembership(userId: number, clubId: number): Promise<number> {
  const insertSql = `
    INSERT INTO club_memberships (id, user_id, club_id, status, role)
    VALUES (?, ?, ?, 'pending', 'member')
  `;
  let newId = 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidateId = await nextClubMembershipPrimaryKey();
    try {
      const [r] = await pool.execute<ResultSetHeader>(insertSql, [candidateId, userId, clubId]);
      const viaReturning = Number(r.insertId);
      newId =
        Number.isFinite(viaReturning) && viaReturning >= 1 ? viaReturning : candidateId;
      break;
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null ? (err as { code?: string }).code : '';
      const isDup =
        code === '23505' ||
        code === 'ER_DUP_ENTRY' ||
        (typeof code === 'string' && Number((err as { errno?: unknown }).errno) === 1062);
      if (isDup && attempt < 5) continue;
      throw err;
    }
  }
  if (!Number.isFinite(newId) || newId < 1) {
    throw createApiError('ไม่สามารถสร้างการเป็นสมาชิกชมรมได้', 500, 'CLUB_MEMBERSHIP_CREATE_FAILED');
  }
  return newId;
}

// Get socket.io instance
let io: any = null;
export const setClubSocketIO = (socketIO: any) => {
  io = socketIO;
};

// Get all clubs
export const getAllClubs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const query = `
      SELECT 
        c.id,
        c.public_id as publicId,
        c.name,
        c.description,
        c.category,
        c.president_id as presidentId,
        u.first_name as presidentFirstName,
        u.last_name as presidentLastName,
        u.email as presidentEmail,
        c.meeting_day as meetingDay,
        c.location,
        c.logo,
        c.status,
        c.home_content as homeContent,
        c.home_title as homeTitle,
        c.created_at as createdAt,
        COALESCE(mc.cnt, 0)::int as memberCount,
        coleaders.coLeaderNames as coLeaderNames
      FROM clubs c
      LEFT JOIN users u ON c.president_id = u.id
      LEFT JOIN (
        SELECT club_id, COUNT(*)::int AS cnt
        FROM club_memberships
        WHERE status = 'approved'
        GROUP BY club_id
      ) mc ON mc.club_id = c.id
      LEFT JOIN LATERAL (
        SELECT STRING_AGG(
          COALESCE(
            NULLIF(TRIM(BOTH FROM COALESCE(u2.first_name::text, '') || ' ' || COALESCE(u2.last_name::text, '')), ''),
            u2.email::text
          ),
          ', ' ORDER BY LOWER(COALESCE(u2.last_name, '')), LOWER(COALESCE(u2.first_name, ''))
        ) AS coLeaderNames
        FROM club_memberships cm2
        INNER JOIN users u2 ON u2.id = cm2.user_id
        WHERE cm2.club_id = c.id
          AND cm2.status = 'approved'
          AND cm2.role = 'leader'
          AND (c.president_id IS NULL OR cm2.user_id IS DISTINCT FROM c.president_id)
      ) coleaders ON true
      ORDER BY c.name ASC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query);

    const clubs = rows.map((row: any) => {
      const r = row as Record<string, unknown>;
      const pFirst = pgField(r, 'presidentFirstName');
      const pLast = pgField(r, 'presidentLastName');
      return {
        id: row.id,
        publicId: String(pgField(r, 'publicId') ?? ''),
        name: row.name,
        description: row.description || undefined,
        category: row.category || undefined,
        presidentId: numOptional(pgField(r, 'presidentId')),
        presidentName:
          pFirst && pLast ? `${String(pFirst)} ${String(pLast)}` : undefined,
        presidentEmail: (pgField(r, 'presidentEmail') as string | undefined) || undefined,
        coLeaderNames: (() => {
          const v = pgField(r, 'coLeaderNames');
          if (v == null || v === '') return undefined;
          const s = String(v).trim();
          return s || undefined;
        })(),
        meetingDay: (pgField(r, 'meetingDay') as string | undefined) || undefined,
        location: row.location || undefined,
        logo: row.logo || undefined,
        status: row.status || 'active',
        memberCount: memberCountFromRow(r),
        homeContent: (pgField(r, 'homeContent') as string | undefined) || undefined,
        homeTitle: (pgField(r, 'homeTitle') as string | undefined) || 'Announcements',
        createdAt: createdAtFromRow(r),
      };
    });

    res.json({
      success: true,
      clubs,
    });
  } catch (error) {
    next(error);
  }
};

// Get club by ID
export const getClubById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!isValidPublicIdSegment(id)) {
      throw createApiError('ไม่พบชมรม', 404, 'CLUB_NOT_FOUND');
    }

    const query = `
      SELECT 
        c.id,
        c.public_id as publicId,
        c.name,
        c.description,
        c.category,
        c.president_id as presidentId,
        u.first_name as presidentFirstName,
        u.last_name as presidentLastName,
        u.email as presidentEmail,
        c.meeting_day as meetingDay,
        c.location,
        c.logo,
        c.status,
        c.home_content as homeContent,
        c.home_title as homeTitle,
        c.created_at as createdAt,
        COALESCE(mc.cnt, 0)::int as memberCount
      FROM clubs c
      LEFT JOIN users u ON c.president_id = u.id
      LEFT JOIN (
        SELECT club_id, COUNT(*)::int AS cnt
        FROM club_memberships
        WHERE status = 'approved'
        GROUP BY club_id
      ) mc ON mc.club_id = c.id
      WHERE c.public_id = ?
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [id]);

    if (rows.length === 0) {
      throw createApiError('ไม่พบชมรม', 404, 'CLUB_NOT_FOUND');
    }

    const row = rows[0] as any;
    const r = row as Record<string, unknown>;
    const pFirst = pgField(r, 'presidentFirstName');
    const pLast = pgField(r, 'presidentLastName');
    const club: Club = {
      id: row.id,
      publicId: String(pgField(r, 'publicId') ?? ''),
      name: row.name,
      description: row.description || undefined,
      category: row.category || undefined,
      presidentId: numOptional(pgField(r, 'presidentId')),
      presidentName:
        pFirst && pLast ? `${String(pFirst)} ${String(pLast)}` : undefined,
      presidentEmail: (pgField(r, 'presidentEmail') as string | undefined) || undefined,
      meetingDay: (pgField(r, 'meetingDay') as string | undefined) || undefined,
      location: row.location || undefined,
      logo: row.logo || undefined,
      status: row.status || 'active',
      memberCount: memberCountFromRow(r),
      homeContent: (pgField(r, 'homeContent') as string | undefined) || undefined,
      homeTitle: (pgField(r, 'homeTitle') as string | undefined) || 'Announcements',
      createdAt: createdAtFromRow(r),
    };

    res.json({
      success: true,
      club,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new club (admin only)
export const createClub = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw createApiError('เฉพาะผู้ดูแลระบบเท่านั้นที่สร้างชมรมได้', 403, 'CLUB_ADMIN_CREATE_ONLY');
    }

    const { name, description, category, meetingDay, location, status }: CreateClubRequest = req.body;
    const uploadedLogo = (req as AuthRequest & { file?: Express.Multer.File }).file;
    const logoPath = uploadedLogo ? `uploads/club-logos/${uploadedLogo.filename}` : null;

    if (!name) {
      throw createApiError('กรุณากรอกชื่อชมรม', 400, 'CLUB_NAME_REQUIRED');
    }

    const query = `
      INSERT INTO clubs (id, public_id, name, description, category, meeting_day, location, logo, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let result: ResultSetHeader | null = null;
    let insertedClubId = 0;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const nextId = await nextClubPrimaryKey();
      const publicId = generateClubPublicId();
      try {
        const [insertResult] = await pool.execute<ResultSetHeader>(query, [
          nextId,
          publicId,
          name,
          description || null,
          category || null,
          meetingDay || null,
          location || null,
          logoPath,
          status || 'active',
        ]);
        result = insertResult;
        insertedClubId = nextId;
        break;
      } catch (error) {
        const code =
          error && typeof error === 'object' && 'code' in error
            ? String((error as { code?: string }).code)
            : '';
        if ((code !== 'ER_DUP_ENTRY' && code !== '23505') || attempt === 4) {
          throw error;
        }
      }
    }

    if (!result) {
      throw createApiError('สร้างชมรมไม่สำเร็จ', 500, 'CLUB_CREATE_FAILED');
    }

    const clubId = Number(result.insertId) > 0 ? Number(result.insertId) : insertedClubId;
    if (!clubId) {
      throw createApiError('สร้างชมรมไม่สำเร็จ', 500, 'CLUB_CREATE_FAILED');
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, public_id as publicId, name, description, category, meeting_day, location, logo, status, created_at FROM clubs WHERE id = ?',
      [clubId],
    );

    const row = rows[0] as Record<string, unknown>;
    const club: Club = {
      id: Number(row.id),
      publicId: String(pgField(row, 'publicId') ?? ''),
      name: String(row.name ?? ''),
      description: (row.description as string | null) || undefined,
      category: (row.category as string | null) || undefined,
      meetingDay: (row.meeting_day as string | null) || undefined,
      location: (row.location as string | null) || undefined,
      logo: (row.logo as string | null) || undefined,
      status: (row.status as Club['status']) || 'active',
      memberCount: 0,
      createdAt: createdAtFromRow(row),
    };

    res.status(201).json({
      success: true,
      club,
    });
  } catch (error) {
    next(error);
  }
};

// Get user's club memberships
export const getUserMemberships = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED');
    }

    const userId = req.user.userId;

    const query = `
      SELECT 
        cm.id,
        cm.user_id as userId,
        cm.club_id as clubId,
        cm.status,
        cm.role,
        cm.request_date as requestDate,
        cm.approved_date as approvedDate,
        cm.approved_by as approvedBy,
        cm.created_at as createdAt,
        c.public_id as clubPublicId,
        c.name as clubName
      FROM club_memberships cm
      JOIN clubs c ON cm.club_id = c.id
      WHERE cm.user_id = ?
      ORDER BY cm.created_at DESC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [userId]);

    const memberships = rows.map((row: any) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id,
        clubId: pgField(r, 'clubId'),
        clubPublicId: pgField(r, 'clubPublicId'),
        clubName: pgField(r, 'clubName'),
        status: r.status,
        role: r.role,
        requestDate: pgField(r, 'requestDate'),
        approvedDate: pgField(r, 'approvedDate') || undefined,
        approvedBy: pgField(r, 'approvedBy') || undefined,
        createdAt: pgField(r, 'createdAt'),
      };
    });

    res.json({
      success: true,
      memberships,
    });
  } catch (error) {
    next(error);
  }
};

// Request to join a club
export const joinClub = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED');
    }

    const { clubPublicId }: JoinClubRequest = req.body;
    const userId = req.user.userId;

    if (!isValidPublicIdSegment(clubPublicId)) {
      throw createApiError('กรุณาระบุรหัสชมรม (public ID) ให้ถูกต้อง', 400, 'CLUB_PUBLIC_ID_INVALID');
    }

    // Check if club exists
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, public_id as publicId, name FROM clubs WHERE public_id = ?',
      [clubPublicId]
    );

    if (clubRows.length === 0) {
      throw createApiError('ไม่พบชมรม', 404, 'CLUB_NOT_FOUND');
    }
    const clubId = Number((clubRows[0] as Record<string, unknown>).id);

    // Check if membership already exists
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, status FROM club_memberships WHERE user_id = ? AND club_id = ?',
      [userId, clubId]
    );

    let membershipId: number;

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      if (existing.status === 'pending') {
        throw createApiError('คุณมีคำขอเข้าชมรมนี้ที่รออนุมัติอยู่แล้ว', 400, 'CLUB_JOIN_PENDING');
      }
      if (existing.status === 'approved') {
        throw createApiError('คุณเป็นสมาชิกชมรมนี้แล้ว', 400, 'CLUB_ALREADY_MEMBER');
      }
      
      // If status is 'left' or 'rejected', update the existing membership to 'pending'
      if (existing.status === 'left' || existing.status === 'rejected') {
        membershipId = existing.id;
        await pool.execute(
          `UPDATE club_memberships 
           SET status = 'pending', 
               role = 'member',
               request_date = NOW(),
               approved_date = NULL,
               approved_by = NULL
           WHERE id = ?`,
          [membershipId]
        );
      } else {
        membershipId = await insertPendingClubMembership(userId, clubId);
      }
    } else {
      membershipId = await insertPendingClubMembership(userId, clubId);
    }

    // Get the created membership
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM club_memberships WHERE id = ?',
      [membershipId]
    );

    const row = rows[0] as any;
    const membership: ClubMembership = {
      id: row.id,
      userId: row.user_id,
      clubId: row.club_id,
      status: row.status,
      role: row.role,
      requestDate: row.request_date,
      createdAt: row.created_at,
    };

    // Emit WebSocket event to club room
    if (io) {
      io.to(`club-${clubPublicId}`).emit('club-join-request', {
        clubPublicId,
        membership,
        userId,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Join request submitted successfully',
      membership,
    });
  } catch (error) {
    next(error);
  }
};

// Get pending join requests for a club (leader/admin only)
export const getClubJoinRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED');
    }

    const { clubId } = req.params;
    const userId = req.user.userId;

    // Check if user is leader of this club or admin
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT president_id, status FROM clubs WHERE id = ?',
      [clubId]
    );

    if (clubRows.length === 0) {
      throw createApiError('ไม่พบชมรม', 404, 'CLUB_NOT_FOUND');
    }

    const club = clubRows[0];
    const isPresident = club.president_id === userId;
    const isAdmin = req.user.role === 'admin';

    // Check if user has leader role in membership
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
      [userId, clubId, 'approved']
    );
    const hasLeaderMembership = membershipRows.length > 0 && membershipRows[0].role === 'leader';
    const isLeader = isPresident || hasLeaderMembership;

    if (!isLeader && !isAdmin) {
      throw createApiError('เฉพาะหัวหน้าชมรมและผู้ดูแลระบบเท่านั้นที่ดูคำขอเข้าชมรมได้', 403, 'CLUB_JOIN_REQUESTS_FORBIDDEN');
    }

    const query = `
      SELECT 
        cm.id,
        cm.user_id as userId,
        cm.club_id as clubId,
        cm.status,
        cm.role,
        cm.request_date as requestDate,
        cm.created_at as createdAt,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email,
        u.major
      FROM club_memberships cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.club_id = ? AND cm.status = 'pending'
      ORDER BY cm.request_date DESC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [clubId]);

    const requests = rows.map((row: any) => {
      const r = row as Record<string, unknown>;
      const userId = pgField(r, 'userId');
      return {
        id: r.id,
        userId,
        clubId: pgField(r, 'clubId'),
        status: r.status,
        role: r.role,
        requestDate: pgField(r, 'requestDate'),
        createdAt: pgField(r, 'createdAt'),
        user: {
          id: userId,
          firstName: pgField(r, 'firstName'),
          lastName: pgField(r, 'lastName'),
          email: r.email,
          major: r.major,
        },
      };
    });

    res.json({
      success: true,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

// Approve or reject a join request (leader/admin only)
export const updateMembershipStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED');
    }

    const { membershipId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    if (!status || (status !== 'approved' && status !== 'rejected')) {
      throw createApiError('สถานะต้องเป็น "approved" หรือ "rejected"', 400, 'CLUB_INVALID_STATUS');
    }

    // Get membership details
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      `SELECT cm.*, c.president_id, c.public_id as clubPublicId, c.name as clubName
       FROM club_memberships cm
       JOIN clubs c ON cm.club_id = c.id
       WHERE cm.id = ?`,
      [membershipId]
    );

    if (membershipRows.length === 0) {
      throw createApiError('ไม่พบคำขอสมาชิกภาพ', 404, 'CLUB_MEMBERSHIP_REQUEST_NOT_FOUND');
    }

    const membership = membershipRows[0];
    const isPresident = membership.president_id === userId;
    const isAdmin = req.user.role === 'admin';

    // Check if user has leader role in membership for this club
    const [leaderMembershipRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
      [userId, membership.club_id, 'approved']
    );
    const hasLeaderMembership = leaderMembershipRows.length > 0 && leaderMembershipRows[0].role === 'leader';
    const isLeader = isPresident || hasLeaderMembership;

    if (!isLeader && !isAdmin) {
      throw createApiError('เฉพาะหัวหน้าชมรมและผู้ดูแลระบบเท่านั้นที่อนุมัติ/ปฏิเสธคำขอได้', 403, 'CLUB_APPROVE_FORBIDDEN');
    }

    // Update membership status
    const updateQuery = status === 'approved'
      ? `UPDATE club_memberships 
         SET status = ?, approved_date = NOW(), approved_by = ?
         WHERE id = ?`
      : `UPDATE club_memberships 
         SET status = ?, approved_by = ?
         WHERE id = ?`;

    await pool.execute(
      updateQuery,
      status === 'approved' ? [status, userId, membershipId] : [status, userId, membershipId]
    );

    // Get updated membership
    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM club_memberships WHERE id = ?',
      [membershipId]
    );

    const row = updatedRows[0] as any;
    const updatedMembership: ClubMembership = {
      id: row.id,
      userId: row.user_id,
      clubId: row.club_id,
      status: row.status,
      role: row.role,
      requestDate: row.request_date,
      approvedDate: row.approved_date || undefined,
      approvedBy: row.approved_by || undefined,
      createdAt: row.created_at,
    };

    // Emit WebSocket event to club room and user
    if (io) {
      const clubId = membership.club_id;
      const clubPublicId = String(membership.clubpublicid ?? membership.clubPublicId ?? clubId);
      io.to(`club-${clubPublicId}`).emit('club-membership-updated', {
        clubPublicId,
        membership: updatedMembership,
        status,
      });
      // Also notify the user who made the request
      io.to(`user-${membership.user_id}`).emit('membership-status-changed', {
        clubPublicId,
        membership: updatedMembership,
        status,
      });
      
      // If approved, notify user they can now access club chat
      if (status === 'approved') {
        io.to(`user-${membership.user_id}`).emit('club-chat-access-granted', {
          clubPublicId,
          clubName: membership.clubName,
        });
      }
    }

    res.json({
      success: true,
      message: `Membership request ${status} successfully`,
      membership: updatedMembership,
    });
  } catch (error) {
    next(error);
  }
};

// Get club membership statistics - leader/admin only
export const getClubMembershipStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED');
    }

    const { clubId } = req.params;
    const userId = req.user.userId;

    // Check if user is leader of this club or admin
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT president_id, status FROM clubs WHERE id = ?',
      [clubId]
    );

    if (clubRows.length === 0) {
      throw createApiError('ไม่พบชมรม', 404, 'CLUB_NOT_FOUND');
    }

    const club = clubRows[0];
    const isPresident = club.president_id === userId;
    const isAdmin = req.user.role === 'admin';

    // Check if user has leader role in membership
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
      [userId, clubId, 'approved']
    );

    const hasLeaderMembership = membershipRows.length > 0 && membershipRows[0].role === 'leader';
    const isLeader = isPresident || hasLeaderMembership;

    if (!isLeader && !isAdmin) {
      throw createApiError('เฉพาะหัวหน้าชมรมและผู้ดูแลระบบเท่านั้นที่ดูสถิติได้', 403, 'CLUB_STATS_FORBIDDEN');
    }

    // Get counts for each status
    const [statsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingCount,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approvedCount,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejectedCount,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as activeMemberCount
      FROM club_memberships
      WHERE club_id = ?`,
      [clubId]
    );

    const stats = statsRows[0] as any;

    res.json({
      success: true,
      stats: {
        pending: parseInt(stats.pendingCount) || 0,
        approved: parseInt(stats.approvedCount) || 0,
        rejected: parseInt(stats.rejectedCount) || 0,
        activeMembers: parseInt(stats.activeMemberCount) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get club members (approved memberships) - leader/admin only
export const getClubMembers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED');
    }

    const { clubId } = req.params;
    const userId = req.user.userId;
    const clubIdNum = parseInt(clubId, 10);
    
    if (isNaN(clubIdNum)) {
      throw createApiError('รหัสชมรมไม่ถูกต้อง', 400, 'CLUB_INVALID_ID');
    }

    // Check if user is leader of this club or admin
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT president_id, status FROM clubs WHERE id = ?',
      [clubIdNum]
    );

    if (clubRows.length === 0) {
      throw createApiError('ไม่พบชมรม', 404, 'CLUB_NOT_FOUND');
    }

    const club = clubRows[0];
    const isPresident = Number((club as any).president_id) === Number(userId);
    const isAdmin = req.user.role === 'admin';

    // Check if user has membership in this club (approved status)
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, role, status FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
      [userId, clubIdNum, 'approved']
    );

    const hasLeaderMembership = membershipRows.length > 0 && membershipRows[0].role === 'leader';
    const isLeader = isPresident || hasLeaderMembership;

    // Check if user is a member of this club (for viewing purposes)
    const isMember = membershipRows.length > 0;

    // Allow members to view, but only leaders/admins can edit
    if (!isMember && !isLeader && !isAdmin) {
      throw createApiError('เฉพาะสมาชิกชมรมเท่านั้นที่ดูรายชื่อสมาชิกได้', 403, 'CLUB_MEMBERS_LIST_FORBIDDEN');
    }

    const query = `
      SELECT 
        cm.id,
        cm.user_id as userId,
        cm.club_id as clubId,
        cm.status,
        cm.role,
        cm.request_date as requestDate,
        cm.approved_date as approvedDate,
        cm.created_at as createdAt,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email,
        u.major,
        u.avatar
      FROM club_memberships cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.club_id = ? AND cm.status = 'approved'
      ORDER BY cm.approved_date DESC, u.first_name ASC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [clubIdNum]);

    const members = (rows as Record<string, unknown>[]).map((row) => {
      const uid = Number(pgVal(row, 'userId'));
      return {
        id: row.id,
        userId: uid,
        clubId: Number(pgVal(row, 'clubId')),
        status: pgVal(row, 'status'),
        role: pgVal(row, 'role') as string,
        requestDate: pgDateIsoReq(row, 'requestDate'),
        approvedDate: pgDateIso(row, 'approvedDate'),
        createdAt: pgDateIsoReq(row, 'createdAt'),
        user: {
          id: uid,
          firstName: pgVal(row, 'firstName') as string,
          lastName: pgVal(row, 'lastName') as string,
          email: pgVal(row, 'email') as string,
          major: pgVal(row, 'major') as string,
          avatar: (pgVal(row, 'avatar') as string | undefined) || undefined,
        },
      };
    });

    res.json({
      success: true,
      members,
    });
  } catch (error) {
    next(error);
  }
};

// Update member role - leader/admin only
export const updateMemberRole = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED');
    }

    const { membershipId } = req.params;
    const { role } = req.body;
    const userId = req.user.userId;

    if (!role || (role !== 'member' && role !== 'staff' && role !== 'leader')) {
      throw createApiError('บทบาทต้องเป็น member, staff หรือ leader', 400, 'CLUB_INVALID_ROLE');
    }

    // Get membership details
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      `SELECT cm.*, c.president_id, c.public_id as clubPublicId, c.name as clubName
       FROM club_memberships cm
       JOIN clubs c ON cm.club_id = c.id
       WHERE cm.id = ?`,
      [membershipId]
    );

    if (membershipRows.length === 0) {
      throw createApiError('ไม่พบสมาชิกภาพ', 404, 'CLUB_MEMBERSHIP_NOT_FOUND');
    }

    const membership = membershipRows[0];
    const targetMemberUserId = Number(membership.user_id);
    const clubPresidentIdRaw = membership.president_id;
    const clubPresidentId =
      clubPresidentIdRaw != null && clubPresidentIdRaw !== ''
        ? Number(clubPresidentIdRaw)
        : null;

    if (
      clubPresidentId != null &&
      Number.isFinite(clubPresidentId) &&
      Number.isFinite(targetMemberUserId) &&
      clubPresidentId === targetMemberUserId &&
      role !== 'leader'
    ) {
      throw createApiError(
        'ประธานชมรมต้องถือบทบาทหัวหน้าชมรม (leader) ในชมรมนี้อยู่เสมอ ถ้าต้องการเปลี่ยนบทบาท ให้เปลี่ยนประธานหรือถอดประธานก่อน',
        400,
        'CLUB_PRESIDENT_MUST_BE_LEADER',
      );
    }

    const isPresident = membership.president_id === userId;
    const isAdmin = req.user.role === 'admin';

    // Check if user has leader role in membership for this club
    const [leaderMembershipRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
      [userId, membership.club_id, 'approved']
    );
    const hasLeaderMembership = leaderMembershipRows.length > 0 && leaderMembershipRows[0].role === 'leader';
    const isLeader = isPresident || hasLeaderMembership;

    if (!isLeader && !isAdmin) {
      throw createApiError('เฉพาะหัวหน้าชมรมและผู้ดูแลระบบเท่านั้นที่แก้ไขบทบาทสมาชิกได้', 403, 'CLUB_ROLE_UPDATE_FORBIDDEN');
    }

    // Update member role
    await pool.execute(
      'UPDATE club_memberships SET role = ? WHERE id = ?',
      [role, membershipId]
    );

    const targetUserId = membership.user_id;
    await reconcileAggregateUserRole(targetUserId);

    const [leaderCheckRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as leaderCount FROM club_memberships 
       WHERE user_id = ? AND status = 'approved' AND role = 'leader'`,
      [targetUserId]
    );
    const [presidentCheckRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as presidentCount FROM clubs WHERE president_id = ?`,
      [targetUserId]
    );
    const targetHasLeaderMembership = Number(leaderCheckRows[0]?.leaderCount ?? 0) > 0;
    const targetIsPresident = Number(presidentCheckRows[0]?.presidentCount ?? 0) > 0;
    const shouldBeLeader = targetHasLeaderMembership || targetIsPresident;

    // Get updated membership
    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM club_memberships WHERE id = ?',
      [membershipId]
    );

    const row = updatedRows[0] as any;
    const updatedMembership: ClubMembership = {
      id: row.id,
      userId: row.user_id,
      clubId: row.club_id,
      status: row.status,
      role: row.role,
      requestDate: row.request_date,
      approvedDate: row.approved_date || undefined,
      approvedBy: row.approved_by || undefined,
      createdAt: row.created_at,
    };

    // Emit WebSocket event
    if (io) {
      const clubId = membership.club_id;
      const clubPublicId = String(membership.clubpublicid ?? membership.clubPublicId ?? clubId);
      io.to(`club-${clubPublicId}`).emit('club-member-role-updated', {
        clubPublicId,
        membership: updatedMembership,
      });
      
      // Notify the user whose role was changed to refresh their session
      io.to(`user-${targetUserId}`).emit('user-role-updated', {
        userId: targetUserId,
        newRole: shouldBeLeader ? 'leader' : 'member',
        message: 'Your role has been updated. Please refresh the page.',
      });
    }

    res.json({
      success: true,
      message: 'Member role updated successfully',
      membership: updatedMembership,
    });
  } catch (error) {
    next(error);
  }
};

// Remove member (set status to 'left') - leader/admin only
export const removeMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED');
    }

    const { membershipId } = req.params;
    const userId = req.user.userId;

    // Get membership details
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      `SELECT cm.*, c.president_id, c.public_id as clubPublicId, c.name as clubName
       FROM club_memberships cm
       JOIN clubs c ON cm.club_id = c.id
       WHERE cm.id = ?`,
      [membershipId]
    );

    if (membershipRows.length === 0) {
      throw createApiError('ไม่พบสมาชิกภาพ', 404, 'CLUB_MEMBERSHIP_NOT_FOUND');
    }

    const membership = membershipRows[0];
    const isPresident = membership.president_id === userId;
    const isAdmin = req.user.role === 'admin';

    // Check if user has leader role in membership for this club
    const [leaderMembershipRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
      [userId, membership.club_id, 'approved']
    );
    const hasLeaderMembership = leaderMembershipRows.length > 0 && leaderMembershipRows[0].role === 'leader';
    const isLeader = isPresident || hasLeaderMembership;

    if (!isLeader && !isAdmin) {
      throw createApiError('เฉพาะหัวหน้าชมรมและผู้ดูแลระบบเท่านั้นที่ลบสมาชิกได้', 403, 'CLUB_REMOVE_MEMBER_FORBIDDEN');
    }

    // Prevent user from removing themselves
    if (membership.user_id === userId) {
      throw createApiError('คุณไม่สามารถลบตัวเองออกจากชมรมได้', 400, 'CLUB_CANNOT_REMOVE_SELF');
    }

    // Set status to 'left'
    await pool.execute(
      'UPDATE club_memberships SET status = ? WHERE id = ?',
      ['left', membershipId]
    );

    // Get updated membership for WebSocket event
    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM club_memberships WHERE id = ?',
      [membershipId]
    );

    const row = updatedRows[0] as any;
    const updatedMembership: ClubMembership = {
      id: row.id,
      userId: row.user_id,
      clubId: row.club_id,
      status: row.status,
      role: row.role,
      requestDate: row.request_date,
      approvedDate: row.approved_date || undefined,
      approvedBy: row.approved_by || undefined,
      createdAt: row.created_at,
    };

    // Emit WebSocket event
    if (io) {
      const clubId = membership.club_id;
      const clubPublicId = String(membership.clubpublicid ?? membership.clubPublicId ?? clubId);
      const targetUserId = membership.user_id;
      
      // Notify club room
      io.to(`club-${clubPublicId}`).emit('club-member-removed', {
        clubPublicId,
        membershipId,
        userId: targetUserId,
      });
      
      // Notify the removed user that their membership status changed
      io.to(`user-${targetUserId}`).emit('membership-status-changed', {
        clubPublicId,
        membership: updatedMembership,
        status: 'left',
      });
    }

    res.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get leader's clubs (clubs where user is president or has leader role)
export const getLeaderClubs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED');
    }

    const userId = req.user.userId;

    // Get clubs where user is president OR has approved membership with role='leader'
    const query = `
      SELECT 
        c.id,
        c.public_id as publicId,
        c.name,
        c.description,
        c.category,
        c.president_id as presidentId,
        c.meeting_day as meetingDay,
        c.location,
        c.logo,
        c.status,
        c.created_at as createdAt,
        COALESCE(mc.cnt, 0)::int as memberCount
      FROM clubs c
      LEFT JOIN (
        SELECT club_id, COUNT(*)::int AS cnt
        FROM club_memberships
        WHERE status = 'approved'
        GROUP BY club_id
      ) mc ON mc.club_id = c.id
      WHERE c.president_id = ? 
         OR EXISTS (
           SELECT 1 FROM club_memberships cm2 
           WHERE cm2.club_id = c.id 
           AND cm2.user_id = ? 
           AND cm2.status = 'approved' 
           AND cm2.role = 'leader'
         )
      ORDER BY c.name ASC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [userId, userId]);

    const clubs = rows.map((row: any) => {
      const r = row as Record<string, unknown>;
      return {
        id: row.id,
        publicId: String(pgField(r, 'publicId') ?? ''),
        name: row.name,
        description: row.description || undefined,
        category: row.category || undefined,
        presidentId: numOptional(pgField(r, 'presidentId')),
        meetingDay: (pgField(r, 'meetingDay') as string | undefined) || undefined,
        location: row.location || undefined,
        logo: row.logo || undefined,
        status: row.status || 'active',
        memberCount: memberCountFromRow(r),
        createdAt: createdAtFromRow(r),
      };
    });

    res.json({
      success: true,
      clubs,
    });
  } catch (error) {
    next(error);
  }
};

// Update club home content (leader/admin only)
export const updateClubHomeContent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED');
    }

    const { clubId } = req.params;
    const { content, title } = req.body;
    const userId = req.user.userId;
    const clubIdNum = parseInt(clubId, 10);

    if (isNaN(clubIdNum)) {
      throw createApiError('รหัสชมรมไม่ถูกต้อง', 400, 'CLUB_INVALID_ID');
    }

    // Check if club exists
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT president_id, status FROM clubs WHERE id = ?',
      [clubIdNum]
    );

    if (clubRows.length === 0) {
      throw createApiError('ไม่พบชมรม', 404, 'CLUB_NOT_FOUND');
    }

    const club = clubRows[0];
    const isPresident = club.president_id === userId;
    const isAdmin = req.user.role === 'admin';

    // Check if user has leader role in membership
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
      [userId, clubIdNum, 'approved']
    );
    const hasLeaderMembership = membershipRows.length > 0 && membershipRows[0].role === 'leader';
    const isLeader = isPresident || hasLeaderMembership;

    if (!isLeader && !isAdmin) {
      throw createApiError('เฉพาะหัวหน้าชมรมและผู้ดูแลระบบเท่านั้นที่แก้ไขหน้าแรกชมรมได้', 403, 'CLUB_HOME_UPDATE_FORBIDDEN');
    }

    // Update home content and title
    await pool.execute(
      'UPDATE clubs SET home_content = ?, home_title = ? WHERE id = ?',
      [content || null, title || 'Announcements', clubIdNum]
    );

    // Get updated club data
    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        c.id,
        c.public_id as publicId,
        c.name,
        c.description,
        c.category,
        c.president_id as presidentId,
        u.first_name as presidentFirstName,
        u.last_name as presidentLastName,
        u.email as presidentEmail,
        c.meeting_day as meetingDay,
        c.location,
        c.logo,
        c.status,
        c.home_content as homeContent,
        c.home_title as homeTitle,
        c.created_at as createdAt,
        COALESCE(mc.cnt, 0)::int as memberCount
      FROM clubs c
      LEFT JOIN users u ON c.president_id = u.id
      LEFT JOIN (
        SELECT club_id, COUNT(*)::int AS cnt
        FROM club_memberships
        WHERE status = 'approved'
        GROUP BY club_id
      ) mc ON mc.club_id = c.id
      WHERE c.id = ?`,
      [clubIdNum]
    );

    const row = updatedRows[0] as any;
    const r = row as Record<string, unknown>;
    const pFirst = pgField(r, 'presidentFirstName');
    const pLast = pgField(r, 'presidentLastName');
    const updatedClub: Club = {
      id: row.id,
      publicId: String(pgField(r, 'publicId') ?? ''),
      name: row.name,
      description: row.description || undefined,
      category: row.category || undefined,
      presidentId: numOptional(pgField(r, 'presidentId')),
      presidentName:
        pFirst && pLast ? `${String(pFirst)} ${String(pLast)}` : undefined,
      meetingDay: (pgField(r, 'meetingDay') as string | undefined) || undefined,
      location: row.location || undefined,
      logo: row.logo || undefined,
      status: row.status || 'active',
      memberCount: memberCountFromRow(r),
      homeContent: (pgField(r, 'homeContent') as string | undefined) || undefined,
      homeTitle: (pgField(r, 'homeTitle') as string | undefined) || 'Announcements',
      createdAt: createdAtFromRow(r),
    };

    // Emit websocket event to notify all users viewing this club
    if (io) {
      const clubPublicId = req.clubPublicId ?? String(clubIdNum);
      io.to(`club-${clubPublicId}`).emit('club-home-content-updated', {
        clubPublicId,
        club: updatedClub,
      });
      console.log(`📤 Emitted club-home-content-updated to club-${clubPublicId}`);
    }

    res.json({
      success: true,
      message: 'Home content updated successfully',
      club: updatedClub,
    });
  } catch (error) {
    next(error);
  }
};

async function promoteApprovedMemberToClubLeader(
  targetUserId: number,
  clubId: number,
  adminUserId: number,
): Promise<void> {
  const [header] = await pool.execute<ResultSetHeader>(
    `UPDATE club_memberships SET status = 'approved', role = 'leader',
     approved_date = COALESCE(approved_date, CURRENT_TIMESTAMP),
     approved_by = COALESCE(approved_by, ?),
     updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND club_id = ? AND status = 'approved'`,
    [adminUserId, targetUserId, clubId],
  );

  const affected =
    typeof header === 'object' &&
    header !== null &&
    'affectedRows' in header &&
    typeof (header as ResultSetHeader).affectedRows === 'number'
      ? (header as ResultSetHeader).affectedRows
      : 0;

  if (affected < 1) {
    throw createApiError(
      'ประธานชมรมต้องเป็นสมาชิกที่อนุมัติแล้วของชมรมนี้ กรุณาเพิ่มและอนุมัติในหน้าสมาชิกก่อน',
      400,
      'CLUB_PRESIDENT_NOT_APPROVED_MEMBER',
    );
  }
}

/** After president changes away from a user, keep them as club leader so oversight shows หัวหน้าชมรม not สมาชิกทั่วไป */
async function retainOutgoingPresidentAsClubLeader(
  outgoingPresidentUserId: number,
  clubId: number,
  adminUserId: number,
): Promise<void> {
  await pool.execute(
    `UPDATE club_memberships SET role = 'leader',
     status = 'approved',
     approved_date = COALESCE(approved_date, CURRENT_TIMESTAMP),
     approved_by = COALESCE(approved_by, ?),
     updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND club_id = ?`,
    [adminUserId, outgoingPresidentUserId, clubId],
  );
}

export const patchClubPresident = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw createApiError('เฉพาะผู้ดูแลระบบเท่านั้นที่เปลี่ยนประธานชมรมได้', 403, 'CLUB_PRESIDENT_ADMIN_ONLY');
    }

    const clubId = req.clubDbId;
    if (!clubId || clubId < 1) {
      throw createApiError('ไม่พบชมรม', 404, 'CLUB_NOT_FOUND');
    }

    const { presidentUserId } = req.body as { presidentUserId?: number | null };
    if (presidentUserId !== undefined && presidentUserId !== null && typeof presidentUserId !== 'number') {
      throw createApiError('presidentUserId ต้องเป็นตัวเลขหรือ null', 400, 'CLUB_PRESIDENT_ID_INVALID');
    }

    const [clubRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, president_id FROM clubs WHERE id = ?`,
      [clubId]
    );
    if (!clubRows.length) {
      throw createApiError('ไม่พบชมรม', 404, 'CLUB_NOT_FOUND');
    }

    const prevPresidentId = clubRows[0].president_id != null ? Number(clubRows[0].president_id) : null;

    let newPresidentId: number | null =
      presidentUserId === undefined ? prevPresidentId : presidentUserId == null ? null : Math.trunc(presidentUserId);

    if (newPresidentId !== null && (!Number.isFinite(newPresidentId) || newPresidentId < 1)) {
      throw createApiError('ผู้ใช้ประธานชมรมไม่ถูกต้อง', 400, 'CLUB_PRESIDENT_INVALID');
    }

    if (newPresidentId !== null) {
      const [tu] = await pool.execute<RowDataPacket[]>(
        `SELECT id, role, COALESCE(is_suspended, FALSE) AS is_suspended FROM users WHERE id = ?`,
        [newPresidentId]
      );
      if (!tu.length) {
        throw createApiError('ไม่พบผู้ใช้', 404, 'AUTH_USER_NOT_FOUND');
      }
      const urow = tu[0] as unknown as Record<string, unknown>;
      if (String(urow.role) === 'admin') {
        throw createApiError('ไม่สามารถตั้งผู้ดูแลระบบเป็นประธานชมรมได้', 400, 'CLUB_PRESIDENT_NO_ADMIN');
      }
      if (isSuspendedDbRow(urow)) {
        throw createApiError('ผู้ใช้ที่ถูกระงับไม่สามารถเป็นประธานชมรมได้', 400, 'CLUB_PRESIDENT_SUSPENDED');
      }
      await promoteApprovedMemberToClubLeader(newPresidentId, clubId, req.user.userId);
    }

    await pool.execute(`UPDATE clubs SET president_id = ? WHERE id = ?`, [newPresidentId, clubId]);

    if (prevPresidentId !== null && prevPresidentId !== newPresidentId) {
      await retainOutgoingPresidentAsClubLeader(prevPresidentId, clubId, req.user.userId);
    }

    try {
      await pool.execute(
        `INSERT INTO club_presidency_audit (club_id, previous_president_user_id, new_president_user_id, changed_by_user_id)
       VALUES (?, ?, ?, ?)` ,
        [clubId, prevPresidentId, newPresidentId, req.user.userId]
      );
    } catch (auditErr: unknown) {
      const code =
        typeof auditErr === 'object' && auditErr !== null ? (auditErr as { code?: string }).code : '';
      if (code !== '42P01' && code !== 'ER_NO_SUCH_TABLE') {
        throw auditErr;
      }
    }

    if (prevPresidentId !== null && prevPresidentId !== newPresidentId) {
      await reconcileAggregateUserRole(prevPresidentId);
    }
    if (newPresidentId !== null) {
      await reconcileAggregateUserRole(newPresidentId);
    }

    if (io) {
      io.to(`club-${req.clubPublicId}`).emit('club-president-updated', {
        clubPublicId: req.clubPublicId,
        clubId,
        presidentId: newPresidentId,
      });
    }

    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      `
      SELECT 
        c.id,
        c.public_id as publicId,
        c.name,
        c.president_id as presidentId,
        u.first_name as presidentFirstName,
        u.last_name as presidentLastName,
        u.email as presidentEmail,
        c.status
      FROM clubs c
      LEFT JOIN users u ON c.president_id = u.id
      WHERE c.id = ?
      `,
      [clubId]
    );
    const r0 = updatedRows[0] as Record<string, unknown>;
    const pf = pgField(r0, 'presidentFirstName');
    const pl = pgField(r0, 'presidentLastName');

    res.json({
      success: true,
      message: newPresidentId == null ? 'President cleared' : 'President updated',
      club: {
        id: Number(r0.id),
        publicId: String(pgField(r0, 'publicId') ?? ''),
        name: String(r0.name ?? ''),
        presidentId: numOptional(pgField(r0, 'presidentId')),
        presidentName: pf && pl ? `${String(pf)} ${String(pl)}` : undefined,
        presidentEmail: (pgField(r0, 'presidentEmail') as string | undefined) || undefined,
        status: String(r0.status ?? 'active'),
      },
    });
  } catch (error) {
    next(error);
  }
};

/** Admin-only: update club lifecycle status */
export const patchClubStatusAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw createApiError('เฉพาะผู้ดูแลระบบเท่านั้นที่อัปเดตสถานะชมรมได้', 403, 'CLUB_STATUS_ADMIN_ONLY');
    }

    const clubId = req.clubDbId;
    const { status } = req.body as { status?: string };
    if (!clubId || !['active', 'pending', 'inactive'].includes(status || '')) {
      throw createApiError('สถานะชมรมไม่ถูกต้อง', 400, 'CLUB_STATUS_INVALID');
    }

    await pool.execute(`UPDATE clubs SET status = ? WHERE id = ?`, [status, clubId]);

    res.json({
      success: true,
      message: 'Club status updated',
      status,
    });
  } catch (error) {
    next(error);
  }
};

/** Admin-only: hard-delete club and dependent records (depends on DB FK cascade rules). */
export const deleteClubAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw createApiError('เฉพาะผู้ดูแลระบบเท่านั้นที่ลบชมรมได้', 403, 'CLUB_DELETE_ADMIN_ONLY');
    }

    const clubId = req.clubDbId;
    if (!clubId || clubId < 1) {
      throw createApiError('ไม่พบชมรม', 404, 'CLUB_NOT_FOUND');
    }

    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, public_id as publicId, name FROM clubs WHERE id = ?',
      [clubId]
    );
    if (!clubRows.length) {
      throw createApiError('ไม่พบชมรม', 404, 'CLUB_NOT_FOUND');
    }
    const clubRow = clubRows[0] as Record<string, unknown>;
    const publicId = String(pgField(clubRow, 'publicId') ?? '');
    const name = String(clubRow.name ?? '');

    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM clubs WHERE id = ?', [clubId]);
    const affected = Number((result as { affectedRows?: number }).affectedRows ?? 0);
    if (affected < 1) {
      throw createApiError('ไม่พบชมรม', 404, 'CLUB_NOT_FOUND');
    }

    res.json({
      success: true,
      message: 'Club deleted successfully',
      club: {
        id: clubId,
        publicId,
        name,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getClubPresidentAudit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw createApiError('เฉพาะผู้ดูแลระบบเท่านั้นที่ดูประวัติประธานชมรมได้', 403, 'CLUB_PRESIDENCY_AUDIT_ADMIN_ONLY');
    }

    const clubId = req.clubDbId;
    if (!clubId) {
      throw createApiError('ไม่พบชมรม', 404, 'CLUB_NOT_FOUND');
    }

    let rows: RowDataPacket[] = [];
    try {
      const [r] = await pool.execute<RowDataPacket[]>(
        `
      SELECT 
        a.id,
        a.club_id AS clubId,
        a.previous_president_user_id AS prevId,
        a.new_president_user_id AS newId,
        a.changed_by_user_id AS changedById,
        a.created_at AS createdAt,
        c.name AS clubName,
        pu.email AS prevEmail,
        pu.first_name AS prevFirst,
        pu.last_name AS prevLast,
        nu.email AS newEmail,
        nu.first_name AS newFirst,
        nu.last_name AS newLast,
        ch.email AS changedByEmail,
        ch.first_name AS cbFirst,
        ch.last_name AS cbLast
      FROM club_presidency_audit a
      JOIN clubs c ON c.id = a.club_id
      LEFT JOIN users pu ON pu.id = a.previous_president_user_id
      LEFT JOIN users nu ON nu.id = a.new_president_user_id
      LEFT JOIN users ch ON ch.id = a.changed_by_user_id
      WHERE a.club_id = ?
      ORDER BY a.created_at DESC
      LIMIT 100
      `,
        [clubId]
      );
      rows = r;
    } catch (err: unknown) {
      const code = typeof err === 'object' && err !== null ? (err as { code?: string }).code : '';
      if (code !== '42P01' && code !== 'ER_NO_SUCH_TABLE') {
        throw err;
      }
      rows = [];
    }

    type R = Record<string, unknown>;
    const entries = (rows as RowDataPacket[]).map((row) => {
      const r = row as R;
      const prevEmail = pgField(r, 'prevEmail') as string | undefined;
      const newEmail = pgField(r, 'newEmail') as string | undefined;
      const newFirst = pgField(r, 'newFirst');
      const newLast = pgField(r, 'newLast');
      const prevFirst = pgField(r, 'prevFirst');
      const prevLast = pgField(r, 'prevLast');
      const cbFirst = pgField(r, 'cbFirst');
      const cbLast = pgField(r, 'cbLast');
      const dt = pgField(r, 'createdAt');
      return {
        id: String(pgField(r, 'id')),
        clubId: String(pgField(r, 'clubId')),
        clubName: String(pgField(r, 'clubName') ?? ''),
        previousOwner: prevEmail || (prevFirst && prevLast ? `${String(prevFirst)} ${String(prevLast)}` : undefined),
        newOwner: newEmail || (newFirst && newLast ? `${String(newFirst)} ${String(newLast)}` : 'Unassigned'),
        changedBy:
          pgField(r, 'changedByEmail') ||
          (cbFirst && cbLast ? `${String(cbFirst)} ${String(cbLast)}` : 'unknown'),
        date: dt instanceof Date ? dt.toISOString() : String(dt ?? ''),
      };
    });

    res.json({
      success: true,
      entries,
    });
  } catch (error) {
    next(error);
  }
};

