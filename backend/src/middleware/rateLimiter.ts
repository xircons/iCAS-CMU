import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Check-in session creation limiter (for leaders)
export const checkInSessionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Too many check-in session creation attempts. Please wait a moment.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// QR check-in limiter (for members)
export const qrCheckInLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute (prevents spam scanning)
  message: 'Too many QR code scan attempts. Please wait a moment.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful check-ins
});

// Passcode check-in limiter (stricter for security)
export const passcodeCheckInLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts per minute (prevents brute force)
  message: 'Too many passcode attempts. Please wait a moment before trying again.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful check-ins
});

// Members list limiter (for leaders)
export const membersListLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many requests for member list. Please wait a moment.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Session end limiter
export const sessionEndLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many session end attempts. Please wait a moment.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit error handler
export const rateLimitHandler = (req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    error: {
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  });
};

