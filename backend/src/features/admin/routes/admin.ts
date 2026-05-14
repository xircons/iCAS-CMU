import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authMiddleware';
import {
  listAdminUsers,
  patchUserSuspension,
  getUserOversight,
  getRecentSmartDocuments,
} from '../controllers/adminController';

const router = Router();

router.use(authenticate);

router.get('/users', listAdminUsers);
router.patch('/users/:userId/suspension', patchUserSuspension);
router.get('/oversight', getUserOversight);
router.get('/smart-documents/recent', getRecentSmartDocuments);

export default router;
