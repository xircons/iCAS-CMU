import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import { ApiError } from '../../../middleware/errorHandler';
import pool from '../../../config/database';
import { RowDataPacket } from 'mysql2';

/**
 * Middleware to check if user is leader or admin
 */
export const requireLeaderOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    const error: ApiError = new Error('Unauthorized');
    error.statusCode = 401;
    return next(error);
  }

  if (req.user.role !== 'leader' && req.user.role !== 'admin') {
    const error: ApiError = new Error('Forbidden: Leader or Admin access required');
    error.statusCode = 403;
    return next(error);
  }

  next();
};

/**
 * Middleware to validate event exists and user has permission
 * Allows creator, leader, or admin to access
 */
export const validateEventAccess = async (
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

    // Check if event exists and get creator info
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT created_by FROM events WHERE id = ?',
      [eventId]
    );

    if (rows.length === 0) {
      const error: ApiError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    const createdBy = rows[0].created_by;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Allow if user is creator, leader, or admin
    if (createdBy === userId || userRole === 'leader' || userRole === 'admin') {
      next();
    } else {
      const error: ApiError = new Error('Forbidden: You do not have permission to access this event');
      error.statusCode = 403;
      return next(error);
    }
  } catch (error) {
    next(error);
  }
};

