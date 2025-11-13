import { Response, NextFunction } from 'express';
import pool from '../../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { ApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import { CreateAssignmentRequest, UpdateAssignmentRequest, CategorizedAssignments } from '../types/assignment';
import { deleteFile } from '../utils/fileUpload';
import path from 'path';

// Get all assignments for a club (categorized)
export const getClubAssignments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.clubId);
    const userId = req.user?.userId;

    // Get all assignments for the club
    // Use DATE_FORMAT with CONVERT_TZ to ensure we get the exact stored value
    // CONVERT_TZ converts from MySQL's timezone to the same timezone (no change)
    // This ensures DATE_FORMAT returns the exact stored value without timezone conversion
    const query = `
      SELECT 
        ca.id,
        ca.club_id as clubId,
        ca.title,
        ca.description,
        ca.max_score as maxScore,
        DATE_FORMAT(ca.available_date, '%Y-%m-%d %H:%i:%s') as availableDate,
        DATE_FORMAT(ca.due_date, '%Y-%m-%d %H:%i:%s') as dueDate,
        ca.attachment_path as attachmentPath,
        ca.attachment_name as attachmentName,
        ca.attachment_mime_type as attachmentMimeType,
        ca.created_by as createdBy,
        ca.created_at as createdAt,
        ca.updated_at as updatedAt,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName,
        (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = ca.id) as submissionCount
      FROM club_assignments ca
      LEFT JOIN users u ON ca.created_by = u.id
      WHERE ca.club_id = ?
      ORDER BY ca.due_date DESC, ca.created_at DESC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [clubId]);

    // For each assignment, check if user has submitted and get their submission info
    const assignmentsWithSubmissions = await Promise.all(
      rows.map(async (assignment: any) => {
        const submissionQuery = `
          SELECT 
            id,
            submission_type as submissionType,
            score,
            comment,
            graded_by as gradedBy,
            graded_at as gradedAt,
            submitted_at as submittedAt
          FROM assignment_submissions
          WHERE assignment_id = ? AND user_id = ?
        `;

        const [submissionRows] = await pool.execute<RowDataPacket[]>(submissionQuery, [assignment.id, userId]);
        const submission = submissionRows.length > 0 ? submissionRows[0] : null;

        // Format dates as strings to preserve local time
        // MySQL DATETIME values are returned as Date objects by mysql2
        // We need to format them as strings in the same format they were stored
        const formatDateTime = (dateValue: any): string => {
          if (!dateValue) return '';
          // If it's already a string in MySQL format, return as-is
          if (typeof dateValue === 'string' && dateValue.includes(' ')) {
            return dateValue;
          }
          // If it's a Date object from mysql2, it might be in UTC
          // We need to use DATE_FORMAT in SQL or format it correctly here
          // For now, let's use MySQL's DATE_FORMAT in the query itself
          // But as a fallback, format the Date object
          const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
          // Use UTC methods since mysql2 returns dates in UTC
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const hours = String(date.getUTCHours()).padStart(2, '0');
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
          const seconds = String(date.getUTCSeconds()).padStart(2, '0');
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };

        return {
          ...assignment,
          availableDate: formatDateTime(assignment.availableDate),
          dueDate: formatDateTime(assignment.dueDate),
          createdAt: assignment.createdAt instanceof Date 
            ? assignment.createdAt.toISOString() 
            : assignment.createdAt,
          updatedAt: assignment.updatedAt instanceof Date 
            ? assignment.updatedAt.toISOString() 
            : assignment.updatedAt,
          userSubmission: submission
        };
      })
    );

    // Categorize assignments
    const now = new Date();
    const categorized: CategorizedAssignments = {
      current: [],
      upcoming: [],
      overdue: [],
      past: []
    };

    assignmentsWithSubmissions.forEach((assignment: any) => {
      // Parse dates as local time (MySQL DATETIME format strings)
      let availableDate: Date;
      let dueDate: Date;
      
      if (typeof assignment.availableDate === 'string' && assignment.availableDate.includes(' ')) {
        const [datePart, timePart] = assignment.availableDate.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
        availableDate = new Date(year, month - 1, day, hours, minutes, seconds);
      } else {
        availableDate = new Date(assignment.availableDate);
      }
      
      if (typeof assignment.dueDate === 'string' && assignment.dueDate.includes(' ')) {
        const [datePart, timePart] = assignment.dueDate.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
        dueDate = new Date(year, month - 1, day, hours, minutes, seconds);
      } else {
        dueDate = new Date(assignment.dueDate);
      }
      const hasSubmission = assignment.userSubmission !== null;
      const isGraded = hasSubmission && assignment.userSubmission.gradedAt !== null;
      const submittedOnTime = hasSubmission && new Date(assignment.userSubmission.submittedAt) <= dueDate;

      if (availableDate > now) {
        // Upcoming: not yet available
        categorized.upcoming.push(assignment);
      } else if (dueDate < now) {
        // Past deadline
        if (hasSubmission && submittedOnTime) {
          // Past: submitted on time
          categorized.past.push(assignment);
        } else {
          // Overdue: no submission or submitted late
          categorized.overdue.push(assignment);
        }
      } else {
        // Current: available and not past due
        categorized.current.push(assignment);
      }
    });

    res.json({
      success: true,
      assignments: categorized
    });
  } catch (error) {
    next(error);
  }
};

// Get a single assignment
export const getAssignment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    const userId = req.user?.userId;

    const query = `
      SELECT 
        ca.id,
        ca.club_id as clubId,
        ca.title,
        ca.description,
        ca.max_score as maxScore,
        DATE_FORMAT(ca.available_date, '%Y-%m-%d %H:%i:%s') as availableDate,
        DATE_FORMAT(ca.due_date, '%Y-%m-%d %H:%i:%s') as dueDate,
        ca.attachment_path as attachmentPath,
        ca.attachment_name as attachmentName,
        ca.attachment_mime_type as attachmentMimeType,
        ca.created_by as createdBy,
        ca.created_at as createdAt,
        ca.updated_at as updatedAt,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM club_assignments ca
      LEFT JOIN users u ON ca.created_by = u.id
      WHERE ca.id = ?
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [assignmentId]);

    if (rows.length === 0) {
      const error: ApiError = new Error('Assignment not found');
      error.statusCode = 404;
      throw error;
    }

    const assignment = rows[0];

    // Get user's submission if exists
    const submissionQuery = `
      SELECT 
        id,
        submission_type as submissionType,
        text_content as textContent,
        file_path as filePath,
        file_name as fileName,
        score,
        comment,
        graded_by as gradedBy,
        graded_at as gradedAt,
        submitted_at as submittedAt
      FROM assignment_submissions
      WHERE assignment_id = ? AND user_id = ?
    `;

    const [submissionRows] = await pool.execute<RowDataPacket[]>(submissionQuery, [assignmentId, userId]);
    const submission = submissionRows.length > 0 ? submissionRows[0] : null;

    res.json({
      success: true,
      assignment: {
        ...assignment,
        userSubmission: submission
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a new assignment (leader only)
export const createAssignment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.clubId);
    const userId = req.user?.userId;
    const { title, description, maxScore, availableDate, dueDate }: CreateAssignmentRequest = req.body;
    const file = req.file;

    // Validate required fields
    if (!title || !availableDate || !dueDate) {
      const error: ApiError = new Error('Title, available date, and due date are required');
      error.statusCode = 400;
      throw error;
    }

    // Validate dates
    // Parse dates as local time (MySQL DATETIME format: "YYYY-MM-DD HH:MM:SS")
    // We need to parse them correctly without timezone conversion
    let available: Date;
    let due: Date;
    
    if (availableDate.includes(' ')) {
      // MySQL DATETIME format - parse as local time
      const [datePart, timePart] = availableDate.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
      available = new Date(year, month - 1, day, hours, minutes, seconds);
    } else {
      available = new Date(availableDate);
    }
    
    if (dueDate.includes(' ')) {
      // MySQL DATETIME format - parse as local time
      const [datePart, timePart] = dueDate.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
      due = new Date(year, month - 1, day, hours, minutes, seconds);
    } else {
      due = new Date(dueDate);
    }

    if (due <= available) {
      const error: ApiError = new Error('Due date must be after available date');
      error.statusCode = 400;
      throw error;
    }

    // Handle file upload if present
    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;
    let attachmentMimeType: string | null = null;

    if (file) {
      attachmentPath = `uploads/assignments/${file.filename}`;
      attachmentName = file.originalname;
      attachmentMimeType = file.mimetype;
    }

    // Insert assignment
    // MySQL DATETIME stores values as-is without timezone
    // We send the datetime string directly and MySQL stores it exactly
    const query = `
      INSERT INTO club_assignments 
      (club_id, title, description, max_score, available_date, due_date, created_by, attachment_path, attachment_name, attachment_mime_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute<ResultSetHeader>(query, [
      clubId,
      title,
      description || null,
      maxScore || null,
      availableDate,
      dueDate,
      userId,
      attachmentPath,
      attachmentName,
      attachmentMimeType
    ]);

    // Fetch the created assignment
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM club_assignments WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      assignment: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Update an assignment (leader only)
export const updateAssignment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    const file = req.file;
    
    // Debug logging
    console.log('Update assignment request body:', req.body);
    console.log('Update assignment file:', req.file ? {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'No file received');
    
    // Parse FormData fields from req.body (multer puts non-file fields in req.body as strings)
    // Similar to createAssignment, but only include fields that are provided
    const updates: UpdateAssignmentRequest = {};
    
    // Title - always include if provided (required field)
    if (req.body.title !== undefined && req.body.title !== null && req.body.title !== '') {
      updates.title = req.body.title.trim();
    }
    
    // Description - include if provided (can be empty string)
    if (req.body.description !== undefined && req.body.description !== null) {
      updates.description = req.body.description.trim() || undefined;
    }
    
    // MaxScore - include if provided and not empty
    if (req.body.maxScore !== undefined && req.body.maxScore !== null && req.body.maxScore !== '') {
      const maxScoreNum = Number(req.body.maxScore);
      if (!isNaN(maxScoreNum)) {
        updates.maxScore = maxScoreNum;
      }
    }
    
    // AvailableDate - include if provided and not empty
    if (req.body.availableDate !== undefined && req.body.availableDate !== null && req.body.availableDate !== '') {
      updates.availableDate = req.body.availableDate;
    }
    
    // DueDate - include if provided and not empty
    if (req.body.dueDate !== undefined && req.body.dueDate !== null && req.body.dueDate !== '') {
      updates.dueDate = req.body.dueDate;
    }
    
    // RemoveAttachment flag
    if (req.body.removeAttachment === 'true') {
      updates.removeAttachment = true;
    }
    
    console.log('Parsed updates:', updates);

    // Get current assignment to check for existing attachment
    const [currentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT attachment_path FROM club_assignments WHERE id = ?',
      [assignmentId]
    );
    const currentAttachmentPath = currentRows.length > 0 ? currentRows[0].attachment_path : null;

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(updates.description);
    }
    if (updates.maxScore !== undefined) {
      updateFields.push('max_score = ?');
      updateValues.push(updates.maxScore);
    }
    if (updates.availableDate !== undefined) {
      updateFields.push('available_date = ?');
      updateValues.push(updates.availableDate);
    }
    if (updates.dueDate !== undefined) {
      updateFields.push('due_date = ?');
      updateValues.push(updates.dueDate);
    }

    // Handle file upload/removal
    if (updates.removeAttachment === true) {
      // Remove attachment
      if (currentAttachmentPath) {
        deleteFile(currentAttachmentPath);
      }
      updateFields.push('attachment_path = ?');
      updateFields.push('attachment_name = ?');
      updateFields.push('attachment_mime_type = ?');
      updateValues.push(null, null, null);
    } else if (file) {
      // New file uploaded - delete old one if exists
      if (currentAttachmentPath) {
        deleteFile(currentAttachmentPath);
      }
      const attachmentPath = `uploads/assignments/${file.filename}`;
      const attachmentName = file.originalname;
      const attachmentMimeType = file.mimetype;
      
      console.log('Adding attachment to update:', {
        attachmentPath,
        attachmentName,
        attachmentMimeType
      });
      
      updateFields.push('attachment_path = ?');
      updateFields.push('attachment_name = ?');
      updateFields.push('attachment_mime_type = ?');
      updateValues.push(attachmentPath, attachmentName, attachmentMimeType);
    }

    if (updateFields.length === 0 && !file && !updates.removeAttachment) {
      const error: ApiError = new Error('No fields to update');
      error.statusCode = 400;
      throw error;
    }

    updateValues.push(assignmentId);

    const query = `
      UPDATE club_assignments 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    console.log('Executing update query:', query);
    console.log('Update values:', updateValues);
    
    await pool.execute(query, updateValues);

    // Fetch updated assignment with proper field names (camelCase)
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        ca.id,
        ca.club_id as clubId,
        ca.title,
        ca.description,
        ca.max_score as maxScore,
        DATE_FORMAT(ca.available_date, '%Y-%m-%d %H:%i:%s') as availableDate,
        DATE_FORMAT(ca.due_date, '%Y-%m-%d %H:%i:%s') as dueDate,
        ca.attachment_path as attachmentPath,
        ca.attachment_name as attachmentName,
        ca.attachment_mime_type as attachmentMimeType,
        ca.created_by as createdBy,
        ca.created_at as createdAt,
        ca.updated_at as updatedAt,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM club_assignments ca
      LEFT JOIN users u ON ca.created_by = u.id
      WHERE ca.id = ?`,
      [assignmentId]
    );

    if (rows.length === 0) {
      const error: ApiError = new Error('Assignment not found after update');
      error.statusCode = 404;
      throw error;
    }

    console.log('Updated assignment from database:', {
      id: rows[0].id,
      attachmentPath: rows[0].attachmentPath,
      attachmentName: rows[0].attachmentName,
      attachmentMimeType: rows[0].attachmentMimeType
    });

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      assignment: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Delete an assignment (leader only)
export const deleteAssignment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);

    // Get attachment path before deleting
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT attachment_path FROM club_assignments WHERE id = ?',
      [assignmentId]
    );
    const attachmentPath = rows.length > 0 ? rows[0].attachment_path : null;

    // Delete will cascade to submissions due to foreign key constraint
    const query = 'DELETE FROM club_assignments WHERE id = ?';
    await pool.execute(query, [assignmentId]);

    // Delete attachment file if exists
    if (attachmentPath) {
      deleteFile(attachmentPath);
    }

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

