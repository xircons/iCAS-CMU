import { Response } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

// Cookie `secure` flag: defaults to true in production, but can be overridden via
// COOKIE_SECURE=false for plain-HTTP IP-only deployments where Let's Encrypt is unavailable.
// Set COOKIE_SECURE=true (or leave unset in production) once HTTPS is terminated upstream.
const COOKIE_SECURE =
  process.env.COOKIE_SECURE != null
    ? process.env.COOKIE_SECURE.toLowerCase() === 'true'
    : isProduction;

/**
 * Set HttpOnly cookie with access token
 */
export const setAccessTokenCookie = (res: Response, token: string): void => {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });
};

/**
 * Set HttpOnly cookie with refresh token
 */
export const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });
};

/**
 * Clear both access and refresh token cookies
 */
export const clearAuthCookies = (res: Response): void => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  });
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  });
};

