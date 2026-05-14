import { Response, NextFunction } from 'express';
import pool from '../../../config/database';
import type { RowDataPacket } from '../../../types/db';
import { ApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import { reconcileAggregateUserRole } from '../../../utils/userRoleHelpers';
import { pgVal } from '../../../utils/pgRowHelpers';

function assertAdmin(req: AuthRequest): void {
  if (!req.user || req.user.role !== 'admin') {
    const e: ApiError = new Error('Admin access required');
    e.statusCode = 403;
    throw e;
  }
}

export const listAdminUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    assertAdmin(req);
    const rawSearch = String(req.query.search || '').trim();
    const rawRole = String(req.query.role || '').trim().toLowerCase();
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10) || 0);

    const params: unknown[] = [];
    let sql = `
      SELECT u.id, u.email, u.first_name AS firstName, u.last_name AS lastName, u.role, u.major,
        COALESCE(u.is_suspended, FALSE) AS isSuspended
      FROM users u
      WHERE 1 = 1
    `;
    if (rawSearch.length > 0) {
      const like = `%${rawSearch}%`;
      params.push(like, like, like);
      sql += ` AND (
        CAST(u.id AS TEXT) ILIKE ?
        OR u.email ILIKE ?
        OR (u.first_name || ' ' || u.last_name) ILIKE ?
      )`;
    }
    if (rawRole === 'admin' || rawRole === 'leader' || rawRole === 'member') {
      sql += ` AND role = ?`;
      params.push(rawRole);
    }
    sql += ` ORDER BY last_name ASC, first_name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
    type R = Record<string, unknown>;
    const users = (rows as RowDataPacket[]).map((row) => {
      const r = row as R;
      return {
        id: Number(r.id),
        email: String(r.email ?? ''),
        firstName: String(r.firstName ?? ''),
        lastName: String(r.lastName ?? ''),
        role: String(r.role ?? 'member'),
        major: String(r.major ?? ''),
        isSuspended:
          pgVal(r as any, 'isSuspended') === true ||
          pgVal(r as any, 'isSuspended') === 1 ||
          String(pgVal(r as any, 'isSuspended')).toLowerCase() === 'true',
      };
    });

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
};

export const patchUserSuspension = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    assertAdmin(req);
    const actingId = Number(req.user!.userId);
    const targetId = Number.parseInt(String(req.params.userId), 10);
    if (!Number.isFinite(targetId) || targetId < 1) {
      const e: ApiError = new Error('Invalid user id');
      e.statusCode = 400;
      throw e;
    }

    const { suspended } = req.body as { suspended?: boolean };
    if (typeof suspended !== 'boolean') {
      const e: ApiError = new Error('Body must include suspended: boolean');
      e.statusCode = 400;
      throw e;
    }

    if (targetId === actingId) {
      const e: ApiError = new Error('You cannot change your own suspension status');
      e.statusCode = 403;
      throw e;
    }

    const [tRows] = await pool.execute<RowDataPacket[]>('SELECT id, role FROM users WHERE id = ?', [targetId]);
    if (!tRows.length) {
      const e: ApiError = new Error('User not found');
      e.statusCode = 404;
      throw e;
    }
    const tRole = String((tRows[0] as { role?: string }).role ?? 'member');

    if (suspended && tRole === 'admin') {
      const [cRows] = await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*)::bigint AS cnt FROM users
         WHERE role = 'admin' AND COALESCE(is_suspended, FALSE) IS NOT TRUE`
      );
      const cntRaw = (cRows[0] as Record<string, unknown>)?.cnt;
      const activeAdmins = Number(cntRaw ?? 0);
      if (!Number.isFinite(activeAdmins) || activeAdmins <= 1) {
        const e: ApiError = new Error('Cannot suspend the last active admin account');
        e.statusCode = 403;
        throw e;
      }
    }

    await pool.execute('UPDATE users SET is_suspended = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      suspended,
      targetId,
    ]);

    await reconcileAggregateUserRole(targetId);

    res.json({
      success: true,
      message: suspended ? 'User suspended' : 'User suspension cleared',
      userId: targetId,
      suspended,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserOversight = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    assertAdmin(req);

    const [presidentRows] = await pool.execute<RowDataPacket[]>(
      `
      SELECT
        u.id AS userId,
        u.email,
        u.first_name AS firstName,
        u.last_name AS lastName,
        COALESCE(u.is_suspended, FALSE) AS isSuspended,
        c.public_id AS clubPublicId,
        c.name AS clubName,
        (SELECT COUNT(*)::int FROM club_memberships cx
         WHERE cx.club_id = c.id AND cx.status = 'approved') AS memberCount,
        c.created_at AS clubUpdatedAt
      FROM clubs c
      JOIN users u ON u.id = c.president_id
      WHERE c.president_id IS NOT NULL
      ORDER BY clubName ASC NULLS LAST
      `
    );

    const [leaderMembershipRows] = await pool.execute<RowDataPacket[]>(
      `
      SELECT
        u.id AS userId,
        u.email,
        u.first_name AS firstName,
        u.last_name AS lastName,
        COALESCE(u.is_suspended, FALSE) AS isSuspended,
        c.public_id AS clubPublicId,
        c.name AS clubName,
        (SELECT COUNT(*)::int FROM club_memberships cx
         WHERE cx.club_id = c.id AND cx.status = 'approved') AS memberCount,
        c.created_at AS clubUpdatedAt
      FROM club_memberships cm
      JOIN users u ON u.id = cm.user_id
      JOIN clubs c ON c.id = cm.club_id
      WHERE cm.status = 'approved'
        AND cm.role = 'leader'
        AND COALESCE(c.president_id, -1) IS DISTINCT FROM u.id
      ORDER BY clubName ASC NULLS LAST
      `
    );

    const [memberRows] = await pool.execute<RowDataPacket[]>(
      `
      SELECT
        u.id AS userId,
        u.email,
        u.first_name AS firstName,
        u.last_name AS lastName,
        u.role AS appRole,
        COALESCE(u.is_suspended, FALSE) AS isSuspended,
        cm.role AS membershipRole,
        c.public_id AS clubPublicId,
        c.name AS clubName,
        cm.created_at AS joinedAt
      FROM club_memberships cm
      JOIN users u ON u.id = cm.user_id
      JOIN clubs c ON c.id = cm.club_id
      WHERE cm.status = 'approved'
        AND cm.role = 'member'
      ORDER BY u.last_name ASC, u.first_name ASC
      `
    );

    type R = Record<string, unknown>;
    const mapLeader = (row: RowDataPacket, relation: string) => {
      const r = row as R;
      const cid = pgVal(r, 'clubUpdatedAt');
      return {
        userId: Number(pgVal(r, 'userId')),
        email: String(pgVal(r, 'email') ?? ''),
        firstName: String(pgVal(r, 'firstName') ?? ''),
        lastName: String(pgVal(r, 'lastName') ?? ''),
        isSuspended: Boolean(pgVal(r, 'isSuspended')),
        clubPublicId: String(pgVal(r, 'clubPublicId') ?? ''),
        clubName: String(pgVal(r, 'clubName') ?? ''),
        memberCount: Number(pgVal(r, 'memberCount') ?? 0),
        relation,
        activityNote:
          cid instanceof Date ? cid.toISOString() : cid != null ? String(cid) : undefined,
      };
    };

    const leaders = [
      ...(presidentRows as RowDataPacket[]).map((row) => mapLeader(row, 'president')),
      ...(leaderMembershipRows as RowDataPacket[]).map((row) => mapLeader(row, 'leader')),
    ];

    const members = (memberRows as RowDataPacket[]).map((row) => {
      const r = row as R;
      const ja = pgVal(r, 'joinedAt');
      return {
        userId: Number(pgVal(r, 'userId')),
        email: String(pgVal(r, 'email') ?? ''),
        firstName: String(pgVal(r, 'firstName') ?? ''),
        lastName: String(pgVal(r, 'lastName') ?? ''),
        appRole: String(pgVal(r, 'appRole') ?? ''),
        membershipRole: String(pgVal(r, 'membershipRole') ?? ''),
        isSuspended: Boolean(pgVal(r, 'isSuspended')),
        clubPublicId: String(pgVal(r, 'clubPublicId') ?? ''),
        clubName: String(pgVal(r, 'clubName') ?? ''),
        joinedAt:
          ja instanceof Date ? ja.toISOString() : ja != null ? String(ja) : undefined,
      };
    });

    res.json({
      success: true,
      leaders,
      members,
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentSmartDocuments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    assertAdmin(req);
    const limit = Math.min(30, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));

    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `
        SELECT
          sd.id,
          sd.title,
          sd.type,
          sd.status,
          sd.updated_at AS updatedAt,
          c.name AS clubName,
          u.first_name AS creatorFirst,
          u.last_name AS creatorLast,
          sd.club_id AS clubIdNum
        FROM smart_documents sd
        JOIN clubs c ON c.id = sd.club_id
        LEFT JOIN users u ON u.id = sd.created_by
        ORDER BY sd.updated_at DESC NULLS LAST
        LIMIT ?
        `,
        [limit]
      );
      type R = Record<string, unknown>;
      const documents = (rows as RowDataPacket[]).map((row) => {
        const r = row as R;
        const ua = pgVal(r, 'updatedAt') ?? pgVal(r, 'updatedat');
        const clubNameRaw = pgVal(r, 'clubName') ?? pgVal(r, 'clubname');
        const creatorFirst = pgVal(r, 'creatorFirst') ?? pgVal(r, 'creatorfirst');
        const creatorLast = pgVal(r, 'creatorLast') ?? pgVal(r, 'creatorlast');
        const clubIdNum = Number(pgVal(r, 'clubIdNum') ?? pgVal(r, 'clubidnum') ?? 0);
        return {
          id: Number(pgVal(r, 'id') ?? r.id),
          clubIdNum: Number.isFinite(clubIdNum) ? clubIdNum : 0,
          clubName: String(clubNameRaw ?? ''),
          title: String(pgVal(r, 'title') ?? ''),
          type: String(pgVal(r, 'type') ?? 'Report'),
          status: String(pgVal(r, 'status') ?? ''),
          updatedAt:
            ua instanceof Date ? ua.toISOString() : ua != null ? String(ua) : new Date().toISOString(),
          submittedByName:
            creatorFirst || creatorLast
              ? `${String(creatorFirst ?? '')} ${String(creatorLast ?? '')}`.trim()
              : 'Unknown',
        };
      });

      res.json({ success: true, documents });
    } catch (err: unknown) {
      const code = typeof err === 'object' && err !== null ? (err as { code?: string }).code : '';
      if (code === '42P01' || code === 'ER_NO_SUCH_TABLE') {
        res.json({ success: true, documents: [] });
        return;
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};
