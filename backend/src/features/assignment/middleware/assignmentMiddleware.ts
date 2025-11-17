import { Response, NextFunction } from 'express';
import pool from '../../../config/database';
import { RowDataPacket } from 'mysql2';
import { ApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../../auth/middleware/authMiddleware';

// Check if user is a leader or admin of the club
export const requireLeaderOrAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.clubId);
    const userId = req.user?.userId;

    if (!userId) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    // Admin can access all clubs
    if (req.user?.role === 'admin') {
      return next();
    }

    // Check if user is a leader of this club
    const query = `
      SELECT id, role
      FROM club_memberships
      WHERE user_id = ? AND club_id = ? AND status = 'approved' AND role = 'leader'
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [userId, clubId]);

    if (rows.length === 0) {
      const error: ApiError = new Error('You must be a leader of this club');
      error.statusCode = 403;
      throw error;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Check if user is a member of the club
export const requireClubMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.clubId);
    const userId = req.user?.userId;

    if (!userId) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    // Admin can access all clubs
    if (req.user?.role === 'admin') {
      return next();
    }

    // Check if user is a member of this club
    const query = `
      SELECT id, role
      FROM club_memberships
      WHERE user_id = ? AND club_id = ? AND status = 'approved'
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [userId, clubId]);

    if (rows.length === 0) {
      const error: ApiError = new Error('You must be a member of this club');
      error.statusCode = 403;
      throw error;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Validate assignment exists and belongs to club
export const validateAssignmentAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.clubId);
    const assignmentId = parseInt(req.params.assignmentId);

    const query = `
      SELECT id, club_id
      FROM club_assignments
      WHERE id = ? AND club_id = ?
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [assignmentId, clubId]);

    if (rows.length === 0) {
      const error: ApiError = new Error('Assignment not found');
      error.statusCode = 404;
      throw error;
    }

    next();
  } catch (error) {
    next(error);
  }
};

