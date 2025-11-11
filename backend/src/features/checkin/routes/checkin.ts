import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authMiddleware';
import {
  startCheckInSession,
  getCheckInSession,
  checkInViaQR,
  checkInViaPasscode,
  getCheckedInMembers,
  endCheckInSession,
} from '../controllers/checkinController';
import {
  requireLeaderOrAdmin,
  requireMember,
  validateEvent,
} from '../middleware/checkinMiddleware';
import {
  checkInSessionLimiter,
  qrCheckInLimiter,
  passcodeCheckInLimiter,
  membersListLimiter,
  sessionEndLimiter,
} from '../../../middleware/rateLimiter';

const router = Router();

// Leader routes - start/end check-in session
router.post(
  '/session/:eventId',
  authenticate,
  requireLeaderOrAdmin,
  checkInSessionLimiter,
  validateEvent,
  startCheckInSession
);

router.delete(
  '/session/:eventId',
  authenticate,
  requireLeaderOrAdmin,
  sessionEndLimiter,
  validateEvent,
  endCheckInSession
);

// Leader routes - get active session
router.get(
  '/session/:eventId',
  authenticate,
  requireLeaderOrAdmin,
  membersListLimiter,
  validateEvent,
  getCheckInSession
);

// Leader routes - get checked-in members
router.get(
  '/:eventId/members',
  authenticate,
  requireLeaderOrAdmin,
  membersListLimiter,
  validateEvent,
  getCheckedInMembers
);

// Member routes - check in
router.post(
  '/qr',
  authenticate,
  requireMember,
  qrCheckInLimiter,
  checkInViaQR
);

router.post(
  '/passcode',
  authenticate,
  requireMember,
  passcodeCheckInLimiter,
  checkInViaPasscode
);

export default router;

