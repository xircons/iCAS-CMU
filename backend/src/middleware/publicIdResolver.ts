import { Response, NextFunction } from 'express';
import pool from '../config/database';
import type { RowDataPacket } from '../types/db';
import { ApiError } from './errorHandler';
import { AuthRequest } from '../features/auth/middleware/authMiddleware';
import { isValidPublicIdSegment } from '../utils/publicId';
import { pgVal } from '../utils/pgRowHelpers';

export const resolveClubPublicIdParam = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const requestedClubPublicId = req.params.clubId;
    if (!isValidPublicIdSegment(requestedClubPublicId)) {
      const error: ApiError = new Error('Club not found');
      error.statusCode = 404;
      throw error;
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, public_id as publicId FROM clubs WHERE public_id = ?',
      [requestedClubPublicId],
    );

    if (rows.length === 0) {
      const error: ApiError = new Error('Club not found');
      error.statusCode = 404;
      throw error;
    }

    const row = rows[0] as Record<string, unknown>;
    const clubDbId = Number(pgVal(row, 'id'));
    if (!Number.isFinite(clubDbId) || clubDbId <= 0) {
      const error: ApiError = new Error('Club not found');
      error.statusCode = 404;
      throw error;
    }

    req.clubDbId = Math.trunc(clubDbId);
    req.clubPublicId = String(
      pgVal(row, 'publicId') ?? pgVal(row, 'publicid') ?? requestedClubPublicId,
    );
    req.params.clubId = String(req.clubDbId);
    next();
  } catch (error) {
    next(error);
  }
};

export const resolveAssignmentPublicIdParam = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const requestedAssignmentPublicId = req.params.assignmentId;
    if (!isValidPublicIdSegment(requestedAssignmentPublicId)) {
      const error: ApiError = new Error('Assignment not found');
      error.statusCode = 404;
      throw error;
    }

    const clubDbId =
      req.clubDbId ??
      (() => {
        const raw = Number(req.params.clubId);
        return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : null;
      })();

    if (!clubDbId) {
      const error: ApiError = new Error('Club not found');
      error.statusCode = 404;
      throw error;
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, public_id as publicId FROM club_assignments WHERE public_id = ? AND club_id = ?',
      [requestedAssignmentPublicId, clubDbId],
    );

    if (rows.length === 0) {
      const error: ApiError = new Error('Assignment not found');
      error.statusCode = 404;
      throw error;
    }

    const row = rows[0] as Record<string, unknown>;
    const assignmentDbId = Number(pgVal(row, 'id'));
    if (!Number.isFinite(assignmentDbId) || assignmentDbId <= 0) {
      const error: ApiError = new Error('Assignment not found');
      error.statusCode = 404;
      throw error;
    }

    req.assignmentDbId = Math.trunc(assignmentDbId);
    req.assignmentPublicId = String(
      pgVal(row, 'publicId') ?? pgVal(row, 'publicid') ?? requestedAssignmentPublicId,
    );
    req.params.assignmentId = String(req.assignmentDbId);
    next();
  } catch (error) {
    next(error);
  }
};
