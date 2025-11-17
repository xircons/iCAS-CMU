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
    // Parse body if it's raw (Buffer)
    let body: any;
    if (Buffer.isBuffer(req.body)) {
      try {
        body = JSON.parse(req.body.toString());
      } catch (parseError) {
        console.error('❌ Failed to parse webhook body:', parseError);
        res.status(200).json({ success: false, error: 'Invalid JSON body' });
        return;
      }
    } else {
      body = req.body;
    }

    // Log incoming webhook for debugging
    console.log('📥 LINE webhook received:', {
      hasBody: !!body,
      hasEvents: !!body?.events,
      eventCount: body?.events?.length || 0
    });

    const events: WebhookEvent[] = body?.events || [];

    if (events.length === 0) {
      console.log('⚠️  No events in webhook body');
      console.log('💡 This might mean:');
      console.log('   1. Auto-reply messages is still enabled in LINE Developers Console');
      console.log('   2. Webhook events are not enabled');
      console.log('   3. This is a verification request from LINE');
      // LINE sometimes sends empty webhooks for verification
      res.status(200).json({ success: true, message: 'No events to process' });
      return;
    }

    // Process each event
    const results = await Promise.allSettled(
      events.map(async (event: WebhookEvent) => {
        try {
          console.log('📨 Processing LINE event:', event.type);
          
          if (event.type === 'follow') {
            // User added LINE Official Account
            const followEvent = event as FollowEvent;
            if (followEvent.source.type === 'user' && followEvent.source.userId) {
              await handleFollowEvent(followEvent.source.userId);
            } else {
              console.log('⚠️  Follow event missing userId');
            }
          } else if (event.type === 'unfollow') {
            // User blocked LINE Official Account
            const unfollowEvent = event as UnfollowEvent;
            if (unfollowEvent.source.type === 'user' && unfollowEvent.source.userId) {
              await handleUnfollowEvent(unfollowEvent.source.userId);
            } else {
              console.log('⚠️  Unfollow event missing userId');
            }
          } else if (event.type === 'message') {
            // User sent a message
            const messageEvent = event as MessageEvent;
            if (messageEvent.message.type === 'text') {
              if (messageEvent.source.type === 'user' && messageEvent.source.userId && messageEvent.message.text) {
                await handleTextMessage(
                  messageEvent.source.userId,
                  messageEvent.message.text
                );
              } else {
                console.log('⚠️  Message event missing userId or text');
              }
            } else {
              console.log('⚠️  Unsupported message type:', messageEvent.message.type);
            }
          } else {
            console.log('⚠️  Unsupported event type:', event.type);
          }
        } catch (error: any) {
          console.error('❌ Error processing LINE event:', error);
          // Log detailed error
          if (error.message) {
            console.error('Error message:', error.message);
          }
          if (error.stack) {
            console.error('Error stack:', error.stack);
          }
          // Continue processing other events even if one fails
          throw error; // Re-throw to be caught by Promise.allSettled
        }
      })
    );

    // Check if any events failed
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.warn(`⚠️  ${failed.length} event(s) failed to process`);
    }

    // LINE requires 200 OK response
    res.status(200).json({ 
      success: true, 
      processed: results.length - failed.length,
      failed: failed.length
    });
  } catch (error: any) {
    console.error('❌ Error in LINE webhook handler:', error);
    if (error.message) {
      console.error('Error message:', error.message);
    }
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    // Still return 200 to LINE to prevent retries
    res.status(200).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message || 'Unknown error'
    });
  }
};

