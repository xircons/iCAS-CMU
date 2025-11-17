import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authMiddleware';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventStats,
} from '../controllers/eventController';
import {
  requireLeaderOrAdmin,
  validateEventAccess,
} from '../middleware/eventMiddleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get events (filtered by user's club memberships)
router.get('/', getEvents);

// Get event statistics
router.get('/stats', getEventStats);

// Get event by ID
router.get('/:id', getEventById);

// Create event (leader/admin only)
router.post('/', requireLeaderOrAdmin, createEvent);

// Update event (leader/admin or creator)
router.put('/:id', validateEventAccess, updateEvent);

// Delete event (leader/admin or creator)
router.delete('/:id', validateEventAccess, deleteEvent);

export default router;

