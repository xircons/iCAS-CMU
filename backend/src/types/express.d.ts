// Augment Express Request type globally
declare namespace Express {
  export interface Request {
    user?: {
      id: number;
      email: string;
      role: 'super_admin' | 'admin' | 'president' | 'club_advisor' | 'student';
    };
  }
}
