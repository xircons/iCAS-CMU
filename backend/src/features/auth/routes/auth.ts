import { Router } from 'express';
import { signup, login, verify, getMe } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/verify', verify);

// Protected routes
router.get('/me', authenticate, getMe);

export default router;

