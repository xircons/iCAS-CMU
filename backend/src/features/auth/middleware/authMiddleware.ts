import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../../../middleware/errorHandler';
import pool from '../../../config/database';
import type { RowDataPacket } from '../../../types/db';
import { clearAuthCookies } from '../utils/cookies';
import { isSuspendedValue } from '../../../utils/suspendedHelpers';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
  clubDbId?: number;
  clubPublicId?: string;
  assignmentDbId?: number;
  assignmentPublicId?: string;
}

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
      const uid = Number(decoded.userId);
      if (!Number.isFinite(uid) || uid < 1) {
        const err: ApiError = new Error('Invalid token payload');
        err.statusCode = 401;
        throw err;
      }
      const truncated = Math.trunc(uid);

      const [chk] = await pool.execute<RowDataPacket[]>(
        'SELECT COALESCE(is_suspended, FALSE) AS s FROM users WHERE id = ?',
        [truncated]
      );
      if (!chk.length) {
        const err404: ApiError = new Error('User not found');
        err404.statusCode = 401;
        throw err404;
      }
      const sr = chk[0] as Record<string, unknown>;
      if (isSuspendedValue(sr.s ?? sr.S)) {
        clearAuthCookies(res);
        const errSusp: ApiError = new Error('Account suspended');
        errSusp.statusCode = 403;
        throw errSusp;
      }

      req.user = {
        ...decoded,
        userId: truncated,
      };
      next();
    } catch (error) {
      const err = error instanceof Error ? (error as ApiError) : new Error('Authentication failed');
      if (!(typeof err === 'object' && err !== null && 'statusCode' in err && (err as ApiError).statusCode)) {
        (err as ApiError).statusCode = 401;
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

