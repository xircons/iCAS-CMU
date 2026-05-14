import { Response, NextFunction } from 'express';
import pool from '../../../config/database';
import type { RowDataPacket, ResultSetHeader } from '../../../types/db';
import { ApiError, createApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import { CreateDocumentRequest, UpdateDocumentRequest, UpdateDocumentStatusRequest, UpdateMemberSubmissionStatusRequest, ReviewSubmissionRequest, SmartDocument, DocumentAssignment, BulkUpdateStatusRequest, BulkAssignRequest, BulkDeleteRequest, BulkExportRequest } from '../types/document';
import { pgVal } from '../../../utils/pgRowHelpers';
import path from 'path';
import fs from 'fs';
import { deleteFile } from '../utils/fileUpload';
import { clubDbIdFromRequest } from '../../assignment/middleware/assignmentMiddleware';

type PoolConnection = Awaited<ReturnType<typeof pool.getConnection>>;

/** Postgres after pgloader: smart_documents.id may have no DEFAULT (23502). */
async function nextSmartDocumentPrimaryKeyFromConn(conn: PoolConnection): Promise<number> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    'SELECT COALESCE(MAX(id), 0) + 1 AS nid FROM smart_documents',
  );
  const row0 = rows[0] as Record<string, unknown> | undefined;
  if (!row0) return 1;
  const nid = Number(pgVal(row0, 'nid'));
  return Number.isFinite(nid) && nid >= 1 ? nid : 1;
}

/** document_assignments.id may have no DEFAULT after migration (23502). */
async function nextDocumentAssignmentPrimaryKey(): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT COALESCE(MAX(id), 0) + 1 AS nid FROM document_assignments',
  );
  const row0 = rows[0] as Record<string, unknown> | undefined;
  if (!row0) return 1;
  const nid = Number(pgVal(row0, 'nid'));
  return Number.isFinite(nid) && nid >= 1 ? nid : 1;
}

async function nextDocumentAssignmentPrimaryKeyFromConn(conn: PoolConnection): Promise<number> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    'SELECT COALESCE(MAX(id), 0) + 1 AS nid FROM document_assignments',
  );
  const row0 = rows[0] as Record<string, unknown> | undefined;
  if (!row0) return 1;
  const nid = Number(pgVal(row0, 'nid'));
  return Number.isFinite(nid) && nid >= 1 ? nid : 1;
}

const PG_PRIORITIES = new Set(['Low', 'Medium', 'High']);
const PG_TYPES = new Set(['Report', 'Checklist', 'Request Form', 'Contract', 'Letter', 'Other']);

/** Map UI / stray values to Postgres `smart_documents_priority` enum labels. */
function normalizeSmartDocPriority(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (PG_PRIORITIES.has(s)) return s;
  const th: Record<string, string> = {
    ต่ำ: 'Low',
    ปานกลาง: 'Medium',
    สูง: 'High',
  };
  return th[s] || 'Medium';
}

/** Map UI / stray values to Postgres `smart_documents_type` enum labels. */
function normalizeSmartDocType(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (PG_TYPES.has(s)) return s;
  const th: Record<string, string> = {
    รายงาน: 'Report',
    'รายการตรวจสอบ': 'Checklist',
    'แบบฟอร์มคำขอ': 'Request Form',
    สัญญา: 'Contract',
    จดหมาย: 'Letter',
    'อื่นๆ': 'Other',
  };
  return th[s] || 'Report';
}

/**
 * YYYY-MM-DD for Postgres `date`. Accepts ISO prefixes, dd/mm/yyyy (optional Buddhist year >= 2400 → -543).
 */
function normalizeSmartDocDueDate(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) {
    throw createApiError('Due date is required', 400);
  }
  const strictIso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (strictIso) {
    return s;
  }
  const isoPrefix = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (isoPrefix) {
    return isoPrefix[1];
  }
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (slash) {
    const d = Number(slash[1]);
    const m = Number(slash[2]);
    let y = Number(slash[3]);
    if (y >= 2400) {
      y -= 543;
    }
    if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y) || d < 1 || d > 31 || m < 1 || m > 12) {
      throw createApiError('Invalid due date', 400);
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const t = Date.parse(s);
  if (!Number.isFinite(t)) {
    throw createApiError('Invalid due date', 400);
  }
  return new Date(t).toISOString().slice(0, 10);
}

/** node-pg lowercases unquoted SQL aliases; normalize for JSON consumers. */
function mapSmartDocumentMainFields(
  raw: Record<string, unknown>,
  opts?: { clubPublicId?: string },
): Record<string, unknown> {
  const dueRaw =
    pgVal(raw, 'dueDate') ??
    pgVal(raw, 'duedate') ??
    pgVal(raw, 'due_date');
  const dueStr = dueRaw != null && String(dueRaw) !== '' ? String(dueRaw).slice(0, 10) : '';
  const fromRow = String(
    pgVal(raw, 'clubPublicId') ?? pgVal(raw, 'clubpublicid') ?? pgVal(raw, 'publicId') ?? '',
  ).trim();
  const clubPublicId = (opts?.clubPublicId ?? fromRow) || undefined;
  return {
    id: Number(pgVal(raw, 'id') ?? raw.id),
    clubId: Number(pgVal(raw, 'clubId') ?? pgVal(raw, 'clubid') ?? 0),
    title: String(pgVal(raw, 'title') ?? ''),
    description: String(pgVal(raw, 'description') ?? ''),
    priority: String(pgVal(raw, 'priority') ?? 'Medium'),
    type: String(pgVal(raw, 'type') ?? 'Report'),
    templatePath: (pgVal(raw, 'templatePath') ?? pgVal(raw, 'templatepath')) as string | undefined,
    dueDate: dueStr,
    status: String(pgVal(raw, 'status') ?? 'Open'),
    createdBy: Number(pgVal(raw, 'createdBy') ?? pgVal(raw, 'createdby') ?? 0),
    createdAt: String(pgVal(raw, 'createdAt') ?? pgVal(raw, 'createdat') ?? ''),
    updatedAt: String(pgVal(raw, 'updatedAt') ?? pgVal(raw, 'updatedat') ?? ''),
    clubName: String(
      pgVal(raw, 'clubName') ?? pgVal(raw, 'clubname') ?? pgVal(raw, 'club_name') ?? '',
    ),
    creatorFirstName: (pgVal(raw, 'creatorFirstName') ?? pgVal(raw, 'creatorfirstname')) as string | undefined,
    creatorLastName: (pgVal(raw, 'creatorLastName') ?? pgVal(raw, 'creatorlastname')) as string | undefined,
    ...(clubPublicId ? { clubPublicId } : {}),
  };
}

function mapDocumentAssignmentMemberRow(raw: Record<string, unknown>) {
  const uid =
    pgVal(raw, 'userId') ??
    pgVal(raw, 'userid') ??
    pgVal(raw, 'user_id');
  const fn =
    pgVal(raw, 'userFirstName') ??
    pgVal(raw, 'userfirstname') ??
    pgVal(raw, 'first_name') ??
    pgVal(raw, 'firstname');
  const ln =
    pgVal(raw, 'userLastName') ??
    pgVal(raw, 'userlastname') ??
    pgVal(raw, 'last_name') ??
    pgVal(raw, 'lastname');
  const subAt = pgVal(raw, 'submittedAt') ?? pgVal(raw, 'submittedat') ?? pgVal(raw, 'submitted_at');
  const fs = pgVal(raw, 'fileSize') ?? pgVal(raw, 'filesize') ?? pgVal(raw, 'file_size');
  return {
    userId: Number(uid),
    firstName: fn != null ? String(fn) : '',
    lastName: ln != null ? String(ln) : '',
    avatar: (pgVal(raw, 'userAvatar') ??
      pgVal(raw, 'useravatar') ??
      pgVal(raw, 'avatar')) as string | undefined,
    role: (pgVal(raw, 'userRole') ?? pgVal(raw, 'userrole') ?? pgVal(raw, 'role')) as string | undefined,
    submissionStatus: String(
      pgVal(raw, 'submissionStatus') ??
        pgVal(raw, 'submissionstatus') ??
        pgVal(raw, 'submission_status') ??
        'Not Submitted',
    ),
    filePath: (pgVal(raw, 'filePath') ?? pgVal(raw, 'filepath') ?? pgVal(raw, 'file_path')) as
      | string
      | undefined,
    fileName: (pgVal(raw, 'fileName') ?? pgVal(raw, 'filename') ?? pgVal(raw, 'file_name')) as
      | string
      | undefined,
    fileSize: fs != null && fs !== '' ? Number(fs) : undefined,
    fileMimeType: (pgVal(raw, 'fileMimeType') ??
      pgVal(raw, 'filemimetype') ??
      pgVal(raw, 'file_mime_type')) as string | undefined,
    submittedAt: subAt ? new Date(String(subAt)) : undefined,
    adminComment: (pgVal(raw, 'adminComment') ??
      pgVal(raw, 'admincomment') ??
      pgVal(raw, 'admin_comment')) as string | undefined,
  };
}

type DocumentAssignmentMemberPayload = ReturnType<typeof mapDocumentAssignmentMemberRow>;

/** Hide per-assignee file metadata for everyone except global admins (and each user on their own row). */
function redactOtherAssigneesSubmissionPayload(
  members: DocumentAssignmentMemberPayload[],
  viewerUserId: number | undefined,
  viewerIsGlobalAdmin: boolean,
): DocumentAssignmentMemberPayload[] {
  if (viewerIsGlobalAdmin || !viewerUserId) {
    return members;
  }
  return members.map((m) => {
    if (m.userId === viewerUserId) {
      return m;
    }
    return {
      ...m,
      filePath: undefined,
      fileName: undefined,
      fileSize: undefined,
      fileMimeType: undefined,
      submittedAt: undefined,
      adminComment: undefined,
    };
  });
}

function mapTemplateRow(row: Record<string, unknown>) {
  const r = row;
  const rawPublic = pgVal(r, 'isPublic') ?? pgVal(r, 'ispublic') ?? pgVal(r, 'is_public');
  return {
    id: r.id as number,
    name: r.name as string,
    description: (r.description as string | null) || '',
    category: r.category as string,
    filePath: (pgVal(r, 'filePath') ?? pgVal(r, 'filepath') ?? pgVal(r, 'file_path')) as string,
    clubId: (pgVal(r, 'clubId') ?? pgVal(r, 'clubid') ?? pgVal(r, 'club_id')) as number | undefined || undefined,
    clubName: (pgVal(r, 'clubName') ?? pgVal(r, 'clubname')) as string | undefined || undefined,
    createdBy: Number(pgVal(r, 'createdBy') ?? pgVal(r, 'createdby') ?? pgVal(r, 'created_by')),
    creatorFirstName: (pgVal(r, 'creatorFirstName') ?? pgVal(r, 'creatorfirstname')) as string | undefined,
    creatorLastName: (pgVal(r, 'creatorLastName') ?? pgVal(r, 'creatorlastname')) as string | undefined,
    createdAt: pgVal(r, 'createdAt') ?? pgVal(r, 'createdat') ?? pgVal(r, 'created_at'),
    updatedAt: pgVal(r, 'updatedAt') ?? pgVal(r, 'updatedat') ?? pgVal(r, 'updated_at'),
    tags: r.tags ? JSON.parse(r.tags as string) : [],
    isPublic: rawPublic === true || rawPublic === 1,
  };
}

// Get all documents for a club
export const getClubDocuments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = clubDbIdFromRequest(req);
    const userId = req.user?.userId;

    // Check if user is a leader or admin of this club
    const isAdmin = req.user?.role === 'admin';
    
    // Check if user is president of the club
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT president_id FROM clubs WHERE id = ?',
      [clubId]
    );
    const isPresident = clubRows.length > 0 && clubRows[0].president_id === userId;
    
    // Check if user has leader role in membership
    let isLeader = false;
    if (userId) {
      const [membershipRows] = await pool.execute<RowDataPacket[]>(
        'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
        [userId, clubId, 'approved']
      );
      const hasLeaderMembership = membershipRows.length > 0 && membershipRows[0].role === 'leader';
      isLeader = isPresident || hasLeaderMembership;
    }

    if (!isLeader && !isAdmin) {
      throw createApiError('Only club leaders can view documents', 403);
    }

    // Get all documents for the club
    const query = `
      SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName,
        c.public_id as clubPublicId,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      LEFT JOIN users u ON sd.created_by = u.id
      WHERE sd.club_id = ?
        AND sd.archived_at IS NULL
      ORDER BY sd.due_date DESC, sd.created_at DESC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [clubId]);

    // Get assignments for each document
    const documentsWithAssignments = await Promise.all(
      rows.map(async (raw: RowDataPacket) => {
        const docBase = mapSmartDocumentMainFields(raw as Record<string, unknown>, {
          clubPublicId: req.clubPublicId,
        });
        const [assignmentRows] = await pool.execute<RowDataPacket[]>(
          `SELECT 
            da.id,
            da.document_id as documentId,
            da.user_id as userId,
            da.status,
            da.submission_status as submissionStatus,
            da.file_path as filePath,
            da.file_name as fileName,
            da.file_size as fileSize,
            da.file_mime_type as fileMimeType,
            DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
            da.admin_comment as adminComment,
            DATE_FORMAT(da.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
            DATE_FORMAT(da.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
            u.first_name as userFirstName,
            u.last_name as userLastName,
            u.email as userEmail,
            u.avatar as userAvatar,
            cm.role as userRole
          FROM document_assignments da
          JOIN users u ON da.user_id = u.id
          LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
          WHERE da.document_id = ?
          ORDER BY da.created_at ASC`,
          [clubId, docBase.id]
        );

        const assignedMembers = assignmentRows.map((row) =>
          mapDocumentAssignmentMemberRow(row as Record<string, unknown>),
        );

        const assignedMemberIds = assignedMembers.map((m) => m.userId);
        const assignedMembersResponse = redactOtherAssigneesSubmissionPayload(
          assignedMembers,
          userId,
          isAdmin,
        );

        // Compute overdue status
        const dueDate = new Date(String(docBase.dueDate));
        const isOverdue = dueDate < new Date() && docBase.status !== 'Completed';

        return {
          ...docBase,
          assignedMemberIds,
          assignedMembers: assignedMembersResponse,
          isOverdue,
        };
      })
    );

    res.json({
      success: true,
      documents: documentsWithAssignments,
    });
  } catch (error: any) {
    console.error('Error in getClubDocuments:', error);
    next(error);
  }
};

// Get a single document
export const getDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const clubId = clubDbIdFromRequest(req);
    const userId = req.user?.userId;

    if (!userId) {
      throw createApiError('User not authenticated', 401);
    }

    // Check if user is admin or leader
    const isAdmin = req.user?.role === 'admin';
    
    // Check if user is president of the club
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT president_id FROM clubs WHERE id = ?',
      [clubId]
    );
    const isPresident = clubRows.length > 0 && clubRows[0].president_id === userId;
    
    // Check if user has leader role in membership
    let isLeader = false;
    if (userId) {
      const [membershipRows] = await pool.execute<RowDataPacket[]>(
        'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
        [userId, clubId, 'approved']
      );
      const hasLeaderMembership = membershipRows.length > 0 && membershipRows[0].role === 'leader';
      isLeader = isPresident || hasLeaderMembership;
    }

    const query = `
      SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName,
        c.public_id as clubPublicId,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      LEFT JOIN users u ON sd.created_by = u.id
      WHERE sd.id = ? AND sd.club_id = ? AND sd.archived_at IS NULL
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [documentId, clubId]);

    if (rows.length === 0) {
      throw createApiError('Document not found', 404);
    }

    const main = mapSmartDocumentMainFields(rows[0] as Record<string, unknown>, {
      clubPublicId: req.clubPublicId,
    });

    // For members (non-leaders), check if they're assigned to this document
    if (!isLeader && !isAdmin) {
      const [assignmentCheck] = await pool.execute<RowDataPacket[]>(
        'SELECT user_id FROM document_assignments WHERE document_id = ? AND user_id = ?',
        [documentId, userId]
      );

      if (assignmentCheck.length === 0) {
        throw createApiError('You do not have access to this document', 403);
      }
    }

    // Get assignments
    // For members, only show their own assignment; for leaders/admins, show all
    let assignmentRows: RowDataPacket[];
    if (isLeader || isAdmin) {
      [assignmentRows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
          da.id,
          da.document_id as documentId,
          da.user_id as userId,
          da.status,
          da.submission_status as submissionStatus,
          da.file_path as filePath,
          da.file_name as fileName,
          da.file_size as fileSize,
          da.file_mime_type as fileMimeType,
          DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
          da.admin_comment as adminComment,
          DATE_FORMAT(da.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
          DATE_FORMAT(da.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
          u.first_name as userFirstName,
          u.last_name as userLastName,
          u.email as userEmail,
          u.avatar as userAvatar,
          cm.role as userRole
        FROM document_assignments da
        JOIN users u ON da.user_id = u.id
        LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
        WHERE da.document_id = ?
        ORDER BY da.created_at ASC`,
        [clubId, documentId]
      );
    } else {
      // For members, only get their own assignment
      [assignmentRows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
          da.id,
          da.document_id as documentId,
          da.user_id as userId,
          da.status,
          da.submission_status as submissionStatus,
          da.file_path as filePath,
          da.file_name as fileName,
          da.file_size as fileSize,
          da.file_mime_type as fileMimeType,
          DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
          da.admin_comment as adminComment,
          DATE_FORMAT(da.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
          DATE_FORMAT(da.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
          u.first_name as userFirstName,
          u.last_name as userLastName,
          u.email as userEmail,
          u.avatar as userAvatar,
          cm.role as userRole
        FROM document_assignments da
        JOIN users u ON da.user_id = u.id
        LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
        WHERE da.document_id = ? AND da.user_id = ?
        ORDER BY da.created_at ASC`,
        [clubId, documentId, userId]
      );
    }

    const assignedMembers = assignmentRows.map((row) =>
      mapDocumentAssignmentMemberRow(row as Record<string, unknown>),
    );

    const assignedMemberIds = assignedMembers.map((m) => m.userId);
    const assignedMembersResponse = redactOtherAssigneesSubmissionPayload(
      assignedMembers,
      userId,
      isAdmin,
    );

    // Compute overdue status
    const dueDate = new Date(String(main.dueDate));
    const isOverdue = dueDate < new Date() && main.status !== 'Completed';

    res.json({
      success: true,
      document: {
        ...main,
        assignedMemberIds,
        assignedMembers: assignedMembersResponse,
        isOverdue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get documents assigned to the current user (member access)
export const getMemberAssignedDocuments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = clubDbIdFromRequest(req);
    const userId = req.user?.userId;

    if (!userId) {
      throw createApiError('User not authenticated', 401);
    }

    // Verify user is a member of the club and get user info
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      `SELECT cm.role, u.first_name, u.last_name, u.avatar 
       FROM club_memberships cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.user_id = ? AND cm.club_id = ? AND cm.status = ?`,
      [userId, clubId, 'approved']
    );

    if (membershipRows.length === 0) {
      throw createApiError('User is not a member of this club', 403);
    }

    const userInfo = membershipRows[0] as Record<string, unknown>;

    // Get documents assigned to this user
    const query = `
      SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName,
        c.public_id as clubPublicId,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName,
        da.submission_status as submissionStatus,
        da.file_path as filePath,
        da.file_name as fileName,
        da.file_size as fileSize,
        da.file_mime_type as fileMimeType,
        DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
        da.admin_comment as adminComment
      FROM smart_documents sd
      INNER JOIN document_assignments da ON sd.id = da.document_id
      LEFT JOIN clubs c ON sd.club_id = c.id
      LEFT JOIN users u ON sd.created_by = u.id
      WHERE sd.club_id = ? AND da.user_id = ? AND sd.archived_at IS NULL
      ORDER BY sd.due_date ASC, sd.created_at DESC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [clubId, userId]);

    // Process documents with user's submission info
    const documents = rows.map((raw) => {
      const row = raw as Record<string, unknown>;
      const main = mapSmartDocumentMainFields(row, { clubPublicId: req.clubPublicId });
      const assignedMember = {
        userId: userId!,
        firstName: String(pgVal(userInfo, 'first_name') ?? pgVal(userInfo, 'firstname') ?? ''),
        lastName: String(pgVal(userInfo, 'last_name') ?? pgVal(userInfo, 'lastname') ?? ''),
        avatar: (pgVal(userInfo, 'avatar')) as string | undefined,
        role: (pgVal(userInfo, 'role')) as string | undefined,
        submissionStatus: String(
          pgVal(row, 'submissionStatus') ?? pgVal(row, 'submissionstatus') ?? 'Not Submitted',
        ),
        filePath: (pgVal(row, 'filePath') ?? pgVal(row, 'filepath')) as string | undefined,
        fileName: (pgVal(row, 'fileName') ?? pgVal(row, 'filename')) as string | undefined,
        fileSize: (() => {
          const fs = pgVal(row, 'fileSize') ?? pgVal(row, 'filesize');
          return fs != null && fs !== '' ? Number(fs) : undefined;
        })(),
        fileMimeType: (pgVal(row, 'fileMimeType') ?? pgVal(row, 'filemimetype')) as string | undefined,
        submittedAt: (() => {
          const subAt = pgVal(row, 'submittedAt') ?? pgVal(row, 'submittedat');
          return subAt ? new Date(String(subAt)) : undefined;
        })(),
        adminComment: (pgVal(row, 'adminComment') ?? pgVal(row, 'admincomment')) as string | undefined,
      };

      // Compute overdue status
      const dueDate = new Date(String(main.dueDate));
      const isOverdue = dueDate < new Date() && main.status !== 'Completed';

      return {
        ...main,
        assignedMemberIds: [userId!],
        assignedMembers: [assignedMember],
        isOverdue,
      };
    });

    res.json({
      success: true,
      documents: documents,
    });
  } catch (error: any) {
    console.error('Error in getMemberAssignedDocuments:', error);
    next(error);
  }
};

// Create a new document (admin only)
export const createDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = clubDbIdFromRequest(req);
    const userId = req.user?.userId;
    if (!Number.isFinite(userId) || !userId || userId < 1) {
      throw createApiError('Unauthorized', 401);
    }

    const { title, description, priority, type, dueDate, assignedMemberIds, templatePath }: CreateDocumentRequest =
      req.body;

    // Validate required fields
    if (!title || !description || !dueDate) {
      throw createApiError('Title, description, and due date are required', 400);
    }

    if (!assignedMemberIds || assignedMemberIds.length === 0) {
      throw createApiError('At least one member must be assigned', 400);
    }

    const memberIds = assignedMemberIds
      .map((id: unknown) => Number(id))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (memberIds.length === 0) {
      throw createApiError('At least one member must be assigned', 400);
    }

    const dueDateSql = normalizeSmartDocDueDate(dueDate);
    const prioritySql = normalizeSmartDocPriority(priority);
    const typeSql = normalizeSmartDocType(type);

    // Validate due date is not in the past (local calendar date)
    const [yy, mm, dd] = dueDateSql.split('-').map((x) => Number(x));
    const due = new Date(yy, mm - 1, dd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due < today) {
      throw createApiError('Due date cannot be in the past', 400);
    }

    // Insert document + assignments in one transaction (no orphan doc rows on assignment failure)
    const insertQuery = `
      INSERT INTO smart_documents
      (id, club_id, title, description, priority, type, template_path, due_date, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?)
    `;
    const assignmentInsertQuery = `
      INSERT INTO document_assignments (id, document_id, user_id, status, submission_status, created_at, updated_at)
      VALUES (?, ?, ?, 'Open', 'Not Submitted', NOW(), NOW())
    `;

    let documentId = 0;
    const conn = await pool.getConnection();
    try {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await conn.query('BEGIN');
        try {
          const nextId = await nextSmartDocumentPrimaryKeyFromConn(conn);
          const [result] = await conn.execute<ResultSetHeader>(insertQuery, [
            nextId,
            clubId,
            title,
            description,
            prioritySql,
            typeSql,
            templatePath || null,
            dueDateSql,
            userId,
          ]);
          const ins = Number((result as ResultSetHeader).insertId);
          documentId = Number.isFinite(ins) && ins > 0 ? ins : nextId;

          for (const memberId of memberIds) {
            const assignmentId = await nextDocumentAssignmentPrimaryKeyFromConn(conn);
            await conn.execute(assignmentInsertQuery, [assignmentId, documentId, memberId]);
          }

          await conn.query('COMMIT');
          break;
        } catch (error) {
          try {
            await conn.query('ROLLBACK');
          } catch {
            /* ignore rollback errors (e.g. connection already aborted) */
          }
          const code =
            error && typeof error === 'object' && 'code' in error
              ? String((error as { code?: string }).code)
              : '';
          if ((code === 'ER_DUP_ENTRY' || code === '23505') && attempt < 4) {
            continue;
          }
          throw error;
        }
      }
    } finally {
      conn.release();
    }

    if (!Number.isFinite(documentId) || documentId <= 0) {
      throw createApiError('Document was not created', 500);
    }

    // Fetch the created document with assignments
    const [docRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        DATE_FORMAT(sd.archived_at, '%Y-%m-%d %H:%i:%s') as archivedAt,
        c.name as clubName,
        c.public_id as clubPublicId,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      LEFT JOIN users u ON sd.created_by = u.id
      WHERE sd.id = ? AND sd.archived_at IS NULL`,
      [documentId]
    );

    if (!docRows.length) {
      throw createApiError('Document was created but could not be loaded', 500);
    }

    const main = mapSmartDocumentMainFields(docRows[0] as Record<string, unknown>, {
      clubPublicId: req.clubPublicId,
    });

    // Get assignments
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        da.user_id as userId,
        da.submission_status as submissionStatus,
        da.file_path as filePath,
        da.file_name as fileName,
        da.file_size as fileSize,
        da.file_mime_type as fileMimeType,
        DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
        da.admin_comment as adminComment,
        u.first_name as userFirstName,
        u.last_name as userLastName,
        u.avatar as userAvatar,
        cm.role as userRole
      FROM document_assignments da
      JOIN users u ON da.user_id = u.id
      LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
      WHERE da.document_id = ?`,
      [clubId, documentId]
    );

    const assignedMembers = assignmentRows.map((row) =>
      mapDocumentAssignmentMemberRow(row as Record<string, unknown>),
    );

    const assignedMemberIds_result = assignedMembers.map((m) => m.userId);

    const docDueDate = new Date(String(main.dueDate));
    const isOverdue = docDueDate < new Date() && main.status !== 'Completed';

    res.status(201).json({
      success: true,
      message: 'Document created successfully',
      document: {
        ...main,
        assignedMemberIds: assignedMemberIds_result,
        assignedMembers,
        isOverdue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update a document (leader only)
export const updateDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const clubId = clubDbIdFromRequest(req);
    const viewerUserId = req.user?.userId;
    const viewerIsGlobalAdmin = req.user?.role === 'admin';
    const updates: UpdateDocumentRequest = req.body;

    // Verify document exists
    const [checkRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM smart_documents WHERE id = ? AND club_id = ? AND archived_at IS NULL',
      [documentId, clubId]
    );

    if (checkRows.length === 0) {
      throw createApiError('Document not found', 404);
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(updates.description);
    }
    if (updates.priority !== undefined) {
      updateFields.push('priority = ?');
      updateValues.push(normalizeSmartDocPriority(updates.priority));
    }
    if (updates.type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(normalizeSmartDocType(updates.type));
    }
    if (updates.dueDate !== undefined) {
      updateFields.push('due_date = ?');
      updateValues.push(normalizeSmartDocDueDate(updates.dueDate));
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(updates.status);
    }

    // Update document if there are fields to update
    if (updateFields.length > 0) {
      updateValues.push(documentId);
      const updateQuery = `
        UPDATE smart_documents 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      await pool.execute(updateQuery, updateValues);
    }

    // Update assignments if provided (transaction: no empty assignment set if insert fails)
    if (updates.assignedMemberIds !== undefined) {
      const conn = await pool.getConnection();
      try {
        await conn.query('BEGIN');
        await conn.execute('DELETE FROM document_assignments WHERE document_id = ?', [documentId]);

        if (updates.assignedMemberIds.length > 0) {
          const assignmentInsertQuery = `
            INSERT INTO document_assignments (id, document_id, user_id, status, submission_status, created_at, updated_at)
            VALUES (?, ?, ?, 'Open', 'Not Submitted', NOW(), NOW())
          `;

          const memberIds = updates.assignedMemberIds
            .map((id: unknown) => Number(id))
            .filter((n) => Number.isFinite(n) && n > 0);

          for (const memberId of memberIds) {
            const assignmentId = await nextDocumentAssignmentPrimaryKeyFromConn(conn);
            await conn.execute(assignmentInsertQuery, [assignmentId, documentId, memberId]);
          }
        }

        await conn.query('COMMIT');
      } catch (error) {
        try {
          await conn.query('ROLLBACK');
        } catch {
          /* ignore */
        }
        throw error;
      } finally {
        conn.release();
      }
    }

    // Fetch updated document
    const [docRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName,
        c.public_id as clubPublicId,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      LEFT JOIN users u ON sd.created_by = u.id
      WHERE sd.id = ?`,
      [documentId]
    );

    // Get assignments
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        da.user_id as userId,
        da.submission_status as submissionStatus,
        da.file_path as filePath,
        da.file_name as fileName,
        da.file_size as fileSize,
        da.file_mime_type as fileMimeType,
        DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
        da.admin_comment as adminComment,
        u.first_name as userFirstName,
        u.last_name as userLastName,
        u.avatar as userAvatar,
        cm.role as userRole
      FROM document_assignments da
      JOIN users u ON da.user_id = u.id
      LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
      WHERE da.document_id = ?`,
      [clubId, documentId]
    );

    const assignedMembers = assignmentRows.map((row) =>
      mapDocumentAssignmentMemberRow(row as Record<string, unknown>),
    );

    const assignedMemberIds = assignedMembers.map((m) => m.userId);
    const assignedMembersResponse = redactOtherAssigneesSubmissionPayload(
      assignedMembers,
      viewerUserId,
      viewerIsGlobalAdmin,
    );

    const main = mapSmartDocumentMainFields(docRows[0] as Record<string, unknown>, {
      clubPublicId: req.clubPublicId,
    });
    const dueDate = new Date(String(main.dueDate));
    const isOverdue = dueDate < new Date() && main.status !== 'Completed';

    res.json({
      success: true,
      message: 'Document updated successfully',
      document: {
        ...main,
        assignedMemberIds,
        assignedMembers: assignedMembersResponse,
        isOverdue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update document status (leader only)
export const updateDocumentStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const clubId = clubDbIdFromRequest(req);
    const { status }: UpdateDocumentStatusRequest = req.body;

    // Verify document exists
    const [checkRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM smart_documents WHERE id = ? AND club_id = ? AND archived_at IS NULL',
      [documentId, clubId]
    );

    if (checkRows.length === 0) {
      throw createApiError('Document not found', 404);
    }

    // Update status
    await pool.execute(
      'UPDATE smart_documents SET status = ? WHERE id = ?',
      [status, documentId]
    );

    // Fetch updated document
    const [docRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        DATE_FORMAT(sd.archived_at, '%Y-%m-%d %H:%i:%s') as archivedAt,
        c.name as clubName,
        c.public_id as clubPublicId,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      LEFT JOIN users u ON sd.created_by = u.id
      WHERE sd.id = ? AND sd.archived_at IS NULL`,
      [documentId]
    );

    res.json({
      success: true,
      message: 'Document status updated successfully',
      document: mapSmartDocumentMainFields(docRows[0] as Record<string, unknown>, {
        clubPublicId: req.clubPublicId,
      }),
    });
  } catch (error) {
    next(error);
  }
};

// Archive a document (admin only)
export const archiveDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const clubId = clubDbIdFromRequest(req);

    const [checkRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM smart_documents WHERE id = ? AND club_id = ? AND archived_at IS NULL',
      [documentId, clubId]
    );

    if (checkRows.length === 0) {
      throw createApiError('Document not found', 404);
    }

    await pool.execute(
      'UPDATE smart_documents SET archived_at = NOW() WHERE id = ?',
      [documentId]
    );

    res.json({
      success: true,
      message: 'Document archived successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Delete a document (admin only)
export const deleteDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const clubId = clubDbIdFromRequest(req);

    // Verify document exists
    const [checkRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM smart_documents WHERE id = ? AND club_id = ? AND archived_at IS NULL',
      [documentId, clubId]
    );

    if (checkRows.length === 0) {
      throw createApiError('Document not found', 404);
    }

    // Delete will cascade to document_assignments due to foreign key
    await pool.execute('DELETE FROM smart_documents WHERE id = ?', [documentId]);

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Update member submission status (leader only)
export const updateMemberSubmissionStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = clubDbIdFromRequest(req);
    const documentId = req.params.documentId;
    const userId = req.user?.userId;
    const { userId: memberUserId, submissionStatus }: UpdateMemberSubmissionStatusRequest = req.body;

    if (!userId) {
      throw createApiError('Unauthorized', 401);
    }

    const viewerIsGlobalAdmin = req.user?.role === 'admin';

    // Verify user is leader or admin of the club
    const [leaderRows] = await pool.execute<RowDataPacket[]>(
      `SELECT role FROM club_memberships 
       WHERE user_id = ? AND club_id = ? AND role IN ('leader', 'admin')`,
      [userId, clubId]
    );

    if (leaderRows.length === 0 && req.user?.role !== 'admin') {
      throw createApiError('Only club leaders can update member submission status', 403);
    }

    // Verify document exists and belongs to club
    const [docRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, status FROM smart_documents WHERE id = ? AND club_id = ? AND archived_at IS NULL',
      [documentId, clubId]
    );

    if (docRows.length === 0) {
      throw createApiError('Document not found', 404);
    }

    // Verify assignment exists
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM document_assignments WHERE document_id = ? AND user_id = ?',
      [documentId, memberUserId]
    );

    if (assignmentRows.length === 0) {
      throw createApiError('Member assignment not found', 404);
    }

    // Update submission status
    await pool.execute(
      'UPDATE document_assignments SET submission_status = ? WHERE document_id = ? AND user_id = ?',
      [submissionStatus, documentId, memberUserId]
    );

    // Update document status based on all submissions
    const documentIdNum = parseInt(String(documentId), 10);
    if (isNaN(documentIdNum)) {
      throw createApiError('Invalid document ID', 400);
    }
    await updateDocumentStatusBasedOnSubmissions(documentIdNum);

    // Fetch updated document with assignments
    const [updatedDocRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName,
        c.public_id as clubPublicId,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      LEFT JOIN users u ON sd.created_by = u.id
      WHERE sd.id = ?`,
      [documentId]
    );

    const [updatedAssignmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        da.id,
        da.document_id as documentId,
        da.user_id as userId,
        da.status,
        da.submission_status as submissionStatus,
        da.file_path as filePath,
        da.file_name as fileName,
        da.file_size as fileSize,
        da.file_mime_type as fileMimeType,
        DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
        da.admin_comment as adminComment,
        DATE_FORMAT(da.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(da.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        u.first_name as userFirstName,
        u.last_name as userLastName,
        u.email as userEmail,
        u.avatar as userAvatar,
        cm.role as userRole
      FROM document_assignments da
      JOIN users u ON da.user_id = u.id
      LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
      WHERE da.document_id = ?
      ORDER BY da.created_at ASC`,
      [clubId, documentId]
    );

    const assignedMembers = updatedAssignmentRows.map((row) =>
      mapDocumentAssignmentMemberRow(row as Record<string, unknown>),
    );

    const assignedMemberIds = assignedMembers.map((m) => m.userId);
    const assignedMembersResponse = redactOtherAssigneesSubmissionPayload(
      assignedMembers,
      userId,
      viewerIsGlobalAdmin,
    );

    const main = mapSmartDocumentMainFields(updatedDocRows[0] as Record<string, unknown>, {
      clubPublicId: req.clubPublicId,
    });
    const dueDate = new Date(String(main.dueDate));
    const isOverdue = dueDate < new Date() && main.status !== 'Completed';

    res.json({
      success: true,
      message: 'Member submission status updated successfully',
      document: {
        ...main,
        assignedMemberIds,
        assignedMembers: assignedMembersResponse,
        isOverdue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get available templates (from database with filters)
export const getTemplates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const { category, clubId, isPublic } = req.query;

    if (!userId) {
      throw createApiError('User not authenticated', 401);
    }

    const isAdmin = req.user?.role === 'admin';

    // Build query
    let query = `
      SELECT 
        dt.id,
        dt.name,
        dt.description,
        dt.category,
        dt.file_path as filePath,
        dt.club_id as clubId,
        dt.created_by as createdBy,
        dt.created_at as createdAt,
        dt.updated_at as updatedAt,
        dt.tags,
        dt.is_public as isPublic,
        c.name as clubName,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM document_templates dt
      LEFT JOIN clubs c ON dt.club_id = c.id
      LEFT JOIN users u ON dt.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by category
    if (category && category !== 'all') {
      query += ' AND dt.category = ?';
      params.push(category);
    }

    // Filter by club (if not admin, only show templates from user's clubs or public templates)
    if (!isAdmin) {
      query += ` AND (dt.is_public IS TRUE OR dt.club_id IN (
        SELECT club_id FROM club_memberships WHERE user_id = ? AND status = 'approved'
      ) OR dt.created_by = ?)`;
      params.push(userId, userId);
    } else if (clubId && clubId !== 'all') {
      query += ' AND (dt.club_id = ? OR dt.is_public IS TRUE)';
      params.push(parseInt(clubId as string));
    } else if (isPublic === 'true') {
      query += ' AND dt.is_public IS TRUE';
    }

    query += ' ORDER BY dt.created_at DESC';

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    const templates = rows.map((row: any) => mapTemplateRow(row as Record<string, unknown>));

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new template
export const createTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const clubId = clubDbIdFromRequest(req);
    const file = req.file;

    if (!userId) {
      throw createApiError('User not authenticated', 401);
    }

    const isAdmin = req.user?.role === 'admin';

    // Only admin or leader can create templates
    if (!isAdmin && clubId) {
      // Check if user is leader of the club
      const [membershipRows] = await pool.execute<RowDataPacket[]>(
        'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
        [userId, clubId, 'approved']
      );
      const isLeader = membershipRows.length > 0 && membershipRows[0].role === 'leader';
      
      if (!isLeader) {
      throw createApiError('Only club leaders and admins can create templates', 403);
      }
    }

    if (!file) {
      throw createApiError('File is required', 400);
    }

    const { name, description, category = 'Other', tags, isPublic = false } = req.body;

    if (!name) {
      throw createApiError('Template name is required', 400);
    }

    const filePath = `uploads/templates/${file.filename}`;
    const tagsJson = tags ? JSON.stringify(Array.isArray(tags) ? tags : [tags]) : null;

    // Insert template
    const insertQuery = `
      INSERT INTO document_templates 
      (name, description, category, file_path, club_id, created_by, tags, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute<ResultSetHeader>(insertQuery, [
      name,
      description || null,
      category,
      filePath,
      clubId || null,
      userId,
      tagsJson,
      isPublic === 'true' || isPublic === true,
    ]);

    const templateId = result.insertId;

    // Fetch created template
    const [templateRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        dt.id,
        dt.name,
        dt.description,
        dt.category,
        dt.file_path as filePath,
        dt.club_id as clubId,
        dt.created_by as createdBy,
        dt.created_at as createdAt,
        dt.updated_at as updatedAt,
        dt.tags,
        dt.is_public as isPublic,
        c.name as clubName
      FROM document_templates dt
      LEFT JOIN clubs c ON dt.club_id = c.id
      WHERE dt.id = ?`,
      [templateId]
    );

    const template = mapTemplateRow(templateRows[0] as Record<string, unknown>);

    res.json({
      success: true,
      template,
    });
  } catch (error) {
    next(error);
  }
};

// Update template metadata
export const updateTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const templateId = parseInt(req.params.templateId);
    const { name, description, category, tags, isPublic } = req.body;

    if (!userId) {
      throw createApiError('User not authenticated', 401);
    }

    // Check if template exists and user has permission
    const [templateRows] = await pool.execute<RowDataPacket[]>(
      'SELECT created_by, club_id FROM document_templates WHERE id = ?',
      [templateId]
    );

    if (templateRows.length === 0) {
      throw createApiError('Template not found', 404);
    }

    const template = templateRows[0];
    const isAdmin = req.user?.role === 'admin';
    const isCreator = template.created_by === userId;

    // Only creator or admin can update
    if (!isAdmin && !isCreator) {
      throw createApiError('Only template creator or admin can update template', 403);
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(Array.isArray(tags) ? tags : [tags]));
    }
    if (isPublic !== undefined) {
      updates.push('is_public = ?');
      params.push(isPublic === 'true' || isPublic === true);
    }

    if (updates.length === 0) {
      throw createApiError('No fields to update', 400);
    }

    params.push(templateId);

    await pool.execute(
      `UPDATE document_templates SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    // Fetch updated template
    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        dt.id,
        dt.name,
        dt.description,
        dt.category,
        dt.file_path as filePath,
        dt.club_id as clubId,
        dt.created_by as createdBy,
        dt.created_at as createdAt,
        dt.updated_at as updatedAt,
        dt.tags,
        dt.is_public as isPublic,
        c.name as clubName
      FROM document_templates dt
      LEFT JOIN clubs c ON dt.club_id = c.id
      WHERE dt.id = ?`,
      [templateId]
    );

    const updatedTemplate = mapTemplateRow(updatedRows[0] as Record<string, unknown>);

    res.json({
      success: true,
      template: updatedTemplate,
    });
  } catch (error) {
    next(error);
  }
};

// Delete template
export const deleteTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const templateId = parseInt(req.params.templateId);

    if (!userId) {
      throw createApiError('User not authenticated', 401);
    }

    // Check if template exists and user has permission
    const [templateRows] = await pool.execute<RowDataPacket[]>(
      'SELECT created_by, file_path FROM document_templates WHERE id = ?',
      [templateId]
    );

    if (templateRows.length === 0) {
      throw createApiError('Template not found', 404);
    }

    const template = templateRows[0];
    const isAdmin = req.user?.role === 'admin';
    const isCreator = template.created_by === userId;

    // Only creator or admin can delete
    if (!isAdmin && !isCreator) {
      throw createApiError('Only template creator or admin can delete template', 403);
    }

    // Delete file if exists
    if (template.file_path) {
      deleteFile(template.file_path);
    }

    // Delete template
    await pool.execute('DELETE FROM document_templates WHERE id = ?', [templateId]);

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Submit document file (member)
export const submitDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const clubId = clubDbIdFromRequest(req);
    const userId = req.user?.userId;
    const file = req.file;

    if (!userId) {
      throw createApiError('Unauthorized', 401);
    }

    if (!file) {
      throw createApiError('File is required', 400);
    }

    // Verify document exists and user is assigned
    const [docRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, status FROM smart_documents WHERE id = ? AND club_id = ?',
      [documentId, clubId]
    );

    if (docRows.length === 0) {
      throw createApiError('Document not found', 404);
    }

    // Verify user is assigned to this document
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, file_path FROM document_assignments WHERE document_id = ? AND user_id = ?',
      [documentId, userId]
    );

    if (assignmentRows.length === 0) {
      throw createApiError('You are not assigned to this document', 403);
    }

    const assignment = assignmentRows[0];

    // Delete old file if exists
    if (assignment.file_path) {
      deleteFile(assignment.file_path);
    }

    // Fix filename encoding (Windows Latin-1 → UTF-8 issue)
    const fixedFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const filePath = `uploads/smart-documents/${file.filename}`;

    // Update assignment with file info
    await pool.execute(
      `UPDATE document_assignments 
       SET file_path = ?, 
           file_name = ?, 
           file_size = ?, 
           file_mime_type = ?,
           submission_status = 'Submitted',
           submitted_at = CURRENT_TIMESTAMP
       WHERE document_id = ? AND user_id = ?`,
      [filePath, fixedFileName, file.size, file.mimetype, documentId, userId]
    );

    // Update document status based on all submissions
    await updateDocumentStatusBasedOnSubmissions(documentId);

    // Check if user is admin or leader
    const isAdmin = req.user?.role === 'admin';
    
    // Check if user is president of the club
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT president_id FROM clubs WHERE id = ?',
      [clubId]
    );
    const isPresident = clubRows.length > 0 && clubRows[0].president_id === userId;
    
    // Check if user has leader role in membership
    let isLeader = false;
    if (userId) {
      const [membershipRows] = await pool.execute<RowDataPacket[]>(
        'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
        [userId, clubId, 'approved']
      );
      const hasLeaderMembership = membershipRows.length > 0 && membershipRows[0].role === 'leader';
      isLeader = isPresident || hasLeaderMembership;
    }

    // Fetch updated document
    const [updatedDocRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName,
        c.public_id as clubPublicId,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      LEFT JOIN users u ON sd.created_by = u.id
      WHERE sd.id = ?`,
      [documentId]
    );

    // Get assignments - for members, only show their own assignment; for leaders/admins, show all
    let updatedAssignmentRows: RowDataPacket[];
    if (isLeader || isAdmin) {
      [updatedAssignmentRows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
          da.id,
          da.document_id as documentId,
          da.user_id as userId,
          da.status,
          da.submission_status as submissionStatus,
          da.file_path as filePath,
          da.file_name as fileName,
          da.file_size as fileSize,
          da.file_mime_type as fileMimeType,
          DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
          da.admin_comment as adminComment,
          DATE_FORMAT(da.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
          DATE_FORMAT(da.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
          u.first_name as userFirstName,
          u.last_name as userLastName,
          u.email as userEmail,
          u.avatar as userAvatar,
          cm.role as userRole
        FROM document_assignments da
        JOIN users u ON da.user_id = u.id
        LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
        WHERE da.document_id = ?
        ORDER BY da.created_at ASC`,
        [clubId, documentId]
      );
    } else {
      // For members, only get their own assignment
      [updatedAssignmentRows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
          da.id,
          da.document_id as documentId,
          da.user_id as userId,
          da.status,
          da.submission_status as submissionStatus,
          da.file_path as filePath,
          da.file_name as fileName,
          da.file_size as fileSize,
          da.file_mime_type as fileMimeType,
          DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
          da.admin_comment as adminComment,
          DATE_FORMAT(da.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
          DATE_FORMAT(da.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
          u.first_name as userFirstName,
          u.last_name as userLastName,
          u.email as userEmail,
          u.avatar as userAvatar,
          cm.role as userRole
        FROM document_assignments da
        JOIN users u ON da.user_id = u.id
        LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
        WHERE da.document_id = ? AND da.user_id = ?
        ORDER BY da.created_at ASC`,
        [clubId, documentId, userId]
      );
    }

    const assignedMembers = updatedAssignmentRows.map((row) =>
      mapDocumentAssignmentMemberRow(row as Record<string, unknown>),
    );

    const assignedMembersResponse = redactOtherAssigneesSubmissionPayload(
      assignedMembers,
      userId,
      isAdmin,
    );

    const main = mapSmartDocumentMainFields(updatedDocRows[0] as Record<string, unknown>, {
      clubPublicId: req.clubPublicId,
    });
    const dueDate = new Date(String(main.dueDate));
    const isOverdue = dueDate < new Date() && main.status !== 'Completed';

    res.json({
      success: true,
      message: 'Document submitted successfully',
      document: {
        ...main,
        assignedMembers: assignedMembersResponse,
        isOverdue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Review submission (admin only)
export const reviewSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const clubId = clubDbIdFromRequest(req);
    const userId = req.user?.userId;
    const { userId: memberUserId, submissionStatus, comment }: ReviewSubmissionRequest = req.body;

    if (!userId) {
      throw createApiError('Unauthorized', 401);
    }

    // Only admins can review and approve submissions
    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin) {
      throw createApiError('Only admins can review and approve submissions', 403);
    }

    // Verify document exists
    const [docRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, status FROM smart_documents WHERE id = ? AND club_id = ?',
      [documentId, clubId]
    );

    if (docRows.length === 0) {
      throw createApiError('Document not found', 404);
    }

    // Verify assignment exists
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT da.id, cm.role as userRole
       FROM document_assignments da
       LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
       WHERE da.document_id = ? AND da.user_id = ?`,
      [clubId, documentId, memberUserId]
    );

    if (assignmentRows.length === 0) {
      throw createApiError('Member assignment not found', 404);
    }

    // Admins can review everyone (including leaders), but this check is mainly for future use
    // Currently only admins can access this endpoint, so all reviews are allowed

    // Update submission status and comment
    await pool.execute(
      `UPDATE document_assignments 
       SET submission_status = ?, 
           admin_comment = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE document_id = ? AND user_id = ?`,
      [submissionStatus, comment || null, documentId, memberUserId]
    );

    // Update document status based on all submissions
    await updateDocumentStatusBasedOnSubmissions(documentId);

    // Fetch updated document
    const [updatedDocRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName,
        c.public_id as clubPublicId,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      LEFT JOIN users u ON sd.created_by = u.id
      WHERE sd.id = ?`,
      [documentId]
    );

    const [updatedAssignmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        da.id,
        da.document_id as documentId,
        da.user_id as userId,
        da.status,
        da.submission_status as submissionStatus,
        da.file_path as filePath,
        da.file_name as fileName,
        da.file_size as fileSize,
        da.file_mime_type as fileMimeType,
        DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
        da.admin_comment as adminComment,
        DATE_FORMAT(da.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(da.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        u.first_name as userFirstName,
        u.last_name as userLastName,
        u.email as userEmail,
        u.avatar as userAvatar,
        cm.role as userRole
      FROM document_assignments da
      JOIN users u ON da.user_id = u.id
      LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
      WHERE da.document_id = ?
      ORDER BY da.created_at ASC`,
      [clubId, documentId]
    );

    const assignedMembers = updatedAssignmentRows.map((row) =>
      mapDocumentAssignmentMemberRow(row as Record<string, unknown>),
    );

    const assignedMemberIds = assignedMembers.map((m) => m.userId);

    const main = mapSmartDocumentMainFields(updatedDocRows[0] as Record<string, unknown>, {
      clubPublicId: req.clubPublicId,
    });
    const dueDate = new Date(String(main.dueDate));
    const isOverdue = dueDate < new Date() && main.status !== 'Completed';

    res.json({
      success: true,
      message: 'Submission reviewed successfully',
      document: {
        ...main,
        assignedMemberIds,
        assignedMembers,
        isOverdue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to update document status based on all member submissions
async function updateDocumentStatusBasedOnSubmissions(documentId: number): Promise<void> {
  try {
    // Get current document status and all assignments
    const [docRows] = await pool.execute<RowDataPacket[]>(
      `SELECT status FROM smart_documents WHERE id = ?`,
      [documentId]
    );

    if (docRows.length === 0) {
      console.warn(`Document ${documentId} not found for status update`);
      return;
    }

    const currentStatus = docRows[0].status;

    // Get all assignments for this document
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT submission_status, file_path FROM document_assignments WHERE document_id = ?`,
      [documentId]
    );

    if (assignmentRows.length === 0) {
      // No assignments - keep status as is or set to Open
      if (currentStatus !== 'Open') {
        await pool.execute(
          'UPDATE smart_documents SET status = ? WHERE id = ?',
          ['Open', documentId]
        );
        console.log(`Document ${documentId}: Status auto-updated to Open (no assignments)`);
      }
      return;
    }

    const total = assignmentRows.length;
    const needsRevision = assignmentRows.filter((row: any) => row.submission_status === 'Needs Revision').length;
    const approved = assignmentRows.filter((row: any) => row.submission_status === 'Approved').length;
    const submitted = assignmentRows.filter((row: any) => row.submission_status === 'Submitted').length;
    const notSubmitted = assignmentRows.filter((row: any) => row.submission_status === 'Not Submitted').length;
    const hasFileSubmitted = assignmentRows.filter((row: any) => row.file_path !== null && row.file_path !== '').length;

    let newStatus: 'Open' | 'In Progress' | 'Completed';
    let reason = '';

    // Priority 1: If any member needs revision, set to "Open"
    if (needsRevision > 0) {
      newStatus = 'Open';
      reason = `${needsRevision} member(s) need revision`;
    }
    // Priority 2: If ALL members are approved, set to "Completed"
    else if (approved === total && total > 0) {
      newStatus = 'Completed';
      reason = `All ${total} member(s) approved`;
    }
    // Priority 3: If at least one file has been submitted (even if status is Submitted), move to "In Progress"
    else if (hasFileSubmitted > 0 || submitted > 0 || approved > 0) {
      newStatus = 'In Progress';
      reason = `${submitted + approved} member(s) submitted/approved, ${notSubmitted} pending`;
    }
    // Priority 4: Otherwise, keep as "Open"
    else {
      newStatus = 'Open';
      reason = `No submissions yet (${notSubmitted} pending)`;
    }

    // Only update if status changed
    if (newStatus !== currentStatus) {
      await pool.execute(
        'UPDATE smart_documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStatus, documentId]
      );
      console.log(`Document ${documentId}: Status auto-updated from "${currentStatus}" to "${newStatus}" (${reason})`);
    }
  } catch (error) {
    console.error(`Error updating document status for document ${documentId}:`, error);
    // Don't throw - this is a helper function that shouldn't break the main flow
  }
}

// Bulk update document status
export const bulkUpdateStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = clubDbIdFromRequest(req);
    const { documentIds, status }: BulkUpdateStatusRequest = req.body;

    if (!documentIds || documentIds.length === 0) {
      throw createApiError('Document IDs are required', 400);
    }

    if (!status) {
      throw createApiError('Status is required', 400);
    }

    // Verify all documents belong to the club
    const placeholders = documentIds.map(() => '?').join(',');
    const [checkRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM smart_documents WHERE id IN (${placeholders}) AND club_id = ?`,
      [...documentIds, clubId]
    );

    if (checkRows.length !== documentIds.length) {
      throw createApiError('Some documents not found or do not belong to this club', 404);
    }

    // Update status for all documents
    await pool.execute(
      `UPDATE smart_documents SET status = ? WHERE id IN (${placeholders})`,
      [status, ...documentIds]
    );

    res.json({
      success: true,
      message: `Updated status for ${documentIds.length} document(s)`,
      updatedCount: documentIds.length,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk assign members to documents
export const bulkAssign = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = clubDbIdFromRequest(req);
    const { documentIds, memberIds }: BulkAssignRequest = req.body;

    if (!documentIds || documentIds.length === 0) {
      throw createApiError('Document IDs are required', 400);
    }

    if (!memberIds || memberIds.length === 0) {
      throw createApiError('Member IDs are required', 400);
    }

    // Verify all documents belong to the club
    const placeholders = documentIds.map(() => '?').join(',');
    const [checkRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM smart_documents WHERE id IN (${placeholders}) AND club_id = ?`,
      [...documentIds, clubId]
    );

    if (checkRows.length !== documentIds.length) {
      throw createApiError('Some documents not found or do not belong to this club', 404);
    }

    // Verify all members belong to the club
    const memberPlaceholders = memberIds.map(() => '?').join(',');
    const [memberRows] = await pool.execute<RowDataPacket[]>(
      `SELECT user_id FROM club_memberships WHERE user_id IN (${memberPlaceholders}) AND club_id = ? AND status = 'approved'`,
      [...memberIds, clubId]
    );

    if (memberRows.length !== memberIds.length) {
      throw createApiError('Some members not found or are not approved members of this club', 404);
    }

    // Assign members to all documents
    const assignmentInsertQuery = `
      INSERT INTO document_assignments (id, document_id, user_id, status, submission_status, created_at, updated_at)
      VALUES (?, ?, ?, 'Open', 'Not Submitted', NOW(), NOW())
      ON CONFLICT (document_id, user_id) DO UPDATE SET updated_at = NOW()
    `;

    let assignedCount = 0;
    for (const documentId of documentIds) {
      for (const memberId of memberIds) {
        const assignmentId = await nextDocumentAssignmentPrimaryKey();
        await pool.execute(assignmentInsertQuery, [assignmentId, documentId, memberId]);
        assignedCount++;
      }
    }

    res.json({
      success: true,
      message: `Assigned ${memberIds.length} member(s) to ${documentIds.length} document(s)`,
      assignedCount,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk delete documents
export const bulkDelete = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = clubDbIdFromRequest(req);
    const { documentIds }: BulkDeleteRequest = req.body;

    if (!documentIds || documentIds.length === 0) {
      throw createApiError('Document IDs are required', 400);
    }

    // Verify all documents belong to the club
    const placeholders = documentIds.map(() => '?').join(',');
    const [checkRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, template_path FROM smart_documents WHERE id IN (${placeholders}) AND club_id = ?`,
      [...documentIds, clubId]
    );

    if (checkRows.length !== documentIds.length) {
      throw createApiError('Some documents not found or do not belong to this club', 404);
    }

    // Get file paths for deletion
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT file_path FROM document_assignments WHERE document_id IN (${placeholders}) AND file_path IS NOT NULL`,
      documentIds
    );

    // Delete files
    for (const row of assignmentRows) {
      if (row.file_path) {
        deleteFile(row.file_path);
      }
    }

    // Delete documents (cascades to assignments)
    await pool.execute(
      `DELETE FROM smart_documents WHERE id IN (${placeholders})`,
      documentIds
    );

    res.json({
      success: true,
      message: `Deleted ${documentIds.length} document(s)`,
      deletedCount: documentIds.length,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk export documents
export const bulkExport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = clubDbIdFromRequest(req);
    const { documentIds, format = 'json' }: BulkExportRequest = req.body;

    if (!documentIds || documentIds.length === 0) {
      throw createApiError('Document IDs are required', 400);
    }

    // Verify all documents belong to the club
    const placeholders = documentIds.map(() => '?').join(',');
    const [docRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sd.id,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        c.name as clubName,
        c.public_id as clubPublicId,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      WHERE sd.id IN (${placeholders}) AND sd.club_id = ?`,
      [...documentIds, clubId]
    );

    if (docRows.length !== documentIds.length) {
      throw createApiError('Some documents not found or do not belong to this club', 404);
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = ['ID', 'Title', 'Description', 'Priority', 'Type', 'Due Date', 'Status', 'Club', 'Created At'];
      const csvRows = [
        headers.join(','),
        ...docRows.map((raw) => {
          const row = raw as Record<string, unknown>;
          const id = pgVal(row, 'id');
          const title = String(pgVal(row, 'title') ?? '');
          const description = String(pgVal(row, 'description') ?? '');
          const priority = String(pgVal(row, 'priority') ?? '');
          const type = String(pgVal(row, 'type') ?? '');
          const dueDate = String(pgVal(row, 'dueDate') ?? pgVal(row, 'duedate') ?? '');
          const status = String(pgVal(row, 'status') ?? '');
          const clubName = String(pgVal(row, 'clubName') ?? pgVal(row, 'clubname') ?? '');
          const createdAt = String(pgVal(row, 'createdAt') ?? pgVal(row, 'createdat') ?? '');
          return [
            id,
            `"${title.replace(/"/g, '""')}"`,
            `"${description.replace(/"/g, '""')}"`,
            priority,
            type,
            dueDate,
            status,
            `"${clubName.replace(/"/g, '""')}"`,
            createdAt,
          ].join(',');
        }),
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="documents-export-${Date.now()}.csv"`);
      res.send(csvRows.join('\n'));
    } else {
      // Return JSON
      res.json({
        success: true,
        documents: docRows.map((raw) =>
          mapSmartDocumentMainFields(raw as Record<string, unknown>, { clubPublicId: req.clubPublicId }),
        ),
        count: docRows.length,
      });
    }
  } catch (error) {
    next(error);
  }
};

