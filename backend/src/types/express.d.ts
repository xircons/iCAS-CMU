/// <reference types="express" />

// Augment Express Request interface with user property from JWT
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: number;
      email: string;
      role: string;
    };
  }
}

export {};
