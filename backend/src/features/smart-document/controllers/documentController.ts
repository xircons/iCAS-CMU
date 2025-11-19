import { Response, NextFunction } from 'express';
import pool from '../../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { ApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import { CreateDocumentRequest, UpdateDocumentRequest, UpdateDocumentStatusRequest, UpdateMemberSubmissionStatusRequest, ReviewSubmissionRequest, SmartDocument, DocumentAssignment, BulkUpdateStatusRequest, BulkAssignRequest, BulkDeleteRequest, BulkExportRequest } from '../types/document';
import path from 'path';
import fs from 'fs';
import { deleteFile } from '../utils/fileUpload';

// Get all documents for a club
export const getClubDocuments = async (
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

    if (!isLeader && !isAdmin) {
      const error: ApiError = new Error('Only club leaders can view documents');
      error.statusCode = 403;
      throw error;
    }

    // Get all documents for the club
    const query = `
      SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      LEFT JOIN users u ON sd.created_by = u.id
      WHERE sd.club_id = ?
      ORDER BY sd.due_date DESC, sd.created_at DESC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [clubId]);

    // Get assignments for each document
    const documentsWithAssignments = await Promise.all(
      rows.map(async (doc: any) => {
        const [assignmentRows] = await pool.execute<RowDataPacket[]>(
          `SELECT 
            da.id,
            da.document_id as documentId,
            da.user_id as userId,
            da.status,
            da.submission_status as submissionStatus,
            da.file_path as filePath,
            da.file_name as fileName,
            da.file_size as fileSize,
            da.file_mime_type as fileMimeType,
            DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
            da.admin_comment as adminComment,
            DATE_FORMAT(da.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
            DATE_FORMAT(da.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
            u.first_name as userFirstName,
            u.last_name as userLastName,
            u.email as userEmail,
            u.avatar as userAvatar,
            cm.role as userRole
          FROM document_assignments da
          JOIN users u ON da.user_id = u.id
          LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
          WHERE da.document_id = ?
          ORDER BY da.created_at ASC`,
          [clubId, doc.id]
        );

        const assignedMembers = assignmentRows.map((row: any) => ({
          userId: row.userId,
          firstName: row.userFirstName,
          lastName: row.userLastName,
          avatar: row.userAvatar || undefined,
          role: row.userRole || undefined,
          submissionStatus: row.submissionStatus || 'Not Submitted',
          filePath: row.filePath || undefined,
          fileName: row.fileName || undefined,
          fileSize: row.fileSize || undefined,
          fileMimeType: row.fileMimeType || undefined,
          submittedAt: row.submittedAt ? new Date(row.submittedAt) : undefined,
          adminComment: row.adminComment || undefined,
        }));

        const assignedMemberIds = assignmentRows.map((row: any) => row.userId);

        // Compute overdue status
        const dueDate = new Date(doc.dueDate);
        const isOverdue = dueDate < new Date() && doc.status !== 'Completed';

        return {
          ...doc,
          assignedMemberIds,
          assignedMembers,
          isOverdue,
        };
      })
    );

    res.json({
      success: true,
      documents: documentsWithAssignments,
    });
  } catch (error: any) {
    console.error('Error in getClubDocuments:', error);
    next(error);
  }
};

// Get a single document
export const getDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const clubId = parseInt(req.params.clubId);
    const userId = req.user?.userId;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    // Check if user is admin or leader
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

    const query = `
      SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      LEFT JOIN users u ON sd.created_by = u.id
      WHERE sd.id = ? AND sd.club_id = ?
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [documentId, clubId]);

    if (rows.length === 0) {
      const error: ApiError = new Error('Document not found');
      error.statusCode = 404;
      throw error;
    }

    const doc = rows[0];

    // For members (non-leaders), check if they're assigned to this document
    if (!isLeader && !isAdmin) {
      const [assignmentCheck] = await pool.execute<RowDataPacket[]>(
        'SELECT user_id FROM document_assignments WHERE document_id = ? AND user_id = ?',
        [documentId, userId]
      );

      if (assignmentCheck.length === 0) {
        const error: ApiError = new Error('You do not have access to this document');
        error.statusCode = 403;
        throw error;
      }
    }

    // Get assignments
    // For members, only show their own assignment; for leaders/admins, show all
    let assignmentRows: RowDataPacket[];
    if (isLeader || isAdmin) {
      [assignmentRows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
          da.id,
          da.document_id as documentId,
          da.user_id as userId,
          da.status,
          da.submission_status as submissionStatus,
          da.file_path as filePath,
          da.file_name as fileName,
          da.file_size as fileSize,
          da.file_mime_type as fileMimeType,
          DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
          da.admin_comment as adminComment,
          DATE_FORMAT(da.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
          DATE_FORMAT(da.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
          u.first_name as userFirstName,
          u.last_name as userLastName,
          u.email as userEmail,
          u.avatar as userAvatar,
          cm.role as userRole
        FROM document_assignments da
        JOIN users u ON da.user_id = u.id
        LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
        WHERE da.document_id = ?
        ORDER BY da.created_at ASC`,
        [clubId, documentId]
      );
    } else {
      // For members, only get their own assignment
      [assignmentRows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
          da.id,
          da.document_id as documentId,
          da.user_id as userId,
          da.status,
          da.submission_status as submissionStatus,
          da.file_path as filePath,
          da.file_name as fileName,
          da.file_size as fileSize,
          da.file_mime_type as fileMimeType,
          DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
          da.admin_comment as adminComment,
          DATE_FORMAT(da.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
          DATE_FORMAT(da.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
          u.first_name as userFirstName,
          u.last_name as userLastName,
          u.email as userEmail,
          u.avatar as userAvatar,
          cm.role as userRole
        FROM document_assignments da
        JOIN users u ON da.user_id = u.id
        LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
        WHERE da.document_id = ? AND da.user_id = ?
        ORDER BY da.created_at ASC`,
        [clubId, documentId, userId]
      );
    }

    const assignedMembers = assignmentRows.map((row: any) => ({
      userId: row.userId,
      firstName: row.userFirstName,
      lastName: row.userLastName,
      avatar: row.userAvatar || undefined,
      role: row.userRole || undefined,
      submissionStatus: row.submissionStatus || 'Not Submitted',
      filePath: row.filePath || undefined,
      fileName: row.fileName || undefined,
      fileSize: row.fileSize || undefined,
      fileMimeType: row.fileMimeType || undefined,
      submittedAt: row.submittedAt ? new Date(row.submittedAt) : undefined,
      adminComment: row.adminComment || undefined,
    }));

    const assignedMemberIds = assignmentRows.map((row: any) => row.userId);

    // Compute overdue status
    const dueDate = new Date(doc.dueDate);
    const isOverdue = dueDate < new Date() && doc.status !== 'Completed';

    res.json({
      success: true,
      document: {
        ...doc,
        assignedMemberIds,
        assignedMembers,
        isOverdue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get documents assigned to the current user (member access)
export const getMemberAssignedDocuments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.clubId);
    const userId = req.user?.userId;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    // Verify user is a member of the club and get user info
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      `SELECT cm.role, u.first_name, u.last_name, u.avatar 
       FROM club_memberships cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.user_id = ? AND cm.club_id = ? AND cm.status = ?`,
      [userId, clubId, 'approved']
    );

    if (membershipRows.length === 0) {
      const error: ApiError = new Error('User is not a member of this club');
      error.statusCode = 403;
      throw error;
    }

    const userInfo = membershipRows[0];

    // Get documents assigned to this user
    const query = `
      SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName,
        da.submission_status as submissionStatus,
        da.file_path as filePath,
        da.file_name as fileName,
        da.file_size as fileSize,
        da.file_mime_type as fileMimeType,
        DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
        da.admin_comment as adminComment
      FROM smart_documents sd
      INNER JOIN document_assignments da ON sd.id = da.document_id
      LEFT JOIN clubs c ON sd.club_id = c.id
      LEFT JOIN users u ON sd.created_by = u.id
      WHERE sd.club_id = ? AND da.user_id = ?
      ORDER BY sd.due_date ASC, sd.created_at DESC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [clubId, userId]);

    // Process documents with user's submission info
    const documents = rows.map((doc: any) => {
      // Get all assigned members for this document (for consistency with other endpoints)
      // But we'll only include the current user's info in assignedMembers
      const assignedMember = {
        userId: userId,
        firstName: userInfo.first_name || '',
        lastName: userInfo.last_name || '',
        avatar: userInfo.avatar || undefined,
        role: userInfo.role || undefined,
        submissionStatus: doc.submissionStatus || 'Not Submitted',
        filePath: doc.filePath || undefined,
        fileName: doc.fileName || undefined,
        fileSize: doc.fileSize || undefined,
        fileMimeType: doc.fileMimeType || undefined,
        submittedAt: doc.submittedAt ? new Date(doc.submittedAt) : undefined,
        adminComment: doc.adminComment || undefined,
      };

      // Compute overdue status
      const dueDate = new Date(doc.dueDate);
      const isOverdue = dueDate < new Date() && doc.status !== 'Completed';

      return {
        id: doc.id,
        clubId: doc.clubId,
        title: doc.title,
        description: doc.description,
        priority: doc.priority,
        type: doc.type,
        templatePath: doc.templatePath || undefined,
        dueDate: doc.dueDate,
        status: doc.status,
        createdBy: doc.createdBy,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        clubName: doc.clubName,
        creatorFirstName: doc.creatorFirstName,
        creatorLastName: doc.creatorLastName,
        assignedMemberIds: [userId],
        assignedMembers: [assignedMember],
        isOverdue,
      };
    });

    res.json({
      success: true,
      documents: documents,
    });
  } catch (error: any) {
    console.error('Error in getMemberAssignedDocuments:', error);
    next(error);
  }
};

// Create a new document (admin only)
export const createDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.clubId);
    const userId = req.user?.userId;
    const { title, description, priority, type, dueDate, assignedMemberIds, templatePath }: CreateDocumentRequest = req.body;

    // Validate required fields
    if (!title || !description || !dueDate) {
      const error: ApiError = new Error('Title, description, and due date are required');
      error.statusCode = 400;
      throw error;
    }

    if (!assignedMemberIds || assignedMemberIds.length === 0) {
      const error: ApiError = new Error('At least one member must be assigned');
      error.statusCode = 400;
      throw error;
    }

    // Validate due date is not in the past
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due < today) {
      const error: ApiError = new Error('Due date cannot be in the past');
      error.statusCode = 400;
      throw error;
    }

    // Insert document
    const insertQuery = `
      INSERT INTO smart_documents 
      (club_id, title, description, priority, type, template_path, due_date, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?)
    `;

    const [result] = await pool.execute<ResultSetHeader>(insertQuery, [
      clubId,
      title,
      description,
      priority || 'Medium',
      type || 'Report',
      templatePath || null,
      dueDate,
      userId,
    ]);

    const documentId = result.insertId;

    // Insert document assignments
    if (assignedMemberIds.length > 0) {
      const assignmentInsertQuery = `
        INSERT INTO document_assignments (document_id, user_id, status, submission_status)
        VALUES (?, ?, 'Open', 'Not Submitted')
      `;

      for (const memberId of assignedMemberIds) {
        await pool.execute(assignmentInsertQuery, [documentId, memberId]);
      }
    }

    // Fetch the created document with assignments
    const [docRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      LEFT JOIN users u ON sd.created_by = u.id
      WHERE sd.id = ?`,
      [documentId]
    );

    // Get assignments
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        da.user_id as userId,
        da.submission_status as submissionStatus,
        da.file_path as filePath,
        da.file_name as fileName,
        da.file_size as fileSize,
        da.file_mime_type as fileMimeType,
        DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
        da.admin_comment as adminComment,
        u.first_name as userFirstName,
        u.last_name as userLastName,
        u.avatar as userAvatar,
        cm.role as userRole
      FROM document_assignments da
      JOIN users u ON da.user_id = u.id
      LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
      WHERE da.document_id = ?`,
      [clubId, documentId]
    );

    const assignedMembers = assignmentRows.map((row: any) => ({
      userId: row.userId,
      firstName: row.userFirstName,
      lastName: row.userLastName,
      avatar: row.userAvatar || undefined,
      role: row.userRole || undefined,
      submissionStatus: row.submissionStatus || 'Not Submitted',
      filePath: row.filePath || undefined,
      fileName: row.fileName || undefined,
      fileSize: row.fileSize || undefined,
      fileMimeType: row.fileMimeType || undefined,
      submittedAt: row.submittedAt ? new Date(row.submittedAt) : undefined,
      adminComment: row.adminComment || undefined,
    }));

    const assignedMemberIds_result = assignmentRows.map((row: any) => row.userId);

    res.status(201).json({
      success: true,
      message: 'Document created successfully',
      document: {
        ...docRows[0],
        assignedMemberIds: assignedMemberIds_result,
        assignedMembers,
        isOverdue: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update a document (leader only)
export const updateDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const clubId = parseInt(req.params.clubId);
    const updates: UpdateDocumentRequest = req.body;

    // Verify document exists
    const [checkRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM smart_documents WHERE id = ? AND club_id = ?',
      [documentId, clubId]
    );

    if (checkRows.length === 0) {
      const error: ApiError = new Error('Document not found');
      error.statusCode = 404;
      throw error;
    }

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
    if (updates.priority !== undefined) {
      updateFields.push('priority = ?');
      updateValues.push(updates.priority);
    }
    if (updates.type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(updates.type);
    }
    if (updates.dueDate !== undefined) {
      updateFields.push('due_date = ?');
      updateValues.push(updates.dueDate);
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(updates.status);
    }

    // Update document if there are fields to update
    if (updateFields.length > 0) {
      updateValues.push(documentId);
      const updateQuery = `
        UPDATE smart_documents 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      await pool.execute(updateQuery, updateValues);
    }

    // Update assignments if provided
    if (updates.assignedMemberIds !== undefined) {
      // Delete existing assignments
      await pool.execute(
        'DELETE FROM document_assignments WHERE document_id = ?',
        [documentId]
      );

      // Insert new assignments
      if (updates.assignedMemberIds.length > 0) {
        const assignmentInsertQuery = `
          INSERT INTO document_assignments (document_id, user_id, status)
          VALUES (?, ?, 'Open')
        `;

        for (const memberId of updates.assignedMemberIds) {
          await pool.execute(assignmentInsertQuery, [documentId, memberId]);
        }
      }
    }

    // Fetch updated document
    const [docRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      LEFT JOIN users u ON sd.created_by = u.id
      WHERE sd.id = ?`,
      [documentId]
    );

    // Get assignments
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        da.user_id as userId,
        da.submission_status as submissionStatus,
        da.file_path as filePath,
        da.file_name as fileName,
        da.file_size as fileSize,
        da.file_mime_type as fileMimeType,
        DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
        da.admin_comment as adminComment,
        u.first_name as userFirstName,
        u.last_name as userLastName,
        u.avatar as userAvatar,
        cm.role as userRole
      FROM document_assignments da
      JOIN users u ON da.user_id = u.id
      LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
      WHERE da.document_id = ?`,
      [clubId, documentId]
    );

    const assignedMembers = assignmentRows.map((row: any) => ({
      userId: row.userId,
      firstName: row.userFirstName,
      lastName: row.userLastName,
      avatar: row.userAvatar || undefined,
      role: row.userRole || undefined,
      submissionStatus: row.submissionStatus || 'Not Submitted',
      filePath: row.filePath || undefined,
      fileName: row.fileName || undefined,
      fileSize: row.fileSize || undefined,
      fileMimeType: row.fileMimeType || undefined,
      submittedAt: row.submittedAt ? new Date(row.submittedAt) : undefined,
      adminComment: row.adminComment || undefined,
    }));

    const assignedMemberIds = assignmentRows.map((row: any) => row.userId);

    const dueDate = new Date(docRows[0].dueDate);
    const isOverdue = dueDate < new Date() && docRows[0].status !== 'Completed';

    res.json({
      success: true,
      message: 'Document updated successfully',
      document: {
        ...docRows[0],
        assignedMemberIds,
        assignedMembers,
        isOverdue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update document status (leader only)
export const updateDocumentStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const clubId = parseInt(req.params.clubId);
    const { status }: UpdateDocumentStatusRequest = req.body;

    // Verify document exists
    const [checkRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM smart_documents WHERE id = ? AND club_id = ?',
      [documentId, clubId]
    );

    if (checkRows.length === 0) {
      const error: ApiError = new Error('Document not found');
      error.statusCode = 404;
      throw error;
    }

    // Update status
    await pool.execute(
      'UPDATE smart_documents SET status = ? WHERE id = ?',
      [status, documentId]
    );

    // Fetch updated document
    const [docRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      WHERE sd.id = ?`,
      [documentId]
    );

    res.json({
      success: true,
      message: 'Document status updated successfully',
      document: docRows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Delete a document (leader only)
export const deleteDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const clubId = parseInt(req.params.clubId);

    // Verify document exists
    const [checkRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM smart_documents WHERE id = ? AND club_id = ?',
      [documentId, clubId]
    );

    if (checkRows.length === 0) {
      const error: ApiError = new Error('Document not found');
      error.statusCode = 404;
      throw error;
    }

    // Delete will cascade to document_assignments due to foreign key
    await pool.execute('DELETE FROM smart_documents WHERE id = ?', [documentId]);

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Update member submission status (leader only)
export const updateMemberSubmissionStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { clubId, documentId } = req.params;
    const userId = req.user?.id;
    const { userId: memberUserId, submissionStatus }: UpdateMemberSubmissionStatusRequest = req.body;

    if (!userId) {
      const error = new ApiError('Unauthorized', 401);
      throw error;
    }

    // Verify user is leader or admin of the club
    const [leaderRows] = await pool.execute<RowDataPacket[]>(
      `SELECT role FROM club_memberships 
       WHERE user_id = ? AND club_id = ? AND role IN ('leader', 'admin')`,
      [userId, clubId]
    );

    if (leaderRows.length === 0) {
      const error = new ApiError('Only club leaders can update member submission status', 403);
      throw error;
    }

    // Verify document exists and belongs to club
    const [docRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, status FROM smart_documents WHERE id = ? AND club_id = ?',
      [documentId, clubId]
    );

    if (docRows.length === 0) {
      const error = new ApiError('Document not found', 404);
      throw error;
    }

    // Verify assignment exists
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM document_assignments WHERE document_id = ? AND user_id = ?',
      [documentId, memberUserId]
    );

    if (assignmentRows.length === 0) {
      const error = new ApiError('Member assignment not found', 404);
      throw error;
    }

    // Update submission status
    await pool.execute(
      'UPDATE document_assignments SET submission_status = ? WHERE document_id = ? AND user_id = ?',
      [submissionStatus, documentId, memberUserId]
    );

    // Update document status based on all submissions
    await updateDocumentStatusBasedOnSubmissions(documentId);

    // Fetch updated document with assignments
    const [updatedDocRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      WHERE sd.id = ?`,
      [documentId]
    );

    const [updatedAssignmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        da.id,
        da.document_id as documentId,
        da.user_id as userId,
        da.status,
        da.submission_status as submissionStatus,
        da.file_path as filePath,
        da.file_name as fileName,
        da.file_size as fileSize,
        da.file_mime_type as fileMimeType,
        DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
        da.admin_comment as adminComment,
        DATE_FORMAT(da.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(da.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        u.first_name as userFirstName,
        u.last_name as userLastName,
        u.email as userEmail,
        u.avatar as userAvatar,
        cm.role as userRole
      FROM document_assignments da
      JOIN users u ON da.user_id = u.id
      LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
      WHERE da.document_id = ?
      ORDER BY da.created_at ASC`,
      [clubId, documentId]
    );

    const assignedMembers = updatedAssignmentRows.map((row: any) => ({
      userId: row.userId,
      firstName: row.userFirstName,
      lastName: row.userLastName,
      avatar: row.userAvatar || undefined,
      role: row.userRole || undefined,
      submissionStatus: row.submissionStatus || 'Not Submitted',
      filePath: row.filePath || undefined,
      fileName: row.fileName || undefined,
      fileSize: row.fileSize || undefined,
      fileMimeType: row.fileMimeType || undefined,
      submittedAt: row.submittedAt ? new Date(row.submittedAt) : undefined,
      adminComment: row.adminComment || undefined,
    }));

    const dueDate = new Date(updatedDocRows[0].dueDate);
    const isOverdue = dueDate < new Date() && updatedDocRows[0].status !== 'Completed';

    res.json({
      success: true,
      message: 'Member submission status updated successfully',
      document: {
        ...updatedDocRows[0],
        assignedMembers,
        isOverdue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get available templates (from database with filters)
export const getTemplates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const { category, clubId, isPublic } = req.query;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const isAdmin = req.user?.role === 'admin';

    // Build query
    let query = `
      SELECT 
        dt.id,
        dt.name,
        dt.description,
        dt.category,
        dt.file_path as filePath,
        dt.club_id as clubId,
        dt.created_by as createdBy,
        dt.created_at as createdAt,
        dt.updated_at as updatedAt,
        dt.tags,
        dt.is_public as isPublic,
        c.name as clubName,
        u.first_name as creatorFirstName,
        u.last_name as creatorLastName
      FROM document_templates dt
      LEFT JOIN clubs c ON dt.club_id = c.id
      LEFT JOIN users u ON dt.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by category
    if (category && category !== 'all') {
      query += ' AND dt.category = ?';
      params.push(category);
    }

    // Filter by club (if not admin, only show templates from user's clubs or public templates)
    if (!isAdmin) {
      query += ` AND (dt.is_public = 1 OR dt.club_id IN (
        SELECT club_id FROM club_memberships WHERE user_id = ? AND status = 'approved'
      ) OR dt.created_by = ?)`;
      params.push(userId, userId);
    } else if (clubId && clubId !== 'all') {
      query += ' AND (dt.club_id = ? OR dt.is_public = 1)';
      params.push(parseInt(clubId as string));
    } else if (isPublic === 'true') {
      query += ' AND dt.is_public = 1';
    }

    query += ' ORDER BY dt.created_at DESC';

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    const templates = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      category: row.category,
      filePath: row.filePath,
      clubId: row.clubId || undefined,
      clubName: row.clubName || undefined,
      createdBy: row.createdBy,
      creatorFirstName: row.creatorFirstName,
      creatorLastName: row.creatorLastName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tags: row.tags ? JSON.parse(row.tags) : [],
      isPublic: row.isPublic === 1,
    }));

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new template
export const createTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const clubId = req.params.clubId ? parseInt(req.params.clubId) : null;
    const file = req.file;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const isAdmin = req.user?.role === 'admin';

    // Only admin or leader can create templates
    if (!isAdmin && clubId) {
      // Check if user is leader of the club
      const [membershipRows] = await pool.execute<RowDataPacket[]>(
        'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
        [userId, clubId, 'approved']
      );
      const isLeader = membershipRows.length > 0 && membershipRows[0].role === 'leader';
      
      if (!isLeader) {
        const error: ApiError = new Error('Only club leaders and admins can create templates');
        error.statusCode = 403;
        throw error;
      }
    }

    if (!file) {
      const error: ApiError = new Error('File is required');
      error.statusCode = 400;
      throw error;
    }

    const { name, description, category = 'Other', tags, isPublic = false } = req.body;

    if (!name) {
      const error: ApiError = new Error('Template name is required');
      error.statusCode = 400;
      throw error;
    }

    const filePath = `uploads/templates/${file.filename}`;
    const tagsJson = tags ? JSON.stringify(Array.isArray(tags) ? tags : [tags]) : null;

    // Insert template
    const insertQuery = `
      INSERT INTO document_templates 
      (name, description, category, file_path, club_id, created_by, tags, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute<ResultSetHeader>(insertQuery, [
      name,
      description || null,
      category,
      filePath,
      clubId || null,
      userId,
      tagsJson,
      isPublic === 'true' || isPublic === true ? 1 : 0,
    ]);

    const templateId = result.insertId;

    // Fetch created template
    const [templateRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        dt.id,
        dt.name,
        dt.description,
        dt.category,
        dt.file_path as filePath,
        dt.club_id as clubId,
        dt.created_by as createdBy,
        dt.created_at as createdAt,
        dt.updated_at as updatedAt,
        dt.tags,
        dt.is_public as isPublic,
        c.name as clubName
      FROM document_templates dt
      LEFT JOIN clubs c ON dt.club_id = c.id
      WHERE dt.id = ?`,
      [templateId]
    );

    const template = {
      ...templateRows[0],
      tags: templateRows[0].tags ? JSON.parse(templateRows[0].tags) : [],
      isPublic: templateRows[0].isPublic === 1,
    };

    res.json({
      success: true,
      template,
    });
  } catch (error) {
    next(error);
  }
};

// Update template metadata
export const updateTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const templateId = parseInt(req.params.templateId);
    const { name, description, category, tags, isPublic } = req.body;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    // Check if template exists and user has permission
    const [templateRows] = await pool.execute<RowDataPacket[]>(
      'SELECT created_by, club_id FROM document_templates WHERE id = ?',
      [templateId]
    );

    if (templateRows.length === 0) {
      const error: ApiError = new Error('Template not found');
      error.statusCode = 404;
      throw error;
    }

    const template = templateRows[0];
    const isAdmin = req.user?.role === 'admin';
    const isCreator = template.created_by === userId;

    // Only creator or admin can update
    if (!isAdmin && !isCreator) {
      const error: ApiError = new Error('Only template creator or admin can update template');
      error.statusCode = 403;
      throw error;
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(Array.isArray(tags) ? tags : [tags]));
    }
    if (isPublic !== undefined) {
      updates.push('is_public = ?');
      params.push(isPublic === 'true' || isPublic === true ? 1 : 0);
    }

    if (updates.length === 0) {
      const error: ApiError = new Error('No fields to update');
      error.statusCode = 400;
      throw error;
    }

    params.push(templateId);

    await pool.execute(
      `UPDATE document_templates SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    // Fetch updated template
    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        dt.id,
        dt.name,
        dt.description,
        dt.category,
        dt.file_path as filePath,
        dt.club_id as clubId,
        dt.created_by as createdBy,
        dt.created_at as createdAt,
        dt.updated_at as updatedAt,
        dt.tags,
        dt.is_public as isPublic,
        c.name as clubName
      FROM document_templates dt
      LEFT JOIN clubs c ON dt.club_id = c.id
      WHERE dt.id = ?`,
      [templateId]
    );

    const updatedTemplate = {
      ...updatedRows[0],
      tags: updatedRows[0].tags ? JSON.parse(updatedRows[0].tags) : [],
      isPublic: updatedRows[0].isPublic === 1,
    };

    res.json({
      success: true,
      template: updatedTemplate,
    });
  } catch (error) {
    next(error);
  }
};

// Delete template
export const deleteTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const templateId = parseInt(req.params.templateId);

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    // Check if template exists and user has permission
    const [templateRows] = await pool.execute<RowDataPacket[]>(
      'SELECT created_by, file_path FROM document_templates WHERE id = ?',
      [templateId]
    );

    if (templateRows.length === 0) {
      const error: ApiError = new Error('Template not found');
      error.statusCode = 404;
      throw error;
    }

    const template = templateRows[0];
    const isAdmin = req.user?.role === 'admin';
    const isCreator = template.created_by === userId;

    // Only creator or admin can delete
    if (!isAdmin && !isCreator) {
      const error: ApiError = new Error('Only template creator or admin can delete template');
      error.statusCode = 403;
      throw error;
    }

    // Delete file if exists
    if (template.file_path) {
      deleteFile(template.file_path);
    }

    // Delete template
    await pool.execute('DELETE FROM document_templates WHERE id = ?', [templateId]);

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Submit document file (member)
export const submitDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const clubId = parseInt(req.params.clubId);
    const userId = req.user?.userId;
    const file = req.file;

    if (!userId) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    if (!file) {
      const error: ApiError = new Error('File is required');
      error.statusCode = 400;
      throw error;
    }

    // Verify document exists and user is assigned
    const [docRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, status FROM smart_documents WHERE id = ? AND club_id = ?',
      [documentId, clubId]
    );

    if (docRows.length === 0) {
      const error: ApiError = new Error('Document not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify user is assigned to this document
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, file_path FROM document_assignments WHERE document_id = ? AND user_id = ?',
      [documentId, userId]
    );

    if (assignmentRows.length === 0) {
      const error: ApiError = new Error('You are not assigned to this document');
      error.statusCode = 403;
      throw error;
    }

    const assignment = assignmentRows[0];

    // Delete old file if exists
    if (assignment.file_path) {
      deleteFile(assignment.file_path);
    }

    // Fix filename encoding (Windows Latin-1 → UTF-8 issue)
    const fixedFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const filePath = `uploads/smart-documents/${file.filename}`;

    // Update assignment with file info
    await pool.execute(
      `UPDATE document_assignments 
       SET file_path = ?, 
           file_name = ?, 
           file_size = ?, 
           file_mime_type = ?,
           submission_status = 'Submitted',
           submitted_at = CURRENT_TIMESTAMP
       WHERE document_id = ? AND user_id = ?`,
      [filePath, fixedFileName, file.size, file.mimetype, documentId, userId]
    );

    // Update document status based on all submissions
    await updateDocumentStatusBasedOnSubmissions(documentId);

    // Check if user is admin or leader
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

    // Fetch updated document
    const [updatedDocRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      WHERE sd.id = ?`,
      [documentId]
    );

    // Get assignments - for members, only show their own assignment; for leaders/admins, show all
    let updatedAssignmentRows: RowDataPacket[];
    if (isLeader || isAdmin) {
      [updatedAssignmentRows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
          da.id,
          da.document_id as documentId,
          da.user_id as userId,
          da.status,
          da.submission_status as submissionStatus,
          da.file_path as filePath,
          da.file_name as fileName,
          da.file_size as fileSize,
          da.file_mime_type as fileMimeType,
          DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
          da.admin_comment as adminComment,
          DATE_FORMAT(da.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
          DATE_FORMAT(da.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
          u.first_name as userFirstName,
          u.last_name as userLastName,
          u.email as userEmail,
          u.avatar as userAvatar,
          cm.role as userRole
        FROM document_assignments da
        JOIN users u ON da.user_id = u.id
        LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
        WHERE da.document_id = ?
        ORDER BY da.created_at ASC`,
        [clubId, documentId]
      );
    } else {
      // For members, only get their own assignment
      [updatedAssignmentRows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
          da.id,
          da.document_id as documentId,
          da.user_id as userId,
          da.status,
          da.submission_status as submissionStatus,
          da.file_path as filePath,
          da.file_name as fileName,
          da.file_size as fileSize,
          da.file_mime_type as fileMimeType,
          DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
          da.admin_comment as adminComment,
          DATE_FORMAT(da.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
          DATE_FORMAT(da.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
          u.first_name as userFirstName,
          u.last_name as userLastName,
          u.email as userEmail,
          u.avatar as userAvatar,
          cm.role as userRole
        FROM document_assignments da
        JOIN users u ON da.user_id = u.id
        LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
        WHERE da.document_id = ? AND da.user_id = ?
        ORDER BY da.created_at ASC`,
        [clubId, documentId, userId]
      );
    }

    const assignedMembers = updatedAssignmentRows.map((row: any) => ({
      userId: row.userId,
      firstName: row.userFirstName,
      lastName: row.userLastName,
      avatar: row.userAvatar || undefined,
      role: row.userRole || undefined,
      submissionStatus: row.submissionStatus || 'Not Submitted',
      filePath: row.filePath || undefined,
      fileName: row.fileName || undefined,
      fileSize: row.fileSize || undefined,
      fileMimeType: row.fileMimeType || undefined,
      submittedAt: row.submittedAt ? new Date(row.submittedAt) : undefined,
      adminComment: row.adminComment || undefined,
    }));

    const dueDate = new Date(updatedDocRows[0].dueDate);
    const isOverdue = dueDate < new Date() && updatedDocRows[0].status !== 'Completed';

    res.json({
      success: true,
      message: 'Document submitted successfully',
      document: {
        ...updatedDocRows[0],
        assignedMembers,
        isOverdue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Review submission (admin only)
export const reviewSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const clubId = parseInt(req.params.clubId);
    const userId = req.user?.userId;
    const { userId: memberUserId, submissionStatus, comment }: ReviewSubmissionRequest = req.body;

    if (!userId) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    // Only admins can review and approve submissions
    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin) {
      const error: ApiError = new Error('Only admins can review and approve submissions');
      error.statusCode = 403;
      throw error;
    }

    // Verify document exists
    const [docRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, status FROM smart_documents WHERE id = ? AND club_id = ?',
      [documentId, clubId]
    );

    if (docRows.length === 0) {
      const error: ApiError = new Error('Document not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify assignment exists
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT da.id, cm.role as userRole
       FROM document_assignments da
       LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
       WHERE da.document_id = ? AND da.user_id = ?`,
      [clubId, documentId, memberUserId]
    );

    if (assignmentRows.length === 0) {
      const error: ApiError = new Error('Member assignment not found');
      error.statusCode = 404;
      throw error;
    }

    // Admins can review everyone (including leaders), but this check is mainly for future use
    // Currently only admins can access this endpoint, so all reviews are allowed

    // Update submission status and comment
    await pool.execute(
      `UPDATE document_assignments 
       SET submission_status = ?, 
           admin_comment = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE document_id = ? AND user_id = ?`,
      [submissionStatus, comment || null, documentId, memberUserId]
    );

    // Update document status based on all submissions
    await updateDocumentStatusBasedOnSubmissions(documentId);

    // Fetch updated document
    const [updatedDocRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sd.id,
        sd.club_id as clubId,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        sd.template_path as templatePath,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        sd.created_by as createdBy,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(sd.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        c.name as clubName
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      WHERE sd.id = ?`,
      [documentId]
    );

    const [updatedAssignmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        da.id,
        da.document_id as documentId,
        da.user_id as userId,
        da.status,
        da.submission_status as submissionStatus,
        da.file_path as filePath,
        da.file_name as fileName,
        da.file_size as fileSize,
        da.file_mime_type as fileMimeType,
        DATE_FORMAT(da.submitted_at, '%Y-%m-%d %H:%i:%s') as submittedAt,
        da.admin_comment as adminComment,
        DATE_FORMAT(da.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(da.updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt,
        u.first_name as userFirstName,
        u.last_name as userLastName,
        u.email as userEmail,
        u.avatar as userAvatar,
        cm.role as userRole
      FROM document_assignments da
      JOIN users u ON da.user_id = u.id
      LEFT JOIN club_memberships cm ON da.user_id = cm.user_id AND cm.club_id = ?
      WHERE da.document_id = ?
      ORDER BY da.created_at ASC`,
      [clubId, documentId]
    );

    const assignedMembers = updatedAssignmentRows.map((row: any) => ({
      userId: row.userId,
      firstName: row.userFirstName,
      lastName: row.userLastName,
      avatar: row.userAvatar || undefined,
      role: row.userRole || undefined,
      submissionStatus: row.submissionStatus || 'Not Submitted',
      filePath: row.filePath || undefined,
      fileName: row.fileName || undefined,
      fileSize: row.fileSize || undefined,
      fileMimeType: row.fileMimeType || undefined,
      submittedAt: row.submittedAt ? new Date(row.submittedAt) : undefined,
      adminComment: row.adminComment || undefined,
    }));

    const dueDate = new Date(updatedDocRows[0].dueDate);
    const isOverdue = dueDate < new Date() && updatedDocRows[0].status !== 'Completed';

    res.json({
      success: true,
      message: 'Submission reviewed successfully',
      document: {
        ...updatedDocRows[0],
        assignedMembers,
        isOverdue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to update document status based on all member submissions
async function updateDocumentStatusBasedOnSubmissions(documentId: number): Promise<void> {
  try {
    // Get current document status and all assignments
    const [docRows] = await pool.execute<RowDataPacket[]>(
      `SELECT status FROM smart_documents WHERE id = ?`,
      [documentId]
    );

    if (docRows.length === 0) {
      console.warn(`Document ${documentId} not found for status update`);
      return;
    }

    const currentStatus = docRows[0].status;

    // Get all assignments for this document
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT submission_status, file_path FROM document_assignments WHERE document_id = ?`,
      [documentId]
    );

    if (assignmentRows.length === 0) {
      // No assignments - keep status as is or set to Open
      if (currentStatus !== 'Open') {
        await pool.execute(
          'UPDATE smart_documents SET status = ? WHERE id = ?',
          ['Open', documentId]
        );
        console.log(`Document ${documentId}: Status auto-updated to Open (no assignments)`);
      }
      return;
    }

    const total = assignmentRows.length;
    const needsRevision = assignmentRows.filter((row: any) => row.submission_status === 'Needs Revision').length;
    const approved = assignmentRows.filter((row: any) => row.submission_status === 'Approved').length;
    const submitted = assignmentRows.filter((row: any) => row.submission_status === 'Submitted').length;
    const notSubmitted = assignmentRows.filter((row: any) => row.submission_status === 'Not Submitted').length;
    const hasFileSubmitted = assignmentRows.filter((row: any) => row.file_path !== null && row.file_path !== '').length;

    let newStatus: 'Open' | 'In Progress' | 'Completed';
    let reason = '';

    // Priority 1: If any member needs revision, set to "Open"
    if (needsRevision > 0) {
      newStatus = 'Open';
      reason = `${needsRevision} member(s) need revision`;
    }
    // Priority 2: If ALL members are approved, set to "Completed"
    else if (approved === total && total > 0) {
      newStatus = 'Completed';
      reason = `All ${total} member(s) approved`;
    }
    // Priority 3: If at least one file has been submitted (even if status is Submitted), move to "In Progress"
    else if (hasFileSubmitted > 0 || submitted > 0 || approved > 0) {
      newStatus = 'In Progress';
      reason = `${submitted + approved} member(s) submitted/approved, ${notSubmitted} pending`;
    }
    // Priority 4: Otherwise, keep as "Open"
    else {
      newStatus = 'Open';
      reason = `No submissions yet (${notSubmitted} pending)`;
    }

    // Only update if status changed
    if (newStatus !== currentStatus) {
      await pool.execute(
        'UPDATE smart_documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStatus, documentId]
      );
      console.log(`Document ${documentId}: Status auto-updated from "${currentStatus}" to "${newStatus}" (${reason})`);
    }
  } catch (error) {
    console.error(`Error updating document status for document ${documentId}:`, error);
    // Don't throw - this is a helper function that shouldn't break the main flow
  }
}

// Bulk update document status
export const bulkUpdateStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.clubId);
    const { documentIds, status }: BulkUpdateStatusRequest = req.body;

    if (!documentIds || documentIds.length === 0) {
      const error: ApiError = new Error('Document IDs are required');
      error.statusCode = 400;
      throw error;
    }

    if (!status) {
      const error: ApiError = new Error('Status is required');
      error.statusCode = 400;
      throw error;
    }

    // Verify all documents belong to the club
    const placeholders = documentIds.map(() => '?').join(',');
    const [checkRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM smart_documents WHERE id IN (${placeholders}) AND club_id = ?`,
      [...documentIds, clubId]
    );

    if (checkRows.length !== documentIds.length) {
      const error: ApiError = new Error('Some documents not found or do not belong to this club');
      error.statusCode = 404;
      throw error;
    }

    // Update status for all documents
    await pool.execute(
      `UPDATE smart_documents SET status = ? WHERE id IN (${placeholders})`,
      [status, ...documentIds]
    );

    res.json({
      success: true,
      message: `Updated status for ${documentIds.length} document(s)`,
      updatedCount: documentIds.length,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk assign members to documents
export const bulkAssign = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.clubId);
    const { documentIds, memberIds }: BulkAssignRequest = req.body;

    if (!documentIds || documentIds.length === 0) {
      const error: ApiError = new Error('Document IDs are required');
      error.statusCode = 400;
      throw error;
    }

    if (!memberIds || memberIds.length === 0) {
      const error: ApiError = new Error('Member IDs are required');
      error.statusCode = 400;
      throw error;
    }

    // Verify all documents belong to the club
    const placeholders = documentIds.map(() => '?').join(',');
    const [checkRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM smart_documents WHERE id IN (${placeholders}) AND club_id = ?`,
      [...documentIds, clubId]
    );

    if (checkRows.length !== documentIds.length) {
      const error: ApiError = new Error('Some documents not found or do not belong to this club');
      error.statusCode = 404;
      throw error;
    }

    // Verify all members belong to the club
    const memberPlaceholders = memberIds.map(() => '?').join(',');
    const [memberRows] = await pool.execute<RowDataPacket[]>(
      `SELECT user_id FROM club_memberships WHERE user_id IN (${memberPlaceholders}) AND club_id = ? AND status = 'approved'`,
      [...memberIds, clubId]
    );

    if (memberRows.length !== memberIds.length) {
      const error: ApiError = new Error('Some members not found or are not approved members of this club');
      error.statusCode = 404;
      throw error;
    }

    // Assign members to all documents
    const assignmentInsertQuery = `
      INSERT INTO document_assignments (document_id, user_id, status, submission_status)
      VALUES (?, ?, 'Open', 'Not Submitted')
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
    `;

    let assignedCount = 0;
    for (const documentId of documentIds) {
      for (const memberId of memberIds) {
        await pool.execute(assignmentInsertQuery, [documentId, memberId]);
        assignedCount++;
      }
    }

    res.json({
      success: true,
      message: `Assigned ${memberIds.length} member(s) to ${documentIds.length} document(s)`,
      assignedCount,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk delete documents
export const bulkDelete = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.clubId);
    const { documentIds }: BulkDeleteRequest = req.body;

    if (!documentIds || documentIds.length === 0) {
      const error: ApiError = new Error('Document IDs are required');
      error.statusCode = 400;
      throw error;
    }

    // Verify all documents belong to the club
    const placeholders = documentIds.map(() => '?').join(',');
    const [checkRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, template_path FROM smart_documents WHERE id IN (${placeholders}) AND club_id = ?`,
      [...documentIds, clubId]
    );

    if (checkRows.length !== documentIds.length) {
      const error: ApiError = new Error('Some documents not found or do not belong to this club');
      error.statusCode = 404;
      throw error;
    }

    // Get file paths for deletion
    const [assignmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT file_path FROM document_assignments WHERE document_id IN (${placeholders}) AND file_path IS NOT NULL`,
      documentIds
    );

    // Delete files
    for (const row of assignmentRows) {
      if (row.file_path) {
        deleteFile(row.file_path);
      }
    }

    // Delete documents (cascades to assignments)
    await pool.execute(
      `DELETE FROM smart_documents WHERE id IN (${placeholders})`,
      documentIds
    );

    res.json({
      success: true,
      message: `Deleted ${documentIds.length} document(s)`,
      deletedCount: documentIds.length,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk export documents
export const bulkExport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.clubId);
    const { documentIds, format = 'json' }: BulkExportRequest = req.body;

    if (!documentIds || documentIds.length === 0) {
      const error: ApiError = new Error('Document IDs are required');
      error.statusCode = 400;
      throw error;
    }

    // Verify all documents belong to the club
    const placeholders = documentIds.map(() => '?').join(',');
    const [docRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sd.id,
        sd.title,
        sd.description,
        sd.priority,
        sd.type,
        DATE_FORMAT(sd.due_date, '%Y-%m-%d') as dueDate,
        sd.status,
        c.name as clubName,
        DATE_FORMAT(sd.created_at, '%Y-%m-%d %H:%i:%s') as createdAt
      FROM smart_documents sd
      LEFT JOIN clubs c ON sd.club_id = c.id
      WHERE sd.id IN (${placeholders}) AND sd.club_id = ?`,
      [...documentIds, clubId]
    );

    if (docRows.length !== documentIds.length) {
      const error: ApiError = new Error('Some documents not found or do not belong to this club');
      error.statusCode = 404;
      throw error;
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = ['ID', 'Title', 'Description', 'Priority', 'Type', 'Due Date', 'Status', 'Club', 'Created At'];
      const csvRows = [
        headers.join(','),
        ...docRows.map((row: any) => [
          row.id,
          `"${(row.title || '').replace(/"/g, '""')}"`,
          `"${(row.description || '').replace(/"/g, '""')}"`,
          row.priority,
          row.type,
          row.dueDate,
          row.status,
          `"${(row.clubName || '').replace(/"/g, '""')}"`,
          row.createdAt,
        ].join(','))
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="documents-export-${Date.now()}.csv"`);
      res.send(csvRows.join('\n'));
    } else {
      // Return JSON
      res.json({
        success: true,
        documents: docRows,
        count: docRows.length,
      });
    }
  } catch (error) {
    next(error);
  }
};

