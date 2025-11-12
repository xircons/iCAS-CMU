import { Response, NextFunction } from 'express';
import pool from '../../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { ApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import { SubmitAssignmentRequest, GradeSubmissionRequest } from '../types/assignment';
import { deleteFile } from '../utils/fileUpload';
import path from 'path';

// Submit an assignment (member)
export const submitAssignment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    const userId = req.user?.userId;
    const { submissionType, textContent }: SubmitAssignmentRequest = req.body;
    const file = req.file;

    // Validate submission type
    if (!submissionType || (submissionType !== 'text' && submissionType !== 'file')) {
      const error: ApiError = new Error('Invalid submission type');
      error.statusCode = 400;
      throw error;
    }

    // Validate based on submission type
    if (submissionType === 'text' && !textContent) {
      const error: ApiError = new Error('Text content is required for text submission');
      error.statusCode = 400;
      throw error;
    }

    if (submissionType === 'file' && !file) {
      const error: ApiError = new Error('File is required for file submission');
      error.statusCode = 400;
      throw error;
    }

    // Check if user already has a submission
    const checkQuery = `
      SELECT id, graded_at, file_path
      FROM assignment_submissions
      WHERE assignment_id = ? AND user_id = ?
    `;

    const [existingRows] = await pool.execute<RowDataPacket[]>(checkQuery, [assignmentId, userId]);

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      
      // Can't update if already graded
      if (existing.graded_at) {
        const error: ApiError = new Error('Cannot update submission after it has been graded');
        error.statusCode = 403;
        throw error;
      }

      // Delete old file if updating to new file
      if (existing.file_path && file) {
        deleteFile(existing.file_path);
      }

      // Update existing submission
      const updateQuery = `
        UPDATE assignment_submissions
        SET submission_type = ?,
            text_content = ?,
            file_path = ?,
            file_name = ?,
            file_size = ?,
            file_mime_type = ?,
            submitted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const filePath = file ? path.join('uploads', 'assignments', file.filename) : null;

      await pool.execute(updateQuery, [
        submissionType,
        submissionType === 'text' ? textContent : null,
        filePath,
        file?.originalname || null,
        file?.size || null,
        file?.mimetype || null,
        existing.id
      ]);

      // Fetch updated submission
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM assignment_submissions WHERE id = ?',
        [existing.id]
      );

      return res.json({
        success: true,
        message: 'Submission updated successfully',
        submission: rows[0]
      });
    }

    // Create new submission
    const insertQuery = `
      INSERT INTO assignment_submissions
      (assignment_id, user_id, submission_type, text_content, file_path, file_name, file_size, file_mime_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const filePath = file ? path.join('uploads', 'assignments', file.filename) : null;

    const [result] = await pool.execute<ResultSetHeader>(insertQuery, [
      assignmentId,
      userId,
      submissionType,
      submissionType === 'text' ? textContent : null,
      filePath,
      file?.originalname || null,
      file?.size || null,
      file?.mimetype || null
    ]);

    // Fetch created submission
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM assignment_submissions WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Submission created successfully',
      submission: rows[0]
    });
  } catch (error) {
    // Clean up uploaded file if error occurs
    if (req.file) {
      deleteFile(path.join('uploads', 'assignments', req.file.filename));
    }
    next(error);
  }
};

// Get user's own submission
export const getUserSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    const userId = req.user?.userId;

    const query = `
      SELECT 
        asub.id,
        asub.assignment_id as assignmentId,
        asub.user_id as userId,
        asub.submission_type as submissionType,
        asub.text_content as textContent,
        asub.file_path as filePath,
        asub.file_name as fileName,
        asub.file_size as fileSize,
        asub.file_mime_type as fileMimeType,
        asub.score,
        asub.comment,
        asub.graded_by as gradedBy,
        asub.graded_at as gradedAt,
        asub.submitted_at as submittedAt,
        asub.created_at as createdAt,
        asub.updated_at as updatedAt,
        u.first_name as graderFirstName,
        u.last_name as graderLastName
      FROM assignment_submissions asub
      LEFT JOIN users u ON asub.graded_by = u.id
      WHERE asub.assignment_id = ? AND asub.user_id = ?
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [assignmentId, userId]);

    if (rows.length === 0) {
      return res.json({
        success: true,
        submission: null
      });
    }

    res.json({
      success: true,
      submission: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Get all submissions for an assignment (leader only)
export const getAssignmentSubmissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);

    const query = `
      SELECT 
        asub.id,
        asub.assignment_id as assignmentId,
        asub.user_id as userId,
        asub.submission_type as submissionType,
        asub.text_content as textContent,
        asub.file_path as filePath,
        asub.file_name as fileName,
        asub.file_size as fileSize,
        asub.file_mime_type as fileMimeType,
        asub.score,
        asub.comment,
        asub.graded_by as gradedBy,
        asub.graded_at as gradedAt,
        asub.submitted_at as submittedAt,
        asub.created_at as createdAt,
        asub.updated_at as updatedAt,
        u.first_name as userFirstName,
        u.last_name as userLastName,
        u.email as userEmail,
        grader.first_name as graderFirstName,
        grader.last_name as graderLastName
      FROM assignment_submissions asub
      INNER JOIN users u ON asub.user_id = u.id
      LEFT JOIN users grader ON asub.graded_by = grader.id
      WHERE asub.assignment_id = ?
      ORDER BY asub.submitted_at DESC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [assignmentId]);

    res.json({
      success: true,
      submissions: rows
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific submission (leader only)
export const getSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const submissionId = parseInt(req.params.submissionId);

    const query = `
      SELECT 
        asub.id,
        asub.assignment_id as assignmentId,
        asub.user_id as userId,
        asub.submission_type as submissionType,
        asub.text_content as textContent,
        asub.file_path as filePath,
        asub.file_name as fileName,
        asub.file_size as fileSize,
        asub.file_mime_type as fileMimeType,
        asub.score,
        asub.comment,
        asub.graded_by as gradedBy,
        asub.graded_at as gradedAt,
        asub.submitted_at as submittedAt,
        asub.created_at as createdAt,
        asub.updated_at as updatedAt,
        u.first_name as userFirstName,
        u.last_name as userLastName,
        u.email as userEmail,
        grader.first_name as graderFirstName,
        grader.last_name as graderLastName
      FROM assignment_submissions asub
      INNER JOIN users u ON asub.user_id = u.id
      LEFT JOIN users grader ON asub.graded_by = grader.id
      WHERE asub.id = ?
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [submissionId]);

    if (rows.length === 0) {
      const error: ApiError = new Error('Submission not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({
      success: true,
      submission: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Grade a submission (leader only)
export const gradeSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const submissionId = parseInt(req.params.submissionId);
    const userId = req.user?.userId;
    const { score, comment }: GradeSubmissionRequest = req.body;

    // Get assignment max_score to validate score
    const assignmentQuery = `
      SELECT ca.max_score
      FROM club_assignments ca
      INNER JOIN assignment_submissions asub ON ca.id = asub.assignment_id
      WHERE asub.id = ?
    `;

    const [assignmentRows] = await pool.execute<RowDataPacket[]>(assignmentQuery, [submissionId]);

    if (assignmentRows.length === 0) {
      const error: ApiError = new Error('Submission not found');
      error.statusCode = 404;
      throw error;
    }

    const maxScore = assignmentRows[0].max_score;

    // Validate score if provided
    if (score !== undefined && score !== null) {
      if (maxScore === null) {
        const error: ApiError = new Error('This assignment does not have scoring enabled');
        error.statusCode = 400;
        throw error;
      }

      if (score < 0 || score > maxScore) {
        const error: ApiError = new Error(`Score must be between 0 and ${maxScore}`);
        error.statusCode = 400;
        throw error;
      }
    }

    // Update submission with grade
    const updateQuery = `
      UPDATE assignment_submissions
      SET score = ?,
          comment = ?,
          graded_by = ?,
          graded_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await pool.execute(updateQuery, [
      score !== undefined ? score : null,
      comment || null,
      userId,
      submissionId
    ]);

    // Fetch updated submission
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT asub.*, 
              u.first_name as userFirstName, 
              u.last_name as userLastName,
              grader.first_name as graderFirstName,
              grader.last_name as graderLastName
       FROM assignment_submissions asub
       INNER JOIN users u ON asub.user_id = u.id
       LEFT JOIN users grader ON asub.graded_by = grader.id
       WHERE asub.id = ?`,
      [submissionId]
    );

    res.json({
      success: true,
      message: 'Submission graded successfully',
      submission: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

