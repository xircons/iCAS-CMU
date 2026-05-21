import { Response, NextFunction } from 'express';
import pool from '../../../config/database';
import type { RowDataPacket, ResultSetHeader } from '../../../types/db';
import { createApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import { pgVal } from '../../../utils/pgRowHelpers';
import { CreateReportRequest, UpdateReportStatusRequest, UpdateReportResponseRequest, Report, ReportStats, ReportType, ReportStatus } from '../types/report';

const FEEDBACK_TYPES_REQUIRING_TARGET_CLUB: ReadonlySet<string> = new Set([
  'feedback',
  'suggestion',
  'complaint',
  'question',
  'appreciation',
]);

function jwtRoleNorm(role: unknown): string {
  return String(role ?? 'member').trim().toLowerCase();
}

/** Some deployments omit `reports_add_target_club_id.sql`; cache whether the column exists (Postgres). */
let cachedReportsHasTargetClubId: boolean | undefined;

async function reportsTableHasTargetClubId(): Promise<boolean> {
  if (cachedReportsHasTargetClubId !== undefined) return cachedReportsHasTargetClubId;
  try {
    // Prefer a real column probe: information_schema + current_schemas can miss `public.reports`
    // when PG_SEARCH_PATH is narrowed, which incorrectly forced inserts without target_club_id.
    await pool.execute<RowDataPacket[]>('SELECT target_club_id FROM reports LIMIT 1');
    cachedReportsHasTargetClubId = true;
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err ? String((err as { code?: unknown }).code) : '';
    if (code === '42703') {
      cachedReportsHasTargetClubId = false;
    } else {
      console.warn('[reports] target_club_id column probe failed; assuming column absent:', err);
      cachedReportsHasTargetClubId = false;
    }
  }
  return cachedReportsHasTargetClubId;
}

function reportTargetClubIdSelectExpr(hasTargetClubId: boolean): string {
  return hasTargetClubId
    ? 'r.target_club_id as targetClubId'
    : 'CAST(NULL AS INTEGER) as targetClubId';
}

function reportJoinedSelectSql(hasTargetClubId: boolean): string {
  const t = reportTargetClubIdSelectExpr(hasTargetClubId);
  return `
      SELECT 
        r.id,
        r."type",
        r.subject,
        r.message,
        r.sender_id as senderId,
        ${t},
        r.status,
        r.assigned_to as assignedTo,
        r.response,
        DATE_FORMAT(r.response_date, '%Y-%m-%d %H:%i:%s') as responseDate,
        DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(r.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        CONCAT(u.first_name, ' ', u.last_name) as senderName,
        u.email as senderEmail,
        c.name as senderClubName
      FROM reports r
      INNER JOIN users u ON r.sender_id = u.id
      LEFT JOIN club_memberships cm ON u.id = cm.user_id AND cm.status = 'approved'
      LEFT JOIN clubs c ON cm.club_id = c.id`;
}

function reportAccessMetaSelectSql(hasTargetClubId: boolean): string {
  const t = hasTargetClubId
    ? 'target_club_id as targetClubId'
    : 'CAST(NULL AS INTEGER) as targetClubId';
  return `SELECT sender_id as senderId, ${t}, r."type" as type FROM reports r WHERE r.id = ?`;
}

async function leaderOrPresidentSharesClubWithSender(
  staffUserId: number,
  senderId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 AS ok
     FROM club_memberships scm
     WHERE scm.user_id = ?
       AND scm.status = 'approved'
       AND (
         EXISTS (
           SELECT 1 FROM club_memberships lcm
           WHERE lcm.club_id = scm.club_id
             AND lcm.user_id = ?
             AND lcm.role IN ('leader', 'staff')
             AND lcm.status = 'approved'
         )
         OR EXISTS (
           SELECT 1 FROM clubs cl
           WHERE cl.id = scm.club_id AND cl.president_id = ?
         )
       )
     LIMIT 1`,
    [senderId, staffUserId, staffUserId],
  );
  return rows.length > 0;
}

async function leaderOrPresidentForClub(userId: number, clubId: number): Promise<boolean> {
  const [pres] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM clubs WHERE id = ? AND president_id = ? LIMIT 1',
    [clubId, userId],
  );
  if (pres.length > 0) return true;
  const [mem] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 FROM club_memberships
     WHERE club_id = ? AND user_id = ? AND role IN ('leader', 'staff') AND status = 'approved'
     LIMIT 1`,
    [clubId, userId],
  );
  return mem.length > 0;
}

/** True when this user leads a club in DB or is a club president (even if JWT role is still `member`). */
async function userHasClubStaffCapacity(userId: number): Promise<boolean> {
  const [pres] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM clubs WHERE president_id = ? LIMIT 1',
    [userId],
  );
  if (pres.length > 0) return true;
  const [lead] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 FROM club_memberships
     WHERE user_id = ? AND role IN ('leader', 'staff') AND status = 'approved'
     LIMIT 1`,
    [userId],
  );
  return lead.length > 0;
}

type ReportAccessRow = {
  senderId: number;
  targetClubId: number | null;
  type: string;
};

function reportAccessFromRow(row: Record<string, unknown>): ReportAccessRow {
  const tcRaw = pgVal(row, 'targetClubId') ?? pgVal(row, 'target_club_id');
  let targetClubId: number | null = null;
  if (tcRaw != null && tcRaw !== '') {
    const n = Number(tcRaw);
    targetClubId = Number.isFinite(n) && n >= 1 ? n : null;
  }
  return {
    senderId: Number(pgVal(row, 'senderId') ?? pgVal(row, 'senderid')),
    targetClubId,
    type: String(pgVal(row, 'type') ?? '')
      .trim()
      .toLowerCase(),
  };
}

async function canModerateReportRow(
  userId: number | undefined,
  userRole: string | undefined,
  report: ReportAccessRow,
): Promise<boolean> {
  if (jwtRoleNorm(userRole) === 'admin') return true;
  if (userId == null) return false;
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return false;
  if (uid === report.senderId) return true;

  const tid = report.targetClubId != null ? Number(report.targetClubId) : null;
  if (tid != null && Number.isFinite(tid)) {
    return leaderOrPresidentForClub(uid, tid);
  }

  if (!(await userHasClubStaffCapacity(uid))) return false;
  return leaderOrPresidentSharesClubWithSender(uid, report.senderId);
}

async function canReadReport(
  userId: number | undefined,
  userRole: string | undefined,
  report: ReportAccessRow,
): Promise<boolean> {
  if (jwtRoleNorm(userRole) === 'admin') return true;
  const uid = userId != null ? Number(userId) : NaN;
  if (!Number.isFinite(uid)) return false;
  if (uid === report.senderId) return true;
  return canModerateReportRow(userId, userRole, report);
}

async function resolveTargetClubForSender(raw: string, senderId: number): Promise<number> {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw createApiError('กรุณาระบุชมรม', 400, 'REPORT_CLUB_ID_REQUIRED');
  }

  let clubRows: RowDataPacket[];
  if (/^\d+$/.test(trimmed)) {
    const nid = parseInt(trimmed, 10);
    [clubRows] = await pool.execute<RowDataPacket[]>('SELECT id FROM clubs WHERE id = ?', [nid]);
  } else {
    [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM clubs WHERE public_id = ? LIMIT 1',
      [trimmed],
    );
  }

  if (clubRows.length === 0) {
    throw createApiError('ไม่พบชมรม', 404, 'CLUB_NOT_FOUND');
  }

  const clubId = Number((clubRows[0] as Record<string, unknown>).id);
  if (!Number.isFinite(clubId) || clubId < 1) {
    throw createApiError('ไม่พบชมรม', 404, 'CLUB_NOT_FOUND');
  }

  const [mem] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 FROM club_memberships
     WHERE user_id = ? AND club_id = ? AND status = 'approved'
     LIMIT 1`,
    [senderId, clubId],
  );
  if (mem.length === 0) {
    throw createApiError(
      'คุณต้องเป็นสมาชิกชมรมที่อนุมัติแล้วของชมรมที่เลือกจึงจะส่งความคิดเห็นได้',
      403,
      'REPORT_CLUB_MEMBER_REQUIRED',
    );
  }

  return clubId;
}

function normalizeReportType(v: unknown): ReportType {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  const allowed: ReportType[] = [
    'feedback',
    'issue',
    'suggestion',
    'complaint',
    'question',
    'appreciation',
  ];
  return (allowed.includes(s as ReportType) ? s : 'feedback') as ReportType;
}

function mapReportRow(row: Record<string, unknown>): Report {
  const tcRaw = pgVal(row, 'targetClubId') ?? pgVal(row, 'target_club_id');
  let targetClubId: number | null | undefined = undefined;
  if (tcRaw !== undefined && tcRaw !== null && tcRaw !== '') {
    const n = Number(tcRaw);
    targetClubId = Number.isFinite(n) ? n : null;
  } else if (tcRaw === null) {
    targetClubId = null;
  }

  return {
    id: row.id as number,
    type: normalizeReportType(row.type),
    targetClubId,
    subject: row.subject as string,
    message: row.message as string,
    senderId: Number(pgVal(row, 'senderId') ?? pgVal(row, 'senderid')),
    sender: {
      name: (pgVal(row, 'senderName') ?? pgVal(row, 'sendername')) as string,
      email: (pgVal(row, 'senderEmail') ?? pgVal(row, 'senderemail')) as string,
      club: ((pgVal(row, 'senderClubName') ?? pgVal(row, 'senderclubname')) as string | null) || undefined,
    },
    status: row.status as ReportStatus,
    assignedTo: ((pgVal(row, 'assignedTo') ?? pgVal(row, 'assignedto')) as string | null) || undefined,
    response: (row.response as string | null) || undefined,
    responseDate: ((pgVal(row, 'responseDate') ?? pgVal(row, 'responsedate')) as string | null) || undefined,
    createdAt: (pgVal(row, 'createdAt') ?? pgVal(row, 'createdat')) as string,
    updatedAt: (pgVal(row, 'updatedAt') ?? pgVal(row, 'updatedat')) as string,
  };
}

// Get all reports (admin sees all; leader sees scoped; member sees own)
export const getReports = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const userRole = jwtRoleNorm(req.user?.role);
    const { type, status } = req.query;
    const hasTargetClubCol = await reportsTableHasTargetClubId();

    let query = `${reportJoinedSelectSql(hasTargetClubCol)}
      WHERE 1=1
    `;

    const params: unknown[] = [];

    if (userRole === 'admin') {
      // no scope filter
    } else if (userId != null) {
      const scoped =
        userRole === 'leader' ||
        userRole === 'staff' ||
        (await userHasClubStaffCapacity(Number(userId)));
      if (scoped) {
        const uid = Number(userId);
        if (hasTargetClubCol) {
          query += ` AND (
        r.sender_id = ?
        OR (
          r.target_club_id IS NOT NULL
          AND (
            EXISTS (
              SELECT 1 FROM club_memberships lcm
              WHERE lcm.club_id = r.target_club_id
                AND lcm.user_id = ?
                AND lcm.role IN ('leader', 'staff')
                AND lcm.status = 'approved'
            )
            OR EXISTS (
              SELECT 1 FROM clubs cl
              WHERE cl.id = r.target_club_id
                AND cl.president_id = ?
            )
          )
        )
        OR (
          r.target_club_id IS NULL
          AND (
            EXISTS (
              SELECT 1 FROM club_memberships scm
              INNER JOIN club_memberships lcm ON lcm.club_id = scm.club_id
                AND lcm.user_id = ?
                AND lcm.role IN ('leader', 'staff')
                AND lcm.status = 'approved'
              WHERE scm.user_id = r.sender_id AND scm.status = 'approved'
            )
            OR EXISTS (
              SELECT 1 FROM club_memberships scm
              INNER JOIN clubs cl ON cl.id = scm.club_id AND cl.president_id = ?
              WHERE scm.user_id = r.sender_id AND scm.status = 'approved'
            )
          )
        )
      )`;
          params.push(uid, uid, uid, uid, uid);
        } else {
          query += ` AND (
        r.sender_id = ?
        OR (
          EXISTS (
            SELECT 1 FROM club_memberships scm
            INNER JOIN club_memberships lcm ON lcm.club_id = scm.club_id
              AND lcm.user_id = ?
              AND lcm.role IN ('leader', 'staff')
              AND lcm.status = 'approved'
            WHERE scm.user_id = r.sender_id AND scm.status = 'approved'
          )
          OR EXISTS (
            SELECT 1 FROM club_memberships scm
            INNER JOIN clubs cl ON cl.id = scm.club_id AND cl.president_id = ?
            WHERE scm.user_id = r.sender_id AND scm.status = 'approved'
          )
        )
      )`;
          params.push(uid, uid, uid);
        }
      } else {
        query += ' AND r.sender_id = ?';
        params.push(userId);
      }
    } else {
      throw createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED');
    }

    // Filter by type
    if (type && typeof type === 'string') {
      query += ' AND r."type" = ?';
      params.push(type);
    }

    // Filter by status
    if (status && typeof status === 'string') {
      query += ' AND r.status = ?';
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC';

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    const reports: Report[] = rows.map((row: any) => mapReportRow(row as Record<string, unknown>));

    res.json({
      success: true,
      reports,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single report
export const getReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const reportId = parseInt(req.params.id);
    const userId = req.user?.userId;
    const userRole = jwtRoleNorm(req.user?.role);
    const hasTargetClubCol = await reportsTableHasTargetClubId();

    const query = `${reportJoinedSelectSql(hasTargetClubCol)}
      WHERE r.id = ?
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [reportId]);

    if (rows.length === 0) {
      throw createApiError('ไม่พบรายงาน', 404, 'REPORT_NOT_FOUND');
    }

    const row = rows[0] as Record<string, unknown>;
    const access = reportAccessFromRow(row);
    const canRead = await canReadReport(userId, userRole, access);

    if (!canRead) {
      throw createApiError('ไม่มีสิทธิ์เข้าถึงรายงานนี้', 403, 'REPORT_ACCESS_DENIED');
    }

    const report: Report = mapReportRow(row);

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    next(error);
  }
};

async function nextReportsPrimaryKey(): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT COALESCE(MAX(id), 0) + 1 AS nid FROM reports',
  );
  const row0 = rows[0] as Record<string, unknown> | undefined;
  if (!row0) return 1;
  const nid = Number(pgVal(row0, 'nid'));
  return Number.isFinite(nid) && nid >= 1 ? nid : 1;
}

// Create a new report
export const createReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const rawUserId = req.user?.userId;
    const senderId =
      typeof rawUserId === 'number' ? rawUserId : Number(rawUserId);
    if (!req.user?.userId || !Number.isFinite(senderId) || senderId < 1) {
      throw createApiError('กรุณาเข้าสู่ระบบ', 401, 'AUTH_REQUIRED');
    }

    const body = req.body as CreateReportRequest & { targetClubPublicId?: unknown };
    const { type, subject, message } = body;
    const rawTargetClub =
      typeof body.targetClubPublicId === 'string' ? body.targetClubPublicId.trim() : '';

    if (!type || !subject || !message) {
      throw createApiError('กรุณากรอกประเภท หัวข้อ และข้อความ', 400, 'REPORT_FIELDS_REQUIRED');
    }

    let targetClubId: number | null = null;
    const typeStr = String(type);

    const hasTargetClubCol = await reportsTableHasTargetClubId();

    if (FEEDBACK_TYPES_REQUIRING_TARGET_CLUB.has(typeStr)) {
      if (!rawTargetClub) {
        throw createApiError('กรุณาระบุชมรมเป้าหมายสำหรับประเภทความคิดเห็นนี้', 400, 'REPORT_TARGET_CLUB_REQUIRED');
      }
      const resolvedClubId = await resolveTargetClubForSender(rawTargetClub, senderId);
      if (!hasTargetClubCol) {
        console.warn(
          '[reports] Column reports.target_club_id is missing; saving feedback without club routing. Apply backend/.sql/postgres/reports_add_target_club_id.sql when possible.',
        );
        targetClubId = null;
      } else {
        targetClubId = resolvedClubId;
      }
    } else if (rawTargetClub) {
      const resolvedClubId = await resolveTargetClubForSender(rawTargetClub, senderId);
      if (!hasTargetClubCol) {
        console.warn(
          '[reports] Column reports.target_club_id is missing; omitting target club on insert.',
        );
        targetClubId = null;
      } else {
        targetClubId = resolvedClubId;
      }
    }

    const insertSql = hasTargetClubCol
      ? `
      INSERT INTO reports (id, "type", subject, message, sender_id, target_club_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      : `
      INSERT INTO reports (id, "type", subject, message, sender_id)
      VALUES (?, ?, ?, ?, ?)
    `;

    let newId = 0;
    let insertResult: ResultSetHeader | undefined;

    for (let attempt = 0; attempt < 6; attempt++) {
      const candidateId = await nextReportsPrimaryKey();
      try {
        const insertParams = hasTargetClubCol
          ? [candidateId, type, subject, message, senderId, targetClubId]
          : [candidateId, type, subject, message, senderId];
        const [r] = await pool.execute<ResultSetHeader>(insertSql, insertParams);
        insertResult = r;
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
      throw createApiError('สร้างรายงานไม่สำเร็จ (ไม่พบรหัสจากฐานข้อมูล)', 500, 'REPORT_CREATE_NO_ID');
    }

    // Fetch created report
    const [rows] = await pool.execute<RowDataPacket[]>(
      `${reportJoinedSelectSql(hasTargetClubCol)}
      WHERE r.id = ?`,
      [newId]
    );

    if (!rows.length) {
      throw createApiError(
        'สร้างรายงานแล้วแต่โหลดข้อมูลไม่สำเร็จ ตรวจสอบ search_path และตาราง reports',
        500,
        'REPORT_LOAD_AFTER_CREATE_FAILED',
      );
    }

    const row = rows[0] as Record<string, unknown>;
    const report: Report = mapReportRow(row);

    res.status(201).json({
      success: true,
      message: 'สร้างรายงานสำเร็จ',
      report,
    });
  } catch (error) {
    next(error);
  }
};

// Update report status (admin / club leaders for their clubs)
export const updateReportStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const reportId = parseInt(req.params.id);
    const userId = req.user?.userId;
    const userRole = jwtRoleNorm(req.user?.role);
    const { status, assignedTo }: UpdateReportStatusRequest = req.body;
    const hasTargetClubCol = await reportsTableHasTargetClubId();

    const [prevRows] = await pool.execute<RowDataPacket[]>(
      reportAccessMetaSelectSql(hasTargetClubCol),
      [reportId],
    );
    if (prevRows.length === 0) {
      throw createApiError('ไม่พบรายงาน', 404, 'REPORT_NOT_FOUND');
    }
    const row0 = prevRows[0] as Record<string, unknown>;
    const allowed = await canModerateReportRow(
      Number(userId),
      userRole,
      reportAccessFromRow(row0),
    );
    if (!allowed) {
      throw createApiError('ไม่มีสิทธิ์อัปเดตรายงานนี้', 403, 'REPORT_MODERATE_DENIED');
    }

    if (!status) {
      throw createApiError('กรุณาระบุสถานะ', 400, 'REPORT_STATUS_REQUIRED');
    }

    const query = `
      UPDATE reports
      SET status = ?, assigned_to = ?
      WHERE id = ?
    `;

    await pool.execute(query, [status, assignedTo || null, reportId]);

    // Fetch updated report
    const [rows] = await pool.execute<RowDataPacket[]>(
      `${reportJoinedSelectSql(hasTargetClubCol)}
      WHERE r.id = ?`,
      [reportId]
    );

    if (rows.length === 0) {
      throw createApiError('ไม่พบรายงาน', 404, 'REPORT_NOT_FOUND');
    }

    const row = rows[0] as Record<string, unknown>;
    const report: Report = mapReportRow(row);

    res.json({
      success: true,
      message: 'อัปเดตสถานะรายงานสำเร็จ',
      report,
    });
  } catch (error) {
    next(error);
  }
};

// Update report response (admin / club leaders for their clubs)
export const updateReportResponse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const reportId = parseInt(req.params.id);
    const userId = req.user?.userId;
    const userRole = jwtRoleNorm(req.user?.role);
    const { response }: UpdateReportResponseRequest = req.body;
    const hasTargetClubCol = await reportsTableHasTargetClubId();

    const [prevRows] = await pool.execute<RowDataPacket[]>(
      reportAccessMetaSelectSql(hasTargetClubCol),
      [reportId],
    );
    if (prevRows.length === 0) {
      throw createApiError('ไม่พบรายงาน', 404, 'REPORT_NOT_FOUND');
    }
    const row0 = prevRows[0] as Record<string, unknown>;
    const allowed = await canModerateReportRow(
      Number(userId),
      userRole,
      reportAccessFromRow(row0),
    );
    if (!allowed) {
      throw createApiError('ไม่มีสิทธิ์ตอบรายงานนี้', 403, 'REPORT_RESPONSE_DENIED');
    }

    if (!response) {
      throw createApiError('กรุณากรอกคำตอบ', 400, 'REPORT_RESPONSE_REQUIRED');
    }

    const query = `
      UPDATE reports
      SET response = ?, response_date = NOW(), status = 'resolved'
      WHERE id = ?
    `;

    await pool.execute(query, [response, reportId]);

    // Fetch updated report
    const [rows] = await pool.execute<RowDataPacket[]>(
      `${reportJoinedSelectSql(hasTargetClubCol)}
      WHERE r.id = ?`,
      [reportId]
    );

    if (rows.length === 0) {
      throw createApiError('ไม่พบรายงาน', 404, 'REPORT_NOT_FOUND');
    }

    const row = rows[0] as Record<string, unknown>;
    const report: Report = mapReportRow(row);

    res.json({
      success: true,
      message: 'บันทึกคำตอบรายงานสำเร็จ',
      report,
    });
  } catch (error) {
    next(error);
  }
};

// Get report statistics (admin only)
export const getReportStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userRole = jwtRoleNorm(req.user?.role);

    if (userRole !== 'admin') {
      throw createApiError('เฉพาะผู้ดูแลระบบเท่านั้น', 403, 'REPORT_ADMIN_ONLY');
    }

    const hasTargetClubCol = await reportsTableHasTargetClubId();

    // Get total count
    const [totalRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM reports'
    );
    const total = totalRows[0].total;

    // Get count by type
    const [typeRows] = await pool.execute<RowDataPacket[]>(
      `SELECT reports."type" as type, COUNT(*) as count 
       FROM reports 
       GROUP BY reports."type"`
    );
    const byType: Record<string, number> = {};
    typeRows.forEach((row: any) => {
      byType[row.type] = row.count;
    });

    // Get count by status
    const [statusRows] = await pool.execute<RowDataPacket[]>(
      `SELECT status, COUNT(*) as count 
       FROM reports 
       GROUP BY status`
    );
    const byStatus: Record<string, number> = {};
    statusRows.forEach((row: any) => {
      byStatus[row.status] = row.count;
    });

    // Get recent reports
    const [recentRows] = await pool.execute<RowDataPacket[]>(
      `${reportJoinedSelectSql(hasTargetClubCol)}
      ORDER BY r.created_at DESC
      LIMIT 10`
    );

    const recentReports: Report[] = recentRows.map((row: any) => mapReportRow(row as Record<string, unknown>));

    const stats: ReportStats = {
      total,
      byType: byType as any,
      byStatus: byStatus as any,
      recentReports,
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

