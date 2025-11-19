import { Response, NextFunction } from 'express';
import pool from '../../../config/database';
import { RowDataPacket } from 'mysql2';
import { ApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../../auth/middleware/authMiddleware';

// Check if user is a leader or admin of the club (for document operations)
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

    // Check if user is president of the club
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT president_id FROM clubs WHERE id = ?',
      [clubId]
    );
    const isPresident = clubRows.length > 0 && clubRows[0].president_id === userId;

    // Check if user is a leader of this club
    const query = `
      SELECT id, role
      FROM club_memberships
      WHERE user_id = ? AND club_id = ? AND status = 'approved' AND role = 'leader'
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [userId, clubId]);
    const hasLeaderMembership = rows.length > 0;
    const isLeader = isPresident || hasLeaderMembership;

    if (!isLeader) {
      const error: ApiError = new Error('You must be a leader of this club');
      error.statusCode = 403;
      throw error;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Check if user is an admin (for document creation)
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    if (req.user.role !== 'admin') {
      const error: ApiError = new Error('Only admins can create documents');
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

// Validate document exists and belongs to club
export const validateDocumentAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.clubId);
    const documentId = parseInt(req.params.documentId);

    const query = `
      SELECT id, club_id
      FROM smart_documents
      WHERE id = ? AND club_id = ?
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [documentId, clubId]);

    if (rows.length === 0) {
      const error: ApiError = new Error('Document not found');
      error.statusCode = 404;
      throw error;
    }

    next();
  } catch (error) {
    next(error);
  }
};

