import { Router } from 'express';
import { middleware as lineMiddleware } from '@line/bot-sdk';
import { lineWebhook } from '../controllers/lineWebhookController';
import { middlewareConfig } from '../../../services/lineBotService';

const router = Router();

// LINE Webhook endpoint
// Uses LINE middleware to verify webhook signature
router.post(
  '/webhook',
  lineMiddleware(middlewareConfig),
  lineWebhook
);

export default router;

