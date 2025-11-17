import { Response, NextFunction } from 'express';
import pool from '../../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { ApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import { CreateCommentRequest, UpdateCommentRequest, AssignmentComment } from '../types/assignment';
import { getSocketIO } from '../../../websocket/socketServer';

// Get all comments for an assignment
export const getAssignmentComments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
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
                 assignmentCreatorId === userId;
    }

    // Check if is_hidden column exists
    let hasIsHiddenColumn = false;
    try {
      const [columnCheck] = await pool.execute<RowDataPacket[]>(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'assignment_comments' 
         AND COLUMN_NAME = 'is_hidden'`
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
        ${hasIsHiddenColumn ? 'COALESCE(ac.is_hidden, 0) as isHidden,' : '0 as isHidden,'}
        DATE_FORMAT(ac.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(ac.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        u.first_name as userFirstName,
        u.last_name as userLastName,
        u.email as userEmail
      FROM assignment_comments ac
      LEFT JOIN users u ON ac.user_id = u.id
      WHERE ac.assignment_id = ?
    `;
    
    // Only filter hidden comments for non-leaders if column exists
    if (!isLeader && hasIsHiddenColumn) {
      query += ' AND (COALESCE(ac.is_hidden, 0) = 0)';
    }
    
    query += ' ORDER BY ac.created_at ASC';

    const [rows] = await pool.execute<RowDataPacket[]>(query, [assignmentId]);

    // Organize comments into threads (parent comments with replies)
    const commentsMap = new Map<number, AssignmentComment>();
    const rootComments: AssignmentComment[] = [];

    rows.forEach((row: any) => {
      const comment: AssignmentComment = {
        id: row.id,
        assignmentId: row.assignmentId,
        userId: row.userId,
        commentText: row.commentText,
        parentCommentId: row.parentCommentId || undefined,
        isHidden: row.isHidden === 1 || row.isHidden === true,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        userFirstName: row.userFirstName,
        userLastName: row.userLastName,
        userEmail: row.userEmail,
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
    const assignmentId = parseInt(req.params.assignmentId);
    const userId = req.user?.userId;
    const { commentText, parentCommentId }: CreateCommentRequest = req.body;

    if (!commentText || !commentText.trim()) {
      const error: ApiError = new Error('Comment text is required');
      error.statusCode = 400;
      throw error;
    }

    // If parentCommentId is provided, verify it exists and belongs to the same assignment
    if (parentCommentId) {
      const [parentRows] = await pool.execute<RowDataPacket[]>(
        'SELECT assignment_id FROM assignment_comments WHERE id = ?',
        [parentCommentId]
      );

      if (parentRows.length === 0) {
        const error: ApiError = new Error('Parent comment not found');
        error.statusCode = 404;
        throw error;
      }

      if (parentRows[0].assignment_id !== assignmentId) {
        const error: ApiError = new Error('Parent comment does not belong to this assignment');
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
      assignmentId,
      userId,
      commentText.trim(),
      parentCommentId || null,
    ]);

    // Fetch the created comment with user info
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        ac.id,
        ac.assignment_id as assignmentId,
        ac.user_id as userId,
        ac.comment_text as commentText,
        ac.parent_comment_id as parentCommentId,
        DATE_FORMAT(ac.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(ac.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
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
      createdAt: new Date(rows[0].createdAt),
      updatedAt: new Date(rows[0].updatedAt),
      replies: [],
    };

    // Emit WebSocket event
    const io = getSocketIO();
    if (io) {
      // Get club_id from assignment
      const [assignmentRows] = await pool.execute<RowDataPacket[]>(
        'SELECT club_id FROM club_assignments WHERE id = ?',
        [assignmentId]
      );
      if (assignmentRows.length > 0) {
        const clubId = assignmentRows[0].club_id;
        io.to(`club-${clubId}`).emit('assignment-comment-created', {
          assignmentId,
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

    if (existingRows[0].user_id !== userId) {
      const error: ApiError = new Error('You can only edit your own comments');
      error.statusCode = 403;
      throw error;
    }

    const query = `
      UPDATE assignment_comments 
      SET comment_text = ?
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
        DATE_FORMAT(ac.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(ac.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
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
      createdAt: new Date(rows[0].createdAt),
      updatedAt: new Date(rows[0].updatedAt),
    };

    // Emit WebSocket event
    const io = getSocketIO();
    if (io) {
      const [assignmentRows] = await pool.execute<RowDataPacket[]>(
        'SELECT club_id FROM club_assignments WHERE id = ?',
        [assignmentId]
      );
      if (assignmentRows.length > 0) {
        const clubId = assignmentRows[0].club_id;
        io.to(`club-${clubId}`).emit('assignment-comment-updated', {
          assignmentId,
          commentId,
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
    const isLeader = userRows.length > 0 && (userRows[0].role === 'leader' || assignmentCreatorId === userId);
    const isCommentOwner = existingRows[0].user_id === userId;

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
      io.to(`club-${clubId}`).emit('assignment-comment-deleted', {
        assignmentId,
        commentId,
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
    const { isHidden } = req.body;

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
                     assignmentCreatorId === userId;

    if (!isLeader) {
      const error: ApiError = new Error('Only leaders can hide/unhide comments');
      error.statusCode = 403;
      throw error;
    }

    // Check if is_hidden column exists
    const [columnCheck] = await pool.execute<RowDataPacket[]>(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'assignment_comments' 
       AND COLUMN_NAME = 'is_hidden'`
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

    await pool.execute(query, [isHidden ? 1 : 0, commentId]);

    // Fetch updated comment
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        ac.id,
        ac.assignment_id as assignmentId,
        ac.user_id as userId,
        ac.comment_text as commentText,
        ac.parent_comment_id as parentCommentId,
        COALESCE(ac.is_hidden, 0) as isHidden,
        DATE_FORMAT(ac.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(ac.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
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
      createdAt: new Date(rows[0].createdAt),
      updatedAt: new Date(rows[0].updatedAt),
    };

    // Emit WebSocket event
    const io = getSocketIO();
    if (io) {
      io.to(`club-${clubId}`).emit('assignment-comment-visibility-changed', {
        assignmentId,
        commentId,
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

