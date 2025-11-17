import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: ApiError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle database errors
  if ((err as any).code === 'ER_NO_SUCH_TABLE') {
    const message = (err as any).sqlMessage || err.message;
    const tableName = message.match(/Table ['`](\w+)['`]/)?.[1] || '';
    
    // Tables that can be handled gracefully (return empty data)
    const gracefulTables = ['club_memberships', 'check_ins', 'check_in_sessions'];
    
    if (gracefulTables.includes(tableName)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️  ${tableName} table not found, handled gracefully`);
      }
      // Return empty data or success response instead of error
      return res.status(200).json({
        success: true,
        data: tableName === 'check_ins' ? { members: [] } : [],
        message: 'Table not found, returning empty data',
      });
    }
    
    // For other missing tables, show error
    const statusCode = 500;
    console.error('❌ Database Error:', message);
    
    return res.status(statusCode).json({
      success: false,
      error: {
        message: 'Database configuration error. Please check database setup.',
        ...(process.env.NODE_ENV === 'development' && { 
          details: message,
          stack: err.stack 
        }),
      },
    });
  }

  // Handle MySQL connection errors
  if ((err as any).code === 'ECONNREFUSED' || (err as any).code === 'ETIMEDOUT') {
    const statusCode = 503;
    const message = 'Database connection failed';
    
    console.error('❌ Database Connection Error:', err);
    
    return res.status(statusCode).json({
      success: false,
      error: {
        message: 'Database service unavailable. Please try again later.',
        ...(process.env.NODE_ENV === 'development' && { 
          details: err.message,
          stack: err.stack 
        }),
      },
    });
  }

  // Handle other API errors
  const apiError = err as ApiError;
  const statusCode = apiError.statusCode || 500;
  const message = apiError.message || 'Internal Server Error';

  // Don't log 401 errors for /auth/me (expected when user is not logged in)
  const isExpected401 = statusCode === 401 && req.path === '/api/auth/me' && req.method === 'GET';
  
  if (!isExpected401) {
    console.error('❌ Error:', {
      statusCode,
      message,
      path: req.path,
      method: req.method,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        details: (err as any).sqlMessage || (err as any).code,
      }),
    },
  });
};

