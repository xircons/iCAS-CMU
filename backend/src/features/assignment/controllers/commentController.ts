import { Response, NextFunction } from 'express';
import pool from '../../../config/database';
import type { RowDataPacket, ResultSetHeader } from '../../../types/db';
import { ApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import { pgVal } from '../../../utils/pgRowHelpers';
import { CreateCommentRequest, UpdateCommentRequest, AssignmentComment } from '../types/assignment';
import { getSocketIO } from '../../../websocket/socketServer';
import { assignmentDbIdFromRequest } from '../middleware/assignmentMiddleware';

const parseNumericId = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  if (typeof value === 'bigint') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toIsoTimestamp = (value: unknown): string => {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : new Date(0).toISOString();
  }
  const text = String(value ?? '').trim();
  if (!text) return new Date(0).toISOString();

  // PG timestamp without timezone can arrive as "YYYY-MM-DD HH:mm:ss(.sss)".
  // Treat it as UTC explicitly to avoid local-time parsing offsets (e.g. +7h skew).
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(text)) {
    return new Date(text.replace(' ', 'T') + 'Z').toISOString();
  }

  const d = new Date(text);
  return Number.isFinite(d.getTime()) ? d.toISOString() : new Date(0).toISOString();
};

const idsEqual = (left: unknown, right: unknown): boolean => {
  const leftId = parseNumericId(left);
  const rightId = parseNumericId(right);
  return leftId !== null && rightId !== null && leftId === rightId;
};

// Get all comments for an assignment
export const getAssignmentComments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignmentId = assignmentDbIdFromRequest(req);
    const userId = req.user?.userId;

    // Check if user is admin or leader
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );

    const isAdmin = userRows.length > 0 && userRows[0].role === 'admin';
    
    // Check if user is leader of the club
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT club_id, created_by FROM club_assignments WHERE id = ?',
      [assignmentId]
    );

    let isLeader = false;
    if (assignmentRows.length > 0) {
      const clubId = assignmentRows[0].club_id;
      const assignmentCreatorId = assignmentRows[0].created_by;
      
      // Check if user is leader of the club
      const [clubMemberRows] = await pool.execute<RowDataPacket[]>(
        'SELECT role FROM club_memberships WHERE club_id = ? AND user_id = ? AND status = ?',
        [clubId, userId, 'approved']
      );
      
      isLeader = isAdmin ||
                 (clubMemberRows.length > 0 && clubMemberRows[0].role === 'leader') ||
                 idsEqual(assignmentCreatorId, userId);
    }

    // Check if is_hidden column exists
    let hasIsHiddenColumn = false;
    try {
      const [columnCheck] = await pool.execute<RowDataPacket[]>(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_schema = current_schema()
         AND table_name = 'assignment_comments' 
         AND column_name = 'is_hidden'`
      );
      hasIsHiddenColumn = columnCheck.length > 0;
    } catch (err) {
      // If check fails, assume column doesn't exist
      hasIsHiddenColumn = false;
    }

    // Build query conditionally based on whether column exists
    let query = `
      SELECT 
        ac.id,
        ac.assignment_id as assignmentId,
        ac.user_id as userId,
        ac.comment_text as commentText,
        ac.parent_comment_id as parentCommentId,
        ${hasIsHiddenColumn ? '(CASE WHEN COALESCE(ac.is_hidden::boolean, false) THEN 1 ELSE 0 END) as isHidden,' : '0 as isHidden,'}
        ac.created_at as createdAt,
        ac.updated_at as updatedAt,
        u.first_name as userFirstName,
        u.last_name as userLastName,
        u.email as userEmail
      FROM assignment_comments ac
      LEFT JOIN users u ON ac.user_id = u.id
      WHERE ac.assignment_id = ?
    `;
    
    // Only filter hidden comments for non-leaders if column exists
    if (!isLeader && hasIsHiddenColumn) {
      query += ' AND NOT COALESCE(ac.is_hidden::boolean, false)';
    }
    
    query += ' ORDER BY ac.created_at ASC';

    const [rows] = await pool.execute<RowDataPacket[]>(query, [assignmentId]);

    // Organize comments into threads (parent comments with replies)
    const commentsMap = new Map<number, AssignmentComment>();
    const rootComments: AssignmentComment[] = [];

    rows.forEach((row: any, index: number) => {
      const r = row as Record<string, unknown>;
      const rawId = pgVal(r, 'id');
      const pcid = pgVal(r, 'parentCommentId') ?? pgVal(r, 'parentcommentid');
      const ca = pgVal(r, 'createdAt') ?? pgVal(r, 'createdat');
      const ua = pgVal(r, 'updatedAt') ?? pgVal(r, 'updatedat');
      const ih = pgVal(r, 'isHidden') ?? pgVal(r, 'ishidden');
      const commentId = parseNumericId(rawId);
      const parentCommentId = parseNumericId(pcid);

      if (commentId == null || commentId < 1) {
        return;
      }
      const comment: AssignmentComment = {
        id: commentId,
        assignmentId: Number(pgVal(r, 'assignmentId') ?? pgVal(r, 'assignmentid')),
        userId: Number(pgVal(r, 'userId') ?? pgVal(r, 'userid')),
        commentText: (pgVal(r, 'commentText') ?? pgVal(r, 'commenttext')) as string,
        parentCommentId: parentCommentId ?? undefined,
        isHidden: ih === 1 || ih === true,
        createdAt: toIsoTimestamp(ca) as any,
        updatedAt: toIsoTimestamp(ua) as any,
        userFirstName: (pgVal(r, 'userFirstName') ?? pgVal(r, 'userfirstname')) as string,
        userLastName: (pgVal(r, 'userLastName') ?? pgVal(r, 'userlastname')) as string,
        userEmail: (pgVal(r, 'userEmail') ?? pgVal(r, 'useremail')) as string,
        replies: [],
      };

      commentsMap.set(comment.id, comment);

      if (!comment.parentCommentId) {
        rootComments.push(comment);
      } else {
        const parent = commentsMap.get(comment.parentCommentId);
        if (parent) {
          if (!parent.replies) {
            parent.replies = [];
          }
          parent.replies.push(comment);
        }
      }
    });

    res.json({
      success: true,
      comments: rootComments,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new comment
export const createComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubIdNum = parseNumericId(req.params.clubId);
    const assignmentIdNum = parseNumericId(req.params.assignmentId);
    const userId = req.user?.userId;
    const body = req.body as CreateCommentRequest & { commentText?: unknown; parentCommentId?: unknown };

    if (clubIdNum === null || clubIdNum < 1) {
      const error: ApiError = new Error('Invalid club ID');
      error.statusCode = 400;
      throw error;
    }

    if (assignmentIdNum === null || assignmentIdNum < 1) {
      const error: ApiError = new Error('Invalid assignment ID');
      error.statusCode = 400;
      throw error;
    }

    const userIdNum = parseNumericId(userId ?? undefined);
    if (userIdNum === null || userIdNum < 1) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    const text =
      typeof body.commentText === 'string'
        ? body.commentText.trim()
        : String(body.commentText ?? '').trim();
    if (!text) {
      const error: ApiError = new Error('Comment text is required');
      error.statusCode = 400;
      throw error;
    }

    const rawParent =
      body.parentCommentId ??
      (body as { parent_comment_id?: unknown }).parent_comment_id;
    const parentNumeric = parseNumericId(rawParent ?? undefined);

    /*
     * Mirror list semantics: threads are scoped by assignment_id only.
     * validateAssignmentAccess already tied (clubId, assignmentId) to one club_assignments row.
     * Avoid joining club_assignments here: club_id param type can differ from the column in PG
     * (e.g. text vs int) and incorrectly reject valid parents.
     */
    if (parentNumeric != null) {
      const [parentOk] = await pool.execute<RowDataPacket[]>(
        `SELECT ac.id
         FROM assignment_comments ac
         WHERE ac.id = CAST(? AS bigint)
           AND ac.assignment_id = CAST(? AS bigint)`,
        [parentNumeric, assignmentIdNum]
      );
      if (parentOk.length === 0) {
        const error: ApiError = new Error(
          'Parent comment does not belong to this assignment'
        );
        error.statusCode = 400;
        throw error;
      }
    }

    const query = `
      INSERT INTO assignment_comments 
      (assignment_id, user_id, comment_text, parent_comment_id)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await pool.execute<ResultSetHeader>(query, [
      assignmentIdNum,
      userIdNum,
      text,
      parentNumeric,
    ]);

    // Fetch the created comment with user info
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        ac.id,
        ac.assignment_id as assignmentId,
        ac.user_id as userId,
        ac.comment_text as commentText,
        ac.parent_comment_id as parentCommentId,
        ac.created_at as createdAt,
        ac.updated_at as updatedAt,
        u.first_name as userFirstName,
        u.last_name as userLastName,
        u.email as userEmail
      FROM assignment_comments ac
      LEFT JOIN users u ON ac.user_id = u.id
      WHERE ac.id = ?`,
      [result.insertId]
    );

    const comment = {
      ...rows[0],
      createdAt: toIsoTimestamp(rows[0].createdAt),
      updatedAt: toIsoTimestamp(rows[0].updatedAt),
      replies: [],
    };

    // Emit WebSocket event
    const io = getSocketIO();
    if (io) {
      // Get club_id from assignment
      const [assignmentRows] = await pool.execute<RowDataPacket[]>(
        'SELECT club_id FROM club_assignments WHERE id = ?',
        [assignmentIdNum]
      );
      if (assignmentRows.length > 0) {
        const clubId = assignmentRows[0].club_id;
        const clubPublicId = req.clubPublicId ?? String(clubId);
        io.to(`club-${clubPublicId}`).emit('assignment-comment-created', {
          assignmentId: assignmentIdNum,
          clubPublicId,
          comment,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      comment,
    });
  } catch (error) {
    next(error);
  }
};

// Update a comment
export const updateComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user?.userId;
    const { commentText }: UpdateCommentRequest = req.body;

    if (!commentText || !commentText.trim()) {
      const error: ApiError = new Error('Comment text is required');
      error.statusCode = 400;
      throw error;
    }

    // Verify comment exists and belongs to user
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT user_id FROM assignment_comments WHERE id = ?',
      [commentId]
    );

    if (existingRows.length === 0) {
      const error: ApiError = new Error('Comment not found');
      error.statusCode = 404;
      throw error;
    }

    if (!idsEqual(existingRows[0].user_id, userId)) {
      const error: ApiError = new Error('You can only edit your own comments');
      error.statusCode = 403;
      throw error;
    }

    const query = `
      UPDATE assignment_comments 
      SET comment_text = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await pool.execute(query, [commentText.trim(), commentId]);

    // Fetch updated comment
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        ac.id,
        ac.assignment_id as assignmentId,
        ac.user_id as userId,
        ac.comment_text as commentText,
        ac.parent_comment_id as parentCommentId,
        ac.created_at as createdAt,
        ac.updated_at as updatedAt,
        u.first_name as userFirstName,
        u.last_name as userLastName,
        u.email as userEmail
      FROM assignment_comments ac
      LEFT JOIN users u ON ac.user_id = u.id
      WHERE ac.id = ?`,
      [commentId]
    );

    const comment = {
      ...rows[0],
      createdAt: toIsoTimestamp(rows[0].createdAt),
      updatedAt: toIsoTimestamp(rows[0].updatedAt),
    };

    // Emit WebSocket event
    const io = getSocketIO();
    if (io) {
      const assignmentId = rows[0].assignmentId;
      const [assignmentRows] = await pool.execute<RowDataPacket[]>(
        'SELECT club_id FROM club_assignments WHERE id = ?',
        [assignmentId]
      );
      if (assignmentRows.length > 0) {
        const clubId = assignmentRows[0].club_id;
        const clubPublicId = req.clubPublicId ?? String(clubId);
        io.to(`club-${clubPublicId}`).emit('assignment-comment-updated', {
          assignmentId,
          commentId,
          clubPublicId,
          comment,
        });
      }
    }

    res.json({
      success: true,
      message: 'Comment updated successfully',
      comment,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a comment
export const deleteComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user?.userId;

    // Verify comment exists and belongs to user (or user is admin/leader)
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT user_id, assignment_id FROM assignment_comments WHERE id = ?',
      [commentId]
    );

    if (existingRows.length === 0) {
      const error: ApiError = new Error('Comment not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user is admin or leader of the club
    const assignmentId = existingRows[0].assignment_id;
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT club_id, created_by FROM club_assignments WHERE id = ?',
      [assignmentId]
    );

    if (assignmentRows.length === 0) {
      const error: ApiError = new Error('Assignment not found');
      error.statusCode = 404;
      throw error;
    }

    const clubId = assignmentRows[0].club_id;
    const assignmentCreatorId = assignmentRows[0].created_by;

    // Check if user is admin or leader
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );

    const isAdmin = userRows.length > 0 && userRows[0].role === 'admin';
    const isLeader = userRows.length > 0 && (userRows[0].role === 'leader' || idsEqual(assignmentCreatorId, userId));
    const isCommentOwner = idsEqual(existingRows[0].user_id, userId);

    if (!isAdmin && !isLeader && !isCommentOwner) {
      const error: ApiError = new Error('You can only delete your own comments');
      error.statusCode = 403;
      throw error;
    }

    // Delete comment (cascade will handle replies)
    await pool.execute('DELETE FROM assignment_comments WHERE id = ?', [commentId]);

    // Emit WebSocket event
    const io = getSocketIO();
    if (io) {
      const clubPublicId = req.clubPublicId ?? String(clubId);
      io.to(`club-${clubPublicId}`).emit('assignment-comment-deleted', {
        assignmentId,
        commentId,
        clubPublicId,
      });
    }

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Hide/Unhide a comment (leader only)
export const toggleCommentVisibility = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user?.userId;
    const rawHidden: unknown = req.body?.isHidden;
    const isHidden =
      rawHidden === true ||
      rawHidden === 'true' ||
      rawHidden === 1 ||
      rawHidden === '1';

    // Verify comment exists
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT user_id, assignment_id FROM assignment_comments WHERE id = ?',
      [commentId]
    );

    if (existingRows.length === 0) {
      const error: ApiError = new Error('Comment not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user is admin or leader of the club
    const assignmentId = existingRows[0].assignment_id;
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT club_id, created_by FROM club_assignments WHERE id = ?',
      [assignmentId]
    );

    if (assignmentRows.length === 0) {
      const error: ApiError = new Error('Assignment not found');
      error.statusCode = 404;
      throw error;
    }

    const clubId = assignmentRows[0].club_id;
    const assignmentCreatorId = assignmentRows[0].created_by;

    // Check if user is admin or leader
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );

    const isAdmin = userRows.length > 0 && userRows[0].role === 'admin';
    
    // Check if user is leader of the club
    const [clubMemberRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM club_memberships WHERE club_id = ? AND user_id = ? AND status = ?',
      [clubId, userId, 'approved']
    );
    
    const isLeader = isAdmin ||
                     (clubMemberRows.length > 0 && clubMemberRows[0].role === 'leader') ||
                     idsEqual(assignmentCreatorId, userId);

    if (!isLeader) {
      const error: ApiError = new Error('Only leaders can hide/unhide comments');
      error.statusCode = 403;
      throw error;
    }

    // Check if is_hidden column exists
    const [columnCheck] = await pool.execute<RowDataPacket[]>(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = current_schema()
       AND table_name = 'assignment_comments' 
       AND column_name = 'is_hidden'`
    );
    
    if (columnCheck.length === 0) {
      const error: ApiError = new Error('Comment hiding feature is not available. Please run the database migration to add the is_hidden column.');
      error.statusCode = 500;
      throw error;
    }

    // Update comment visibility
    const query = `
      UPDATE assignment_comments 
      SET is_hidden = ?
      WHERE id = ?
    `;

    await pool.execute(query, [isHidden, commentId]);

    // Fetch updated comment
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        ac.id,
        ac.assignment_id as assignmentId,
        ac.user_id as userId,
        ac.comment_text as commentText,
        ac.parent_comment_id as parentCommentId,
        (CASE WHEN COALESCE(ac.is_hidden::boolean, false) THEN 1 ELSE 0 END) as isHidden,
        ac.created_at as createdAt,
        ac.updated_at as updatedAt,
        u.first_name as userFirstName,
        u.last_name as userLastName,
        u.email as userEmail
      FROM assignment_comments ac
      LEFT JOIN users u ON ac.user_id = u.id
      WHERE ac.id = ?`,
      [commentId]
    );

    const comment = {
      ...rows[0],
      isHidden: rows[0].isHidden === 1 || rows[0].isHidden === true,
      createdAt: toIsoTimestamp(rows[0].createdAt),
      updatedAt: toIsoTimestamp(rows[0].updatedAt),
    };

    // Emit WebSocket event
    const io = getSocketIO();
    if (io) {
      const clubPublicId = req.clubPublicId ?? String(clubId);
      io.to(`club-${clubPublicId}`).emit('assignment-comment-visibility-changed', {
        assignmentId,
        commentId,
        clubPublicId,
        comment,
      });
    }

    res.json({
      success: true,
      message: isHidden ? 'Comment hidden successfully' : 'Comment unhidden successfully',
      comment,
    });
  } catch (error) {
    next(error);
  }
};

