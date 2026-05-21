import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  /** Stable machine-readable code for clients (e.g. CHECKIN_QR_INVALID). */
  errorCode?: string;
}

// Helper function to create ApiError
export function createApiError(message: string, statusCode: number, errorCode?: string): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  if (errorCode) error.errorCode = errorCode;
  return error;
}

export const errorHandler = (
  err: ApiError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle database errors (ER_NO_SUCH_TABLE is normalised from PG 42P01 by dbErrorMapper)
  if ((err as any).code === 'ER_NO_SUCH_TABLE') {
    const message = (err as any).sqlMessage || err.message;
    const tableName = message.match(/Table ['`](\w+)['`]/)?.[1] || '';
    
    // Tables that can be handled gracefully (return empty data)
    const gracefulTables = ['club_memberships', 'check_ins', 'check_in_sessions'];
    
    if (gracefulTables.includes(tableName)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`${tableName} table not found, handled gracefully`);
      }
      // Return empty data or success response instead of error
      return res.status(200).json({
        success: true,
        data: tableName === 'check_ins' ? { members: [] } : [],
        message: 'ไม่พบตาราง ส่งข้อมูลว่างแทน',
      });
    }
    
    // For other missing tables, show error
    const statusCode = 500;
    console.error('Database Error:', message);
    
    return res.status(statusCode).json({
      success: false,
      error: {
        message: 'การตั้งค่าฐานข้อมูลผิดพลาด กรุณาติดต่อผู้ดูแลระบบ',
        ...(process.env.NODE_ENV === 'development' && { 
          details: message,
          stack: err.stack 
        }),
      },
    });
  }

  // Handle connection errors
  if ((err as any).code === 'ECONNREFUSED' || (err as any).code === 'ETIMEDOUT') {
    const statusCode = 503;
    const message = 'Database connection failed';
    
    console.error('Database Connection Error:', err);
    
    return res.status(statusCode).json({
      success: false,
      error: {
        message: 'บริการฐานข้อมูลไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง',
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
  const message = apiError.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์';

  // Don't log 401 errors for /auth/me (expected when user is not logged in)
  const isExpected401 = statusCode === 401 && req.path === '/api/auth/me' && req.method === 'GET';
  
  if (!isExpected401) {
    console.error('Error:', {
      statusCode,
      message,
      path: req.path,
      method: req.method,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  const dbClientCode =
    typeof (err as Error & { clientCode?: unknown }).clientCode === 'string'
      ? (err as Error & { clientCode: string }).clientCode
      : undefined;

  const appErrorCode = apiError.errorCode;

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(appErrorCode
        ? { code: appErrorCode, ...(dbClientCode !== undefined ? { clientCode: dbClientCode } : {}) }
        : dbClientCode !== undefined
          ? { code: dbClientCode }
          : {}),
      ...(process.env.NODE_ENV === 'development'
        ? {
            stack: err.stack,
            details:
              (err as { sqlMessage?: string; code?: string }).sqlMessage ??
              (err as { sqlMessage?: string; code?: string }).code,
          }
        : {}),
    },
  });
};

