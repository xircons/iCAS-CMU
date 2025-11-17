import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authMiddleware';
import {
  getAllClubs,
  getClubById,
  createClub,
  getUserMemberships,
  joinClub,
  getClubJoinRequests,
  updateMembershipStatus,
  getClubMembers,
  updateMemberRole,
  removeMember,
  getLeaderClubs,
  getClubMembershipStats,
  updateClubHomeContent,
} from '../controllers/clubController';

const router = Router();

// Public routes
router.get('/', getAllClubs);
router.get('/:id', getClubById);

// Authenticated routes
router.get('/memberships/me', authenticate, getUserMemberships);
router.post('/join', authenticate, joinClub);

// Admin routes
router.post('/', authenticate, createClub);

// Leader/Admin routes
router.get('/leader/my-clubs', authenticate, getLeaderClubs);
router.get('/:clubId/requests', authenticate, getClubJoinRequests);
router.get('/:clubId/members', authenticate, getClubMembers);
router.get('/:clubId/stats', authenticate, getClubMembershipStats);
router.patch('/:clubId/home-content', authenticate, updateClubHomeContent);
router.patch('/memberships/:membershipId/status', authenticate, updateMembershipStatus);
router.patch('/memberships/:membershipId/role', authenticate, updateMemberRole);
router.delete('/memberships/:membershipId', authenticate, removeMember);

export default router;

