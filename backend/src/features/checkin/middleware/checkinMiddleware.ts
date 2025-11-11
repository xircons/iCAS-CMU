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
    const error: ApiError = new Error('Authentication required');
    error.statusCode = 401;
    return next(error);
  }

  if (req.user.role !== 'leader' && req.user.role !== 'admin') {
    const error: ApiError = new Error('Leader or admin access required');
    error.statusCode = 403;
    return next(error);
  }

  next();
};

/**
 * Middleware to validate event exists
 */
export const validateEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const eventId = parseInt(req.params.eventId || req.body.eventId);

    if (!eventId || isNaN(eventId)) {
      const error: ApiError = new Error('Invalid event ID');
      error.statusCode = 400;
      return next(error);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM events WHERE id = ?',
      [eventId]
    );

    if (rows.length === 0) {
      const error: ApiError = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    req.body.eventId = eventId;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user is member
 */
export const requireMember = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    const error: ApiError = new Error('Authentication required');
    error.statusCode = 401;
    return next(error);
  }

  if (req.user.role !== 'member') {
    const error: ApiError = new Error('Member access required');
    error.statusCode = 403;
    return next(error);
  }

  next();
};

