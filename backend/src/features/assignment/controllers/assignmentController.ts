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

    // Check if user is a leader or admin of this club
    const isAdmin = req.user?.role === 'admin';
    
    // Check if user is president of the club
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT president_id FROM clubs WHERE id = ?',
      [clubId]
    );
    const isPresident = clubRows.length > 0 && clubRows[0].president_id === userId;
    
    // Check if user has leader role in membership
    let isLeader = false;
    if (userId) {
      const [membershipRows] = await pool.execute<RowDataPacket[]>(
        'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
        [userId, clubId, 'approved']
      );
      const hasLeaderMembership = membershipRows.length > 0 && membershipRows[0].role === 'leader';
      isLeader = isPresident || hasLeaderMembership;
    }

    // Get all assignments for the club
    // For members (non-leaders), filter out assignments where is_visible = 0
    // Leaders and admins can see all assignments
    const visibilityFilter = (isLeader || isAdmin) ? '' : 'AND (ca.is_visible IS NULL OR ca.is_visible = 1)';
    
    const query = `
      SELECT 
        ca.id,
        ca.club_id as clubId,
        ca.title,
        ca.description,
        ca.max_score as maxScore,
        DATE_FORMAT(ca.available_date, '%Y-%m-%d %H:%i:%s') as availableDate,
        DATE_FORMAT(ca.due_date, '%Y-%m-%d %H:%i:%s') as dueDate,
        ca.is_visible as isVisible,
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
      WHERE ca.club_id = ? ${visibilityFilter}
      ORDER BY ca.due_date DESC, ca.created_at DESC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [clubId]);

    // For each assignment, check if user has submitted and get their submission info, and get attachments
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

        // Get attachments from assignment_attachments table
        const [attachmentRows] = await pool.execute<RowDataPacket[]>(
          `SELECT 
            id,
            assignment_id as assignmentId,
            file_path as filePath,
            file_name as fileName,
            file_mime_type as fileMimeType,
            file_size as fileSize,
            created_at as createdAt,
            updated_at as updatedAt
          FROM assignment_attachments
          WHERE assignment_id = ?
          ORDER BY created_at ASC`,
          [assignment.id]
        );

        const attachments = attachmentRows.map(row => ({
          id: row.id,
          assignmentId: row.assignmentId,
          filePath: row.filePath,
          fileName: row.fileName,
          fileMimeType: row.fileMimeType || null,
          fileSize: row.fileSize || null,
          createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
          updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt
        }));

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
          isVisible: assignment.isVisible === 1 || assignment.isVisible === true || assignment.isVisible === undefined,
          availableDate: formatDateTime(assignment.availableDate),
          dueDate: formatDateTime(assignment.dueDate),
          createdAt: assignment.createdAt instanceof Date 
            ? assignment.createdAt.toISOString() 
            : assignment.createdAt,
          updatedAt: assignment.updatedAt instanceof Date 
            ? assignment.updatedAt.toISOString() 
            : assignment.updatedAt,
          attachments: attachments.length > 0 ? attachments : undefined,
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
      // Parse dates as UTC (MySQL DATETIME is stored as UTC)
      let availableDate: Date;
      let dueDate: Date;
      
      if (typeof assignment.availableDate === 'string' && assignment.availableDate.includes(' ')) {
        const [datePart, timePart] = assignment.availableDate.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
        // Parse as UTC since MySQL DATETIME is stored as UTC
        availableDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
      } else {
        availableDate = new Date(assignment.availableDate);
      }
      
      if (typeof assignment.dueDate === 'string' && assignment.dueDate.includes(' ')) {
        const [datePart, timePart] = assignment.dueDate.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
        // Parse as UTC since MySQL DATETIME is stored as UTC
        dueDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
      } else {
        dueDate = new Date(assignment.dueDate);
      }
      const hasSubmission = assignment.userSubmission !== null;
      const isGraded = hasSubmission && assignment.userSubmission.gradedAt !== null;
      
      // Parse submission date as UTC for comparison
      let submittedDate: Date | null = null;
      if (hasSubmission && assignment.userSubmission.submittedAt) {
        const submittedAtStr = assignment.userSubmission.submittedAt;
        if (typeof submittedAtStr === 'string' && submittedAtStr.includes(' ')) {
          const [datePart, timePart] = submittedAtStr.split(' ');
          const [year, month, day] = datePart.split('-').map(Number);
          const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
          submittedDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
        } else {
          submittedDate = new Date(submittedAtStr);
        }
      }
      const submittedOnTime = hasSubmission && submittedDate && submittedDate <= dueDate;

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
  } catch (error: any) {
    console.error('Error in getClubAssignments:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.sql) {
      console.error('SQL Error:', error.sql);
    }
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
        ca.is_visible as isVisible,
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
    const clubId = assignment.clubId;

    // Check if user is a leader or admin of this club
    const isAdmin = req.user?.role === 'admin';
    
    // Check if user is president of the club
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT president_id FROM clubs WHERE id = ?',
      [clubId]
    );
    const isPresident = clubRows.length > 0 && clubRows[0].president_id === userId;
    
    // Check if user has leader role in membership
    let isLeader = false;
    if (userId) {
      const [membershipRows] = await pool.execute<RowDataPacket[]>(
        'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
        [userId, clubId, 'approved']
      );
      const hasLeaderMembership = membershipRows.length > 0 && membershipRows[0].role === 'leader';
      isLeader = isPresident || hasLeaderMembership;
    }

    // For members (non-leaders), check if assignment is visible
    // Leaders and admins can see all assignments
    if (!isLeader && !isAdmin) {
      // is_visible can be NULL (defaults to visible) or 1 (visible) or 0 (hidden)
      if (assignment.isVisible === 0) {
        const error: ApiError = new Error('Assignment not found');
        error.statusCode = 404;
        throw error;
      }
    }

    // Get attachments from assignment_attachments table
    const attachmentsQuery = `
      SELECT 
        id,
        assignment_id as assignmentId,
        file_path as filePath,
        file_name as fileName,
        file_mime_type as fileMimeType,
        file_size as fileSize,
        created_at as createdAt,
        updated_at as updatedAt
      FROM assignment_attachments
      WHERE assignment_id = ?
      ORDER BY created_at ASC
    `;

    const [attachmentRows] = await pool.execute<RowDataPacket[]>(attachmentsQuery, [assignmentId]);
    const attachments = attachmentRows.map(row => ({
      id: row.id,
      assignmentId: row.assignmentId,
      filePath: row.filePath,
      fileName: row.fileName,
      fileMimeType: row.fileMimeType || null,
      fileSize: row.fileSize || null,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt
    }));

    console.log('getAssignment - attachments found:', attachments.length);
    console.log('getAssignment - attachments:', attachments);

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
        isVisible: assignment.isVisible === 1 || assignment.isVisible === true,
        attachments: attachments.length > 0 ? attachments : undefined,
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

    // Insert assignment (without attachment fields - we'll use assignment_attachments table)
    // MySQL DATETIME stores values as-is without timezone
    // We send the datetime string directly and MySQL stores it exactly
    const query = `
      INSERT INTO club_assignments 
      (club_id, title, description, max_score, available_date, due_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute<ResultSetHeader>(query, [
      clubId,
      title,
      description || null,
      maxScore || null,
      availableDate,
      dueDate,
      userId
    ]);

    const assignmentId = result.insertId;

    // Handle multiple file uploads if present
    const files = req.files as Express.Multer.File[] | undefined;
    if (files && files.length > 0) {
      const attachmentInsertQuery = `
        INSERT INTO assignment_attachments 
        (assignment_id, file_path, file_name, file_mime_type, file_size)
        VALUES (?, ?, ?, ?, ?)
      `;

      for (const file of files) {
        const attachmentPath = `uploads/assignments/${file.filename}`;
        
        // Fix filename encoding (Windows Latin-1 → UTF-8 issue)
        // The filename on disk is already fixed by multer, but originalname needs fixing for DB
        const fixedFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        
        await pool.execute(attachmentInsertQuery, [
          assignmentId,
          attachmentPath,
          fixedFileName, // Use fixed filename for database
          file.mimetype,
          file.size
        ]);
      }
    }

    // Fetch the created assignment with attachments
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        ca.id,
        ca.club_id as clubId,
        ca.title,
        ca.description,
        ca.max_score as maxScore,
        DATE_FORMAT(ca.available_date, '%Y-%m-%d %H:%i:%s') as availableDate,
        DATE_FORMAT(ca.due_date, '%Y-%m-%d %H:%i:%s') as dueDate,
        ca.created_by as createdBy,
        ca.created_at as createdAt,
        ca.updated_at as updatedAt
      FROM club_assignments ca
      WHERE ca.id = ?`,
      [assignmentId]
    );

    // Get attachments
    const [attachmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        id,
        assignment_id as assignmentId,
        file_path as filePath,
        file_name as fileName,
        file_mime_type as fileMimeType,
        file_size as fileSize,
        created_at as createdAt,
        updated_at as updatedAt
      FROM assignment_attachments
      WHERE assignment_id = ?
      ORDER BY created_at ASC`,
      [assignmentId]
    );

    const attachments = attachmentRows.map(row => ({
      id: row.id,
      assignmentId: row.assignmentId,
      filePath: row.filePath,
      fileName: row.fileName,
      fileMimeType: row.fileMimeType || null,
      fileSize: row.fileSize || null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      assignment: {
        ...rows[0],
        attachments: attachments.length > 0 ? attachments : undefined
      }
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
    
    // Verify assignment exists first
    const [assignmentCheck] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM club_assignments WHERE id = ?',
      [assignmentId]
    );
    
    if (assignmentCheck.length === 0) {
      const error: ApiError = new Error('Assignment not found');
      error.statusCode = 404;
      throw error;
    }
    
    // Debug logging - check multer processing
    console.log('=== UPDATE ASSIGNMENT DEBUG ===');
    console.log('Update assignment request body:', req.body);
    console.log('Update assignment req.files:', req.files);
    console.log('Update assignment req.files type:', typeof req.files);
    console.log('Update assignment req.files is array:', Array.isArray(req.files));
    console.log('Update assignment req.files keys:', req.files ? Object.keys(req.files as any) : 'none');
    if (req.files && !Array.isArray(req.files)) {
      console.log('Update assignment req.files structure:', JSON.stringify(req.files, null, 2));
    }
    console.log('Update assignment req.file:', req.file);
    console.log('Update assignment files count:', req.files ? (Array.isArray(req.files) ? req.files.length : 1) : 0);
    console.log('Request headers content-type:', req.headers['content-type']);
    
    // CRITICAL: Check if multer actually processed files
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      console.log('✅ MULTER FILES DETECTED:', req.files.map((f: any) => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size,
        path: f.path
      })));
    } else if (req.file) {
      console.log('✅ MULTER SINGLE FILE DETECTED:', {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });
    } else {
      console.log('❌ NO FILES DETECTED BY MULTER - req.files and req.file are both empty/null');
    }
    
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
    
    // isVisible - include if provided (can be 'true' or 'false' as string from FormData)
    if (req.body.isVisible !== undefined && req.body.isVisible !== null && req.body.isVisible !== '') {
      // Convert string 'true'/'false' to boolean
      updates.isVisible = req.body.isVisible === 'true' || req.body.isVisible === true;
    }
    
    console.log('Parsed updates:', updates);

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
    if (updates.isVisible !== undefined) {
      updateFields.push('is_visible = ?');
      updateValues.push(updates.isVisible ? 1 : 0);
    }

    // Handle multiple file uploads - add new attachments (not replace)
    // Multer with upload.array() puts files in req.files as an array
    // IMPORTANT: Check both req.files (array) and req.file (single) for compatibility
    let files: Express.Multer.File[] | undefined;
    
    if (req.files) {
      if (Array.isArray(req.files)) {
        files = req.files as Express.Multer.File[];
        console.log('updateAssignment - files from array:', files.length);
      } else if (typeof req.files === 'object') {
        // Sometimes multer returns an object with field names as keys
        console.log('updateAssignment - req.files is object, keys:', Object.keys(req.files));
        const filesArray: Express.Multer.File[] = [];
        for (const key in req.files) {
          if (Array.isArray(req.files[key])) {
            filesArray.push(...(req.files[key] as Express.Multer.File[]));
          } else {
            filesArray.push(req.files[key] as Express.Multer.File);
          }
        }
        files = filesArray.length > 0 ? filesArray : undefined;
        console.log('updateAssignment - extracted files from object:', files ? files.length : 0);
      }
    } else if (req.file) {
      // Fallback to single file
      console.log('updateAssignment - using req.file (single file)');
      files = [req.file];
    } else {
      console.log('updateAssignment - no files found in req.files or req.file');
    }
    
    console.log('updateAssignment - req.files type:', typeof req.files);
    console.log('updateAssignment - req.files is array:', Array.isArray(req.files));
    console.log('updateAssignment - req.files keys:', req.files ? Object.keys(req.files as any) : 'none');
    console.log('updateAssignment - req.file:', req.file ? 'exists' : 'none');
    console.log('updateAssignment - final files count:', files ? files.length : 0);
    if (files && files.length > 0) {
      console.log('updateAssignment - file details:', files.map(f => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size,
        path: f.path
      })));
    }
    
    // Count existing attachments before adding new ones
    const [existingAttachments] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM assignment_attachments WHERE assignment_id = ?',
      [assignmentId]
    );
    const existingCount = existingAttachments[0]?.count || 0;
    console.log('updateAssignment - existing attachments count:', existingCount);
    
    // Process files FIRST, before any assignment updates
    // This ensures files are saved even if assignment update fails
    console.log('updateAssignment - Checking files variable:', {
      filesDefined: files !== undefined,
      filesIsArray: Array.isArray(files),
      filesLength: files ? files.length : 0,
      filesValue: files
    });
    
    if (files && files.length > 0) {
      console.log('updateAssignment - ✅ FILES DETECTED - STARTING file processing for', files.length, 'file(s)');
      console.log('updateAssignment - processing files:', files.map(f => ({
        originalname: f.originalname,
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size,
        path: f.path,
        destination: (f as any).destination
      })));
      
      const attachmentInsertQuery = `
        INSERT INTO assignment_attachments 
        (assignment_id, file_path, file_name, file_mime_type, file_size)
        VALUES (?, ?, ?, ?, ?)
      `;

      const insertedAttachmentIds: number[] = [];

      for (const file of files) {
        const attachmentPath = `uploads/assignments/${file.filename}`;
        
        // Fix filename encoding (Windows Latin-1 → UTF-8 issue)
        // The filename on disk is already fixed by multer, but originalname needs fixing for DB
        const fixedFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        
        console.log('updateAssignment - inserting attachment:', {
          assignmentId,
          attachmentPath,
          originalName: file.originalname,
          fixedFileName: fixedFileName,
          mimeType: file.mimetype,
          size: file.size,
          fileExists: require('fs').existsSync(file.path)
        });
        
        try {
          // Verify file actually exists on disk before inserting
          const fs = require('fs');
          if (!fs.existsSync(file.path)) {
            console.error('updateAssignment - CRITICAL: File does not exist on disk:', file.path);
            throw new Error(`File not found on disk: ${file.path}`);
          }
          
          const [insertResult] = await pool.execute<ResultSetHeader>(attachmentInsertQuery, [
            assignmentId,
            attachmentPath,
            fixedFileName, // Use fixed filename for database
            file.mimetype,
            file.size
          ]);
          console.log('updateAssignment - INSERT query executed');
          console.log('updateAssignment - insertResult:', {
            insertId: insertResult.insertId,
            affectedRows: insertResult.affectedRows,
            warningStatus: insertResult.warningStatus
          });
          
          if (!insertResult.insertId || insertResult.affectedRows === 0) {
            console.error('updateAssignment - INSERT failed: no insert ID or affected rows');
            throw new Error(`Failed to insert attachment: insertId=${insertResult.insertId}, affectedRows=${insertResult.affectedRows}`);
          }
          
          insertedAttachmentIds.push(insertResult.insertId);
          
          // Immediately verify the insert by querying the database
          const [verifyRows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM assignment_attachments WHERE id = ?',
            [insertResult.insertId]
          );
          if (verifyRows.length === 0) {
            console.error('updateAssignment - CRITICAL: Insert returned ID but row not found in database!');
            throw new Error('Attachment insert verification failed: row not found');
          }
          console.log('updateAssignment - ✅ insert verified, row exists:', {
            id: verifyRows[0].id,
            assignment_id: verifyRows[0].assignment_id,
            file_name: verifyRows[0].file_name,
            file_path: verifyRows[0].file_path
          });
        } catch (insertError: any) {
          console.error('updateAssignment - ❌ ERROR inserting attachment:', insertError);
          console.error('updateAssignment - error message:', insertError.message);
          console.error('updateAssignment - error code:', insertError.code);
          console.error('updateAssignment - error stack:', insertError.stack);
          if (insertError.sql) {
            console.error('updateAssignment - error SQL:', insertError.sql);
          }
          // Throw error to prevent silent failure
          const error: ApiError = new Error(`Failed to save attachment: ${insertError.message}`);
          error.statusCode = 500;
          throw error;
        }
      }
      
      console.log('updateAssignment - ✅ All files processed. Inserted attachment IDs:', insertedAttachmentIds);
      
      // Verify attachments were actually inserted
      const [afterInsertAttachments] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM assignment_attachments WHERE assignment_id = ?',
        [assignmentId]
      );
      const afterInsertCount = afterInsertAttachments[0]?.count || 0;
      console.log('updateAssignment - attachments count after insert:', afterInsertCount);
      console.log('updateAssignment - expected count:', existingCount + files.length);
      if (afterInsertCount !== existingCount + files.length) {
        console.error('updateAssignment - CRITICAL ERROR: Attachment count mismatch!');
        console.error(`Expected ${existingCount + files.length} attachments, but found ${afterInsertCount}`);
        // Don't throw here - we want to continue and return what we have
        // But log it as a critical error
      } else {
        console.log('updateAssignment - SUCCESS: All attachments inserted correctly');
      }
      
      // Also verify by selecting the actual rows
      const [verifyAllAttachments] = await pool.execute<RowDataPacket[]>(
        'SELECT id, file_name, file_path FROM assignment_attachments WHERE assignment_id = ? ORDER BY created_at DESC',
        [assignmentId]
      );
      console.log('updateAssignment - all attachments in DB:', verifyAllAttachments.map(a => ({
        id: a.id,
        fileName: a.file_name,
        filePath: a.file_path
      })));
    } else {
      console.log('updateAssignment - no files to process');
    }

    // Only update assignment fields if there are fields to update
    // Files are handled separately and don't require assignment table update
    if (updateFields.length > 0) {
      updateValues.push(assignmentId);

      const query = `
        UPDATE club_assignments 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      console.log('Executing update query:', query);
      console.log('Update values:', updateValues);
      
      await pool.execute(query, updateValues);
    } else if (!files || files.length === 0) {
      // If no fields to update and no files, throw error
      const error: ApiError = new Error('No fields to update');
      error.statusCode = 400;
      throw error;
    }

    // Fetch updated assignment with proper field names (camelCase)
    // Always fetch assignment data, even if no fields were updated
    console.log('updateAssignment - fetching assignment data for response, assignmentId:', assignmentId);
    let rows: RowDataPacket[];
    try {
      const [rowsResult] = await pool.execute<RowDataPacket[]>(
        `      SELECT 
        ca.id,
        ca.club_id as clubId,
        ca.title,
        ca.description,
        ca.max_score as maxScore,
        DATE_FORMAT(ca.available_date, '%Y-%m-%d %H:%i:%s') as availableDate,
        DATE_FORMAT(ca.due_date, '%Y-%m-%d %H:%i:%s') as dueDate,
        ca.is_visible as isVisible,
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
      rows = rowsResult;
    } catch (queryError: any) {
      console.error('updateAssignment - ERROR fetching assignment:', queryError);
      throw queryError;
    }

    console.log('updateAssignment - assignment query returned', rows.length, 'row(s)');
    if (rows.length === 0) {
      console.error('updateAssignment - CRITICAL: Assignment not found after update!');
      const error: ApiError = new Error('Assignment not found after update');
      error.statusCode = 404;
      throw error;
    }
    
    console.log('updateAssignment - assignment data:', {
      id: rows[0].id,
      title: rows[0].title,
      clubId: rows[0].clubId
    });

    // Get attachments from assignment_attachments table
    console.log('updateAssignment - fetching attachments for assignment_id:', assignmentId);
    const [attachmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        id,
        assignment_id as assignmentId,
        file_path as filePath,
        file_name as fileName,
        file_mime_type as fileMimeType,
        file_size as fileSize,
        created_at as createdAt,
        updated_at as updatedAt
      FROM assignment_attachments
      WHERE assignment_id = ?
      ORDER BY created_at ASC`,
      [assignmentId]
    );
    console.log('updateAssignment - attachment query returned', attachmentRows.length, 'rows');
    if (attachmentRows.length > 0) {
      console.log('updateAssignment - attachment details:', attachmentRows.map(r => ({
        id: r.id,
        assignmentId: r.assignmentId,
        fileName: r.fileName,
        filePath: r.filePath
      })));
    }

    const attachments = attachmentRows.map(row => ({
      id: row.id,
      assignmentId: row.assignmentId,
      filePath: row.filePath,
      fileName: row.fileName,
      fileMimeType: row.fileMimeType || null,
      fileSize: row.fileSize || null,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt
    }));

    console.log('Update assignment - attachments query result count:', attachmentRows.length);
    console.log('Update assignment - attachments found:', attachments.length);
    console.log('Update assignment - attachments:', JSON.stringify(attachments, null, 2));

    const assignmentData = rows[0] as any;
    const responseAssignment = {
      ...assignmentData,
      isVisible: assignmentData.isVisible === 1 || assignmentData.isVisible === true || assignmentData.isVisible === undefined,
      attachments: attachments.length > 0 ? attachments : undefined
    };

    console.log('Update assignment - response assignment:', {
      id: responseAssignment.id,
      attachmentsCount: responseAssignment.attachments?.length || 0,
      attachments: responseAssignment.attachments
    });

    // Include debug info in response for troubleshooting
    const debugInfo = {
      filesReceived: files ? files.length : 0,
      filesProcessed: files ? files.length : 0,
      attachmentsBefore: existingCount,
      attachmentsAfter: attachments.length,
      assignmentId: assignmentId
    };
    
    console.log('updateAssignment - FINAL RESPONSE DEBUG:', debugInfo);
    console.log('updateAssignment - Response assignment attachments:', attachments.length);
    
    res.json({
      success: true,
      message: 'Assignment updated successfully',
      assignment: responseAssignment,
      // Include debug info in development
      ...(process.env.NODE_ENV !== 'production' && { debug: debugInfo })
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

    // Get all attachment paths before deleting (from assignment_attachments table)
    const [attachmentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT file_path FROM assignment_attachments WHERE assignment_id = ?',
      [assignmentId]
    );

    // Delete will cascade to submissions and attachments due to foreign key constraints
    const query = 'DELETE FROM club_assignments WHERE id = ?';
    await pool.execute(query, [assignmentId]);

    // Delete attachment files if they exist
    for (const row of attachmentRows) {
      if (row.file_path) {
        deleteFile(row.file_path);
      }
    }

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete a single attachment (leader only)
export const deleteAttachment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    const attachmentId = parseInt(req.params.attachmentId);
    const userId = req.user?.userId;

    // Verify assignment exists and user is leader
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT ca.club_id, cm.role 
       FROM club_assignments ca
       JOIN club_memberships cm ON ca.club_id = cm.club_id
       WHERE ca.id = ? AND cm.user_id = ? AND cm.role IN ('leader', 'admin')`,
      [assignmentId, userId]
    );

    if (assignmentRows.length === 0) {
      const error: ApiError = new Error('Assignment not found or you do not have permission');
      error.statusCode = 404;
      throw error;
    }

    // Get attachment info before deleting
    const [attachmentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT file_path FROM assignment_attachments WHERE id = ? AND assignment_id = ?',
      [attachmentId, assignmentId]
    );

    if (attachmentRows.length === 0) {
      const error: ApiError = new Error('Attachment not found');
      error.statusCode = 404;
      throw error;
    }

    const filePath = attachmentRows[0].file_path;

    // Delete attachment from database
    await pool.execute(
      'DELETE FROM assignment_attachments WHERE id = ? AND assignment_id = ?',
      [attachmentId, assignmentId]
    );

    // Delete file from filesystem
    if (filePath) {
      deleteFile(filePath);
    }

    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

