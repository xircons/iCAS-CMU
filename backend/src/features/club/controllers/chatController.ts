import { Response, NextFunction } from 'express';
import pool from '../../../config/database';
import type { RowDataPacket, ResultSetHeader } from '../../../types/db';
import { ApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import { encryptMessage, decryptMessage } from '../../../services/chatEncryptionService';
import { pgVal, pgDateIso } from '../../../utils/pgRowHelpers';
import type { ChatMessage, ChatMessagesResponse, ChatPagination, SendChatMessageRequest, EditChatMessageRequest } from '../types/chat';
import { clubDbIdFromRequest } from '../../assignment/middleware/assignmentMiddleware';

// Get socket.io instance (will be set by socketServer)
let io: any = null;
export const setChatSocketIO = (socketIO: any) => {
  io = socketIO;
};

/**
 * Verify user is an approved member of the club
 */
const verifyClubMembership = async (userId: number, clubId: number): Promise<boolean> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
    [userId, clubId, 'approved']
  );
  return rows.length > 0;
};

const parseNumericId = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const idsEqual = (left: unknown, right: unknown): boolean => {
  const leftId = parseNumericId(left);
  const rightId = parseNumericId(right);
  return leftId !== null && rightId !== null && leftId === rightId;
};

/**
 * Get chat messages for a club with pagination
 * GET /api/clubs/:clubId/chat/messages
 */
export const getChatMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    const clubId = clubDbIdFromRequest(req);
    const userId = req.user.userId;

    // Parse pagination parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

    // Verify user is approved member
    const isMember = await verifyClubMembership(userId, clubId);
    if (!isMember) {
      const error: ApiError = new Error('You must be an approved member to view chat messages');
      error.statusCode = 403;
      throw error;
    }

    // Check if table exists, if not return empty result
    let total = 0;
    let rows: RowDataPacket[] = [];
    
    try {
      // Get total count (excluding soft-deleted messages and messages deleted by sender for this user)
      const [countRows] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM club_chat_messages WHERE club_id = ? AND deleted_at IS NULL AND (deleted_by_sender = false OR user_id != ?)',
        [clubId, userId]
      );
      const tr = countRows[0] as Record<string, unknown>;
      total = Number(pgVal(tr, 'total') ?? 0) || 0;
    } catch (error: any) {
      // If table doesn't exist, return empty result
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '42S02' || error.code === '42P01') {
        console.warn('⚠️  club_chat_messages table not found. Please run: npm run create:club-chat-tables');
        return res.json({
          success: true,
          messages: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }
      throw error;
    }

    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Fetch messages (excluding soft-deleted, ordered by created_at DESC)
    try {
      const query = `
        SELECT 
          m.id,
          m.club_id as clubId,
          m.user_id as userId,
          m.encrypted_message as encryptedMessage,
          m.status,
          m.is_edited as isEdited,
          m.is_unsent as isUnsent,
          m.deleted_by_sender as deletedBySender,
          m.reply_to_message_id as replyToMessageId,
          m.created_at as createdAt,
          m.updated_at as updatedAt,
          m.deleted_at as deletedAt,
          u.first_name as firstName,
          u.last_name as lastName,
          u.avatar,
          reply_parent.encrypted_message as replyParentEncryptedMessage,
          reply_user.first_name as replyParentFirstName,
          reply_user.last_name as replyParentLastName
        FROM club_chat_messages m
        JOIN users u ON m.user_id = u.id
        LEFT JOIN club_chat_messages reply_parent ON m.reply_to_message_id = reply_parent.id
        LEFT JOIN users reply_user ON reply_parent.user_id = reply_user.id
        WHERE m.club_id = ? 
        AND m.deleted_at IS NULL
        AND (m.deleted_by_sender = false OR m.user_id != ?)
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `;

      [rows] = await pool.execute<RowDataPacket[]>(query, [clubId, userId, limit, offset]);
    } catch (error: any) {
      // If table doesn't exist, return empty result
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '42S02' || error.code === '42P01') {
        console.warn('⚠️  club_chat_messages table not found. Please run: npm run create:club-chat-tables');
        return res.json({
          success: true,
          messages: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }
      throw error;
    }

    // Decrypt messages and format response
    const messages: ChatMessage[] = rows.map((row) => {
      const r = row as Record<string, unknown>;
      let decryptedMessage: string;
      try {
        const enc = pgVal(r, 'encryptedMessage') as string | undefined;
        if (!enc) {
          console.warn(`Message ${r.id} has no encrypted message data`);
          decryptedMessage = '[Message data missing]';
        } else {
          decryptedMessage = decryptMessage(enc);
        }
      } catch (error: any) {
        console.error(`Error decrypting message ${r.id}:`, error);
        console.error('Encrypted message length:', (pgVal(r, 'encryptedMessage') as string)?.length);
        console.error('Error message:', error.message);
        // Check if it's a key mismatch issue
        if (error.message?.includes('Unsupported state') || error.message?.includes('bad decrypt')) {
          console.error('⚠️  Possible encryption key mismatch. Check if CHAT_ENCRYPTION_KEY has changed.');
        }
        decryptedMessage = '[Message could not be decrypted]';
      }

      // Get reply data if exists
      let replyTo: { id: number; message: string; userName: string } | undefined;
      const replyMid = pgVal(r, 'replyToMessageId');
      const replyEnc = pgVal(r, 'replyParentEncryptedMessage') as string | undefined;
      const rFirst = pgVal(r, 'replyParentFirstName') as string | undefined;
      const rLast = pgVal(r, 'replyParentLastName') as string | undefined;
      if (replyMid != null && replyEnc) {
        try {
          const replyMessage = decryptMessage(replyEnc);
          replyTo = {
            id: Number(replyMid),
            message: replyMessage,
            userName: `${rFirst ?? ''} ${rLast ?? ''}`.trim(),
          };
        } catch (error) {
          replyTo = {
            id: Number(replyMid),
            message: '[Message could not be decrypted]',
            userName: `${rFirst ?? ''} ${rLast ?? ''}`.trim(),
          };
        }
      }

      const createdIso = pgDateIso(r, 'createdAt');
      const updatedIso = pgDateIso(r, 'updatedAt');
      const deletedIso = pgDateIso(r, 'deletedAt');
      return {
        id: r.id as number,
        clubId: Number(pgVal(r, 'clubId')),
        userId: Number(pgVal(r, 'userId')),
        userName: `${pgVal(r, 'firstName') ?? ''} ${pgVal(r, 'lastName') ?? ''}`.trim(),
        userAvatar: (pgVal(r, 'avatar') as string | undefined) || undefined,
        message: decryptedMessage,
        status: pgVal(r, 'status') as 'sending' | 'sent' | 'failed',
        isEdited: Boolean(pgVal(r, 'isEdited')),
        isUnsent: Boolean(pgVal(r, 'isUnsent')),
        replyToMessageId: replyMid != null ? Number(replyMid) : undefined,
        replyTo,
        createdAt: createdIso ? new Date(createdIso) : new Date(0),
        updatedAt: updatedIso ? new Date(updatedIso) : undefined,
        deletedAt: deletedIso ? new Date(deletedIso) : undefined,
      };
    });

    // Reverse to show oldest first (for display)
    messages.reverse();

    const pagination: ChatPagination = {
      page,
      limit,
      total,
      totalPages,
    };

    const response: ChatMessagesResponse = {
      messages,
      pagination,
    };

    res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a chat message
 * POST /api/clubs/:clubId/chat/messages
 */
export const sendChatMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    const { message, replyToMessageId }: SendChatMessageRequest = req.body;
    const userId = req.user.userId;

    const clubDbId = clubDbIdFromRequest(req);
    const clubPublicId = req.clubPublicId ?? req.params.clubId;


    if (!message || !message.trim()) {
      const error: ApiError = new Error('Message is required');
      error.statusCode = 400;
      throw error;
    }

    // Verify user is approved member
    const isMember = await verifyClubMembership(userId, clubDbId);
    if (!isMember) {
      const error: ApiError = new Error('You must be an approved member to send messages');
      error.statusCode = 403;
      throw error;
    }

    // Validate replyToMessageId if provided
    let replyToData: { id: number; message: string; userName: string } | undefined;
    if (replyToMessageId) {
      const [replyRows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
          m.id,
          m.club_id as clubId,
          m.encrypted_message as encryptedMessage,
          u.first_name as firstName,
          u.last_name as lastName
        FROM club_chat_messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = ? AND m.deleted_at IS NULL`,
        [replyToMessageId]
      );

      if (replyRows.length === 0) {
        const error: ApiError = new Error('Message being replied to not found');
        error.statusCode = 404;
        throw error;
      }

      const replyRow = replyRows[0] as Record<string, unknown>;
      if (Number(pgVal(replyRow, 'clubId')) !== clubDbId) {
        const error: ApiError = new Error('Reply must be to a message in the same club');
        error.statusCode = 400;
        throw error;
      }

      // Decrypt parent message for reply preview
      try {
        const enc = pgVal(replyRow, 'encryptedMessage') as string | undefined;
        const parentMessage = enc ? decryptMessage(enc) : '';
        replyToData = {
          id: Number(pgVal(replyRow, 'id')),
          message: parentMessage,
          userName: `${pgVal(replyRow, 'firstName') ?? ''} ${pgVal(replyRow, 'lastName') ?? ''}`.trim(),
        };
      } catch (error) {
        // If decryption fails, still allow reply but without preview
        replyToData = {
          id: Number(pgVal(replyRow, 'id')),
          message: '[Message could not be decrypted]',
          userName: `${pgVal(replyRow, 'firstName') ?? ''} ${pgVal(replyRow, 'lastName') ?? ''}`.trim(),
        };
      }
    }

    // Encrypt message
    const encryptedMessage = encryptMessage(message.trim());

    // Insert message into database
    let result: ResultSetHeader;
    try {
      const insertQuery = `
        INSERT INTO club_chat_messages (club_id, user_id, encrypted_message, status, reply_to_message_id)
        VALUES (?, ?, ?, 'sent', ?)
      `;
      [result] = await pool.execute<ResultSetHeader>(insertQuery, [
        clubDbId,
        userId,
        encryptedMessage,
        replyToMessageId || null,
      ]);
    } catch (error: any) {
      // If table doesn't exist, return error
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '42S02' || error.code === '42P01') {
        const tableError: ApiError = new Error('Chat feature is not set up. Please run: npm run create:club-chat-tables');
        tableError.statusCode = 503;
        throw tableError;
      }
      throw error;
    }

    // Fetch the created message with user info
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        m.id,
        m.club_id as clubId,
        m.user_id as userId,
        m.encrypted_message as encryptedMessage,
        m.status,
        m.is_edited as isEdited,
        m.reply_to_message_id as replyToMessageId,
        m.created_at as createdAt,
        m.updated_at as updatedAt,
        u.first_name as firstName,
        u.last_name as lastName,
        u.avatar
      FROM club_chat_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?`,
      [result.insertId]
    );

    const row = rows[0] as Record<string, unknown>;
    const rm = pgVal(row, 'replyToMessageId');
    const ca = pgDateIso(row, 'createdAt');
    const ua = pgDateIso(row, 'updatedAt');
    const chatMessage: ChatMessage = {
      id: Number(pgVal(row, 'id')),
      clubId: Number(pgVal(row, 'clubId')),
      userId: Number(pgVal(row, 'userId')),
      userName: `${pgVal(row, 'firstName') ?? ''} ${pgVal(row, 'lastName') ?? ''}`.trim(),
      userAvatar: (pgVal(row, 'avatar') as string | undefined) || undefined,
      message: message.trim(), // Return decrypted message
      status: pgVal(row, 'status') as 'sending' | 'sent' | 'failed',
      isEdited: Boolean(pgVal(row, 'isEdited')),
      replyToMessageId: rm != null ? Number(rm) : undefined,
      replyTo: replyToData,
      createdAt: ca ? new Date(ca) : new Date(0),
      updatedAt: ua ? new Date(ua) : undefined,
    };

    // Emit WebSocket event to club chat room
    if (io) {
      io.to(`club-chat-${clubPublicId}`).emit('club-chat-message', {
        ...chatMessage,
        clubPublicId,
      });
    }

    res.status(201).json({
      success: true,
      message: chatMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Edit a chat message
 * PATCH /api/clubs/:clubId/chat/messages/:messageId
 */
export const editChatMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    const { messageId } = req.params;
    const clubPublicId = req.clubPublicId ?? req.params.clubId;
    const { message }: EditChatMessageRequest = req.body;
    const userId = req.user.userId;
    const clubIdNum = clubDbIdFromRequest(req);
    if (!message || !message.trim()) {
      const error: ApiError = new Error('Message is required');
      error.statusCode = 400;
      throw error;
    }

    // Verify user owns the message and check if unsent
    const [messageRows] = await pool.execute<RowDataPacket[]>(
      'SELECT user_id, club_id, is_unsent FROM club_chat_messages WHERE id = ? AND deleted_at IS NULL',
      [messageId]
    );

    if (messageRows.length === 0) {
      const error: ApiError = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }

    const messageData = messageRows[0];
    if (!idsEqual(messageData.user_id, userId)) {
      const error: ApiError = new Error('You can only edit your own messages');
      error.statusCode = 403;
      throw error;
    }

    if (messageData.is_unsent) {
      const error: ApiError = new Error('Cannot edit an unsent message');
      error.statusCode = 400;
      throw error;
    }

    if (!idsEqual(messageData.club_id, clubIdNum)) {
      const error: ApiError = new Error('Message does not belong to this club');
      error.statusCode = 400;
      throw error;
    }

    // Encrypt updated message
    const encryptedMessage = encryptMessage(message.trim());

    // Update message
    await pool.execute(
      `UPDATE club_chat_messages 
       SET encrypted_message = ?, is_edited = true, updated_at = NOW()
       WHERE id = ?`,
      [encryptedMessage, messageId]
    );

    // Fetch updated message with user info
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        m.id,
        m.club_id as clubId,
        m.user_id as userId,
        m.encrypted_message as encryptedMessage,
        m.status,
        m.is_edited as isEdited,
        m.is_unsent as isUnsent,
        m.created_at as createdAt,
        m.updated_at as updatedAt,
        u.first_name as firstName,
        u.last_name as lastName,
        u.avatar
      FROM club_chat_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?`,
      [messageId]
    );

    const row = rows[0] as Record<string, unknown>;
    const ca = pgDateIso(row, 'createdAt');
    const ua = pgDateIso(row, 'updatedAt');
    const chatMessage: ChatMessage = {
      id: Number(pgVal(row, 'id')),
      clubId: Number(pgVal(row, 'clubId')),
      userId: Number(pgVal(row, 'userId')),
      userName: `${pgVal(row, 'firstName') ?? ''} ${pgVal(row, 'lastName') ?? ''}`.trim(),
      userAvatar: (pgVal(row, 'avatar') as string | undefined) || undefined,
      message: message.trim(), // Return decrypted message
      status: pgVal(row, 'status') as 'sending' | 'sent' | 'failed',
      isEdited: Boolean(pgVal(row, 'isEdited')),
      createdAt: ca ? new Date(ca) : new Date(0),
      updatedAt: ua ? new Date(ua) : undefined,
    };

    // Emit WebSocket event
    if (io) {
      io.to(`club-chat-${clubPublicId}`).emit('club-chat-message-updated', {
        ...chatMessage,
        clubPublicId,
      });
    }

    res.json({
      success: true,
      message: chatMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a chat message
 * DELETE /api/clubs/:clubId/chat/messages/:messageId?forEveryone=true
 * - If forEveryone=true: Delete for everyone (leaders only, sets deleted_at)
 * - If forEveryone=false or omitted: Delete for sender only (sets deleted_by_sender)
 */
export const deleteChatMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    const { messageId } = req.params;
    const clubPublicId = req.clubPublicId ?? req.params.clubId;
    const userId = req.user.userId;
    const forEveryone = req.query.forEveryone === 'true';
    const clubIdNum = clubDbIdFromRequest(req);

    // Verify message exists and get ownership
    const [messageRows] = await pool.execute<RowDataPacket[]>(
      'SELECT user_id, club_id, deleted_by_sender FROM club_chat_messages WHERE id = ? AND deleted_at IS NULL',
      [messageId]
    );

    if (messageRows.length === 0) {
      const error: ApiError = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }

    const messageData = messageRows[0];

    if (!idsEqual(messageData.club_id, clubIdNum)) {
      const error: ApiError = new Error('Message does not belong to this club');
      error.statusCode = 400;
      throw error;
    }

    // Check if user is club leader
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT president_id FROM clubs WHERE id = ?',
      [clubIdNum],
    );
    const isPresident = clubRows.length > 0 && idsEqual(clubRows[0].president_id, userId);

    // Check if user has leader role in membership
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
      [userId, clubIdNum, 'approved']
    );
    const hasLeaderMembership = membershipRows.length > 0 && membershipRows[0].role === 'leader';
    const isLeader = isPresident || hasLeaderMembership;
    const isAdmin = req.user.role === 'admin';
    const isOwner = idsEqual(messageData.user_id, userId);

    if (forEveryone) {
      // Delete for everyone - only leaders/admins can do this
      if (!isLeader && !isAdmin) {
        const error: ApiError = new Error('Only club leaders and admins can delete messages for everyone');
        error.statusCode = 403;
        throw error;
      }

      // Soft delete for everyone
      await pool.execute(
        'UPDATE club_chat_messages SET deleted_at = NOW() WHERE id = ?',
        [messageId]
      );

      // Emit WebSocket event
      if (io) {
        io.to(`club-chat-${clubPublicId}`).emit('club-chat-message-deleted', {
          messageId: parseInt(messageId),
          clubPublicId,
        });
      }

      res.json({
        success: true,
        message: 'Message deleted for everyone',
      });
    } else {
      // Delete for sender only - only message owner can do this
      if (!isOwner) {
        const error: ApiError = new Error('You can only delete your own messages');
        error.statusCode = 403;
        throw error;
      }

      if (messageData.deleted_by_sender) {
        const error: ApiError = new Error('Message is already deleted');
        error.statusCode = 400;
        throw error;
      }

      // Mark as deleted by sender
      await pool.execute(
        'UPDATE club_chat_messages SET deleted_by_sender = true WHERE id = ?',
        [messageId]
      );

      // Emit WebSocket event for sender deletion (only to the sender)
      if (io) {
        io.to(`user-${userId}`).emit('club-chat-message-deleted-for-sender', {
          messageId: parseInt(messageId),
          clubPublicId,
        });
      }

      res.json({
        success: true,
        message: 'Message deleted for you',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Unsend a chat message (changes content to "unsent")
 * POST /api/clubs/:clubId/chat/messages/:messageId/unsend
 */
export const unsendChatMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    const { messageId } = req.params;
    const clubPublicId = req.clubPublicId ?? req.params.clubId;
    const userId = req.user.userId;
    const clubIdNum = clubDbIdFromRequest(req);

    // Verify message exists and user owns it
    const [messageRows] = await pool.execute<RowDataPacket[]>(
      'SELECT user_id, club_id, is_unsent FROM club_chat_messages WHERE id = ? AND deleted_at IS NULL',
      [messageId]
    );

    if (messageRows.length === 0) {
      const error: ApiError = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }

    const messageData = messageRows[0];
    if (!idsEqual(messageData.user_id, userId)) {
      const error: ApiError = new Error('You can only unsend your own messages');
      error.statusCode = 403;
      throw error;
    }

    if (messageData.is_unsent) {
      const error: ApiError = new Error('Message is already unsent');
      error.statusCode = 400;
      throw error;
    }

    if (!idsEqual(messageData.club_id, clubIdNum)) {
      const error: ApiError = new Error('Message does not belong to this club');
      error.statusCode = 400;
      throw error;
    }

    // Encrypt "unsent" text and update message
    const encryptedUnsent = encryptMessage('unsent');
    await pool.execute(
      `UPDATE club_chat_messages 
       SET encrypted_message = ?, is_unsent = true, is_edited = false, updated_at = NOW()
       WHERE id = ?`,
      [encryptedUnsent, messageId]
    );

    // Fetch updated message with user info
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        m.id,
        m.club_id as clubId,
        m.user_id as userId,
        m.encrypted_message as encryptedMessage,
        m.status,
        m.is_edited as isEdited,
        m.is_unsent as isUnsent,
        m.created_at as createdAt,
        m.updated_at as updatedAt,
        u.first_name as firstName,
        u.last_name as lastName,
        u.avatar
      FROM club_chat_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?`,
      [messageId]
    );

    const row = rows[0] as Record<string, unknown>;
    const ca = pgDateIso(row, 'createdAt');
    const ua = pgDateIso(row, 'updatedAt');
    const chatMessage: ChatMessage = {
      id: Number(pgVal(row, 'id')),
      clubId: Number(pgVal(row, 'clubId')),
      userId: Number(pgVal(row, 'userId')),
      userName: `${pgVal(row, 'firstName') ?? ''} ${pgVal(row, 'lastName') ?? ''}`.trim(),
      userAvatar: (pgVal(row, 'avatar') as string | undefined) || undefined,
      message: 'unsent', // Return "unsent" text
      status: pgVal(row, 'status') as 'sending' | 'sent' | 'failed',
      isEdited: Boolean(pgVal(row, 'isEdited')),
      isUnsent: Boolean(pgVal(row, 'isUnsent')),
      createdAt: ca ? new Date(ca) : new Date(0),
      updatedAt: ua ? new Date(ua) : undefined,
    };

    // Emit WebSocket event
    if (io) {
      io.to(`club-chat-${clubPublicId}`).emit('club-chat-message-unsent', {
        ...chatMessage,
        clubPublicId,
      });
    }

    res.json({
      success: true,
      message: chatMessage,
    });
  } catch (error) {
    next(error);
  }
};

