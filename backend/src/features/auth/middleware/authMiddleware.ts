import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../../../middleware/errorHandler';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Try to get token from cookie first, then fallback to Authorization header
    const token = req.cookies?.access_token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Auth Middleware Debug:');
      console.log('  - Cookies present:', !!req.cookies);
      console.log('  - access_token cookie:', req.cookies?.access_token ? 'present' : 'missing');
      console.log('  - Authorization header:', req.headers.authorization ? 'present' : 'missing');
      console.log('  - Token source:', req.cookies?.access_token ? 'cookie' : (req.headers.authorization ? 'header' : 'none'));
    }

    if (!token) {
      const error: ApiError = new Error('No token provided');
      error.statusCode = 401;
      throw error;
    }

    try {
      const decoded = verifyToken(token);
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

