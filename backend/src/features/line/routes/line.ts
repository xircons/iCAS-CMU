import { Router, Request, Response, NextFunction } from 'express';
import { middleware as lineMiddleware } from '@line/bot-sdk';
import { lineWebhook } from '../controllers/lineWebhookController';
import { middlewareConfig } from '../../../services/lineBotService';

const router = Router();

// Check if LINE credentials are configured
const hasLineCredentials = 
  process.env.LINE_CHANNEL_ACCESS_TOKEN && 
  process.env.LINE_CHANNEL_SECRET &&
  process.env.LINE_CHANNEL_ACCESS_TOKEN.trim() !== '' &&
  process.env.LINE_CHANNEL_SECRET.trim() !== '';

// Error handler for LINE middleware
const lineMiddlewareErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    console.error('LINE middleware error:', err.message);
    // Still return 200 to LINE to prevent retries, but log the error
    // This might happen if signature doesn't match (wrong secret, or using ngrok/test tools)
    res.status(200).json({ 
      success: false, 
      error: 'Signature validation failed. Check LINE_CHANNEL_SECRET.' 
    });
  } else {
    next();
  }
};

// LINE Webhook endpoint
// Uses LINE middleware to verify webhook signature (only if credentials are available)
if (hasLineCredentials) {
  router.post(
    '/webhook',
    // Apply middleware with error handling
    (req: Request, res: Response, next: NextFunction) => {
      lineMiddleware(middlewareConfig)(req, res, (err: any) => {
        if (err) {
          // If signature validation fails, still try to process (for development/testing)
          // But log the error
          console.warn('⚠️  LINE signature validation failed, but processing anyway:', err.message);
          next(); // Continue to handler
        } else {
          next();
        }
      });
    },
    lineWebhook
  );
} else {
  // If no credentials, return 200 for LINE verification but log warning
  // LINE Platform requires 200 status for webhook verification
  router.post('/webhook', (req: Request, res: Response) => {
    console.warn('⚠️  LINE webhook called but credentials not configured. Please set LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET environment variables.');
    // Return 200 so LINE verification passes, but don't process events
    res.status(200).json({ 
      success: false, 
      message: 'LINE Bot is not configured. Events will not be processed.' 
    });
  });
}

export default router;

