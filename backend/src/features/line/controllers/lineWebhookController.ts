import { Request, Response, NextFunction } from 'express';
import { WebhookEvent, MessageEvent, FollowEvent, UnfollowEvent } from '@line/bot-sdk';
import {
  handleFollowEvent,
  handleTextMessage,
  handleUnfollowEvent,
} from '../../../services/lineBotService';

/**
 * LINE Webhook handler
 * POST /api/line/webhook
 */
export const lineWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const events: WebhookEvent[] = req.body.events;

    // Process each event
    await Promise.all(
      events.map(async (event: WebhookEvent) => {
        try {
          if (event.type === 'follow') {
            // User added LINE Official Account
            const followEvent = event as FollowEvent;
            await handleFollowEvent(followEvent.source.userId);
          } else if (event.type === 'unfollow') {
            // User blocked LINE Official Account
            const unfollowEvent = event as UnfollowEvent;
            await handleUnfollowEvent(unfollowEvent.source.userId);
          } else if (event.type === 'message') {
            // User sent a message
            const messageEvent = event as MessageEvent;
            if (messageEvent.message.type === 'text') {
              await handleTextMessage(
                messageEvent.source.userId,
                messageEvent.message.text
              );
            }
          }
        } catch (error) {
          console.error('Error processing LINE event:', error);
          // Continue processing other events even if one fails
        }
      })
    );

    // LINE requires 200 OK response
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in LINE webhook handler:', error);
    // Still return 200 to LINE to prevent retries
    res.status(200).json({ success: false, error: 'Internal server error' });
  }
};

