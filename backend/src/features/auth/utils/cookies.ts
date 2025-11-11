import { Response } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Set HttpOnly cookie with access token
 */
export const setAccessTokenCookie = (res: Response, token: string): void => {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: isProduction,
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
    secure: isProduction,
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
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
};

