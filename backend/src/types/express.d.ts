import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: 'super_admin' | 'admin' | 'president' | 'club_advisor' | 'student';
      };
    }
  }
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'super_admin' | 'admin' | 'president' | 'club_advisor' | 'student';
  };
}
