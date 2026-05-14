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
  patchClubPresident,
  patchClubStatusAdmin,
  deleteClubAdmin,
  getClubPresidentAudit,
} from '../controllers/clubController';
import { resolveClubPublicIdParam } from '../../../middleware/publicIdResolver';
import { clubLogoUpload } from '../middleware/logoUpload';

const router = Router();

// Public routes (register literals before '/:id' so they are never captured as ids)
router.get('/', getAllClubs);

// Authenticated routes
router.get('/memberships/me', authenticate, getUserMemberships);
router.post('/join', authenticate, joinClub);

// Admin routes
router.post('/', authenticate, clubLogoUpload.single('logo'), createClub);

// Leader/Admin routes
router.get('/leader/my-clubs', authenticate, getLeaderClubs);

router.patch('/:clubId/president', authenticate, resolveClubPublicIdParam, patchClubPresident);
router.patch('/:clubId/status', authenticate, resolveClubPublicIdParam, patchClubStatusAdmin);
router.delete('/:clubId', authenticate, resolveClubPublicIdParam, deleteClubAdmin);
router.get('/:clubId/president-audit', authenticate, resolveClubPublicIdParam, getClubPresidentAudit);

router.get('/:id', getClubById);
router.get('/:clubId/requests', authenticate, resolveClubPublicIdParam, getClubJoinRequests);
router.get('/:clubId/members', authenticate, resolveClubPublicIdParam, getClubMembers);
router.get('/:clubId/stats', authenticate, resolveClubPublicIdParam, getClubMembershipStats);
router.patch('/:clubId/home-content', authenticate, resolveClubPublicIdParam, updateClubHomeContent);
router.patch('/memberships/:membershipId/status', authenticate, updateMembershipStatus);
router.patch('/memberships/:membershipId/role', authenticate, updateMemberRole);
router.delete('/memberships/:membershipId', authenticate, removeMember);

export default router;

