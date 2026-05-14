import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authMiddleware';
import { chatMessageLimiter } from '../../../middleware/rateLimiter';
import {
  getChatMessages,
  sendChatMessage,
  editChatMessage,
  deleteChatMessage,
  unsendChatMessage,
} from '../controllers/chatController';
import { resolveClubPublicIdParam } from '../../../middleware/publicIdResolver';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use('/:clubId/chat', resolveClubPublicIdParam);

// GET /api/clubs/:clubId/chat/messages - Get chat messages with pagination
router.get('/:clubId/chat/messages', getChatMessages);

// POST /api/clubs/:clubId/chat/messages - Send a message (with rate limiting)
router.post('/:clubId/chat/messages', chatMessageLimiter, sendChatMessage);

// PATCH /api/clubs/:clubId/chat/messages/:messageId - Edit a message
router.patch('/:clubId/chat/messages/:messageId', editChatMessage);

// DELETE /api/clubs/:clubId/chat/messages/:messageId - Delete a message
router.delete('/:clubId/chat/messages/:messageId', deleteChatMessage);

// POST /api/clubs/:clubId/chat/messages/:messageId/unsend - Unsend a message
router.post('/:clubId/chat/messages/:messageId/unsend', unsendChatMessage);

export default router;

