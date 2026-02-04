import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../../../middleware/errorHandler';
import pool from '../../../config/database';
import { RowDataPacket } from 'mysql2';

// AuthRequest type is now defined globally in src/types/express.d.ts
export type AuthRequest = Request;

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Try to get token from cookie first, then fallback to Authorization header
    const token = req.cookies?.access_token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);

    if (!token) {
      const error: ApiError = new Error('No token provided');
      error.statusCode = 401;
      throw error;
    }

    try {
      const decoded = verifyToken(token);
      
      // Check token version against database
      // This ensures tokens can be revoked instantly on logout/password change
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT token_version FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (rows.length === 0) {
        throw new Error('User not found');
      }

      const user = rows[0];
      if (user.token_version !== decoded.tokenVersion) {
        throw new Error('Token revoked');
      }

      req.user = decoded;
      next();
    } catch (error) {
      const err: ApiError = error instanceof Error ? error : new Error('Token verification failed');
      err.statusCode = 401;
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

