import { Client, Config, middleware, MiddlewareConfig } from '@line/bot-sdk';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

// LINE Bot configuration
const config: Config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

// Middleware configuration for webhook signature verification
export const middlewareConfig: MiddlewareConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

// Create LINE client
const client = new Client(config);

// Conversation states
type ConversationState = 'waiting_subscription' | 'waiting_email' | 'completed';

/**
 * Send a text message to a LINE user
 */
export const sendLineMessage = async (userId: string, message: string): Promise<void> => {
  try {
    await client.pushMessage(userId, {
      type: 'text',
      text: message,
    });
  } catch (error: any) {
    console.error('Error sending LINE message:', error);
    // Don't throw - log error instead as per requirements
  }
};

/**
 * Get conversation state for a LINE user
 */
const getConversationState = async (lineUserId: string): Promise<ConversationState | null> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT state FROM line_conversations WHERE line_user_id = ?',
      [lineUserId]
    );
    return rows.length > 0 ? (rows[0].state as ConversationState) : null;
  } catch (error) {
    console.error('Error getting conversation state:', error);
    return null;
  }
};

/**
 * Set conversation state for a LINE user
 */
const setConversationState = async (lineUserId: string, state: ConversationState): Promise<void> => {
  try {
    await pool.execute(
      `INSERT INTO line_conversations (line_user_id, state) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE state = ?, updated_at = CURRENT_TIMESTAMP`,
      [lineUserId, state, state]
    );
  } catch (error) {
    console.error('Error setting conversation state:', error);
  }
};

/**
 * Check if email exists in users table
 */
const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    return rows.length > 0;
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
};

/**
 * Link LINE User ID with email
 */
const linkLineUserWithEmail = async (lineUserId: string, email: string): Promise<boolean> => {
  try {
    await pool.execute(
      `INSERT INTO line_users (line_user_id, email) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE email = ?, updated_at = CURRENT_TIMESTAMP`,
      [lineUserId, email, email]
    );
    return true;
  } catch (error) {
    console.error('Error linking LINE user with email:', error);
    return false;
  }
};

/**
 * Handle follow event (when user adds LINE Official Account)
 */
export const handleFollowEvent = async (lineUserId: string): Promise<void> => {
  try {
    // Set initial state
    await setConversationState(lineUserId, 'waiting_subscription');
    
    // Send welcome message
    await sendLineMessage(
      lineUserId,
      'สวัสดีครับ! 👋\n\nต้องการรับแจ้งเตือนกิจกรรมและงานจากชมรมหรือไม่?'
    );
  } catch (error) {
    console.error('Error handling follow event:', error);
  }
};

/**
 * Handle text message from user
 */
export const handleTextMessage = async (lineUserId: string, text: string): Promise<void> => {
  try {
    const state = await getConversationState(lineUserId);
    
    if (!state) {
      // If no state, treat as new user
      await setConversationState(lineUserId, 'waiting_subscription');
      await sendLineMessage(
        lineUserId,
        'สวัสดีครับ! 👋\n\nต้องการรับแจ้งเตือนกิจกรรมและงานจากชมรมหรือไม่?'
      );
      return;
    }
    
    if (state === 'waiting_subscription') {
      // Check if user wants to subscribe
      const normalizedText = text.trim().toLowerCase();
      if (normalizedText === 'ใช่' || normalizedText === 'yes' || normalizedText === 'y' || normalizedText === 'ต้องการ') {
        await setConversationState(lineUserId, 'waiting_email');
        await sendLineMessage(
          lineUserId,
          'กรุณากรอกอีเมลของคุณ (เช่น somying@cmu.ac.th)'
        );
      } else {
        await sendLineMessage(
          lineUserId,
          'กรุณาตอบ "ใช่" หากต้องการรับแจ้งเตือน หรือตอบ "ไม่" หากไม่ต้องการ'
        );
      }
    } else if (state === 'waiting_email') {
      // Validate and process email
      const email = text.trim().toLowerCase();
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        await sendLineMessage(
          lineUserId,
          'รูปแบบอีเมลไม่ถูกต้อง กรุณากรอกอีเมลอีกครั้ง (เช่น somying@cmu.ac.th)'
        );
        return;
      }
      
      // Check if email exists in users table
      const emailExists = await checkEmailExists(email);
      if (!emailExists) {
        await sendLineMessage(
          lineUserId,
          'ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบอีเมลอีกครั้ง หรือติดต่อผู้ดูแลระบบ'
        );
        return;
      }
      
      // Link LINE User ID with email
      const linked = await linkLineUserWithEmail(lineUserId, email);
      if (linked) {
        await setConversationState(lineUserId, 'completed');
        await sendLineMessage(
          lineUserId,
          '✅ ลงทะเบียนสำเร็จ!\n\nคุณจะได้รับแจ้งเตือนกิจกรรมและงานจากชมรมที่คุณเป็นสมาชิกผ่าน LINE นี้'
        );
      } else {
        await sendLineMessage(
          lineUserId,
          'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง'
        );
      }
    } else if (state === 'completed') {
      // User is already registered, provide help message
      await sendLineMessage(
        lineUserId,
        'คุณได้ลงทะเบียนรับแจ้งเตือนแล้ว\n\nหากต้องการยกเลิกการรับแจ้งเตือน กรุณาติดต่อผู้ดูแลระบบ'
      );
    }
  } catch (error) {
    console.error('Error handling text message:', error);
  }
};

/**
 * Handle unfollow event (when user blocks LINE Official Account)
 */
export const handleUnfollowEvent = async (lineUserId: string): Promise<void> => {
  try {
    // Remove conversation state (optional - for cleanup)
    await pool.execute(
      'DELETE FROM line_conversations WHERE line_user_id = ?',
      [lineUserId]
    );
    // Note: We keep line_users record for potential re-subscription
  } catch (error) {
    console.error('Error handling unfollow event:', error);
  }
};

/**
 * Get LINE User IDs for a list of emails
 */
const getLineUserIdsByEmails = async (emails: string[]): Promise<string[]> => {
  try {
    if (emails.length === 0) return [];
    
    const placeholders = emails.map(() => '?').join(',');
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT line_user_id FROM line_users WHERE email IN (${placeholders})`,
      emails
    );
    return rows.map((row: any) => row.line_user_id);
  } catch (error) {
    console.error('Error getting LINE user IDs by emails:', error);
    return [];
  }
};

/**
 * Send event notification to club members
 */
export const sendEventNotification = async (email: string, event: any): Promise<void> => {
  try {
    // Get LINE User ID for this email
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT line_user_id FROM line_users WHERE email = ?',
      [email]
    );
    
    if (rows.length === 0) {
      // User not registered with LINE, skip
      return;
    }
    
    const lineUserId = rows[0].line_user_id;
    
    // Format event date
    // Handle both Date objects and date strings
    const eventDate = event.date instanceof Date ? event.date : new Date(event.date);
    const dateStr = eventDate.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    // Format event type in Thai
    const eventTypeMap: { [key: string]: string } = {
      practice: 'การซ้อม',
      meeting: 'การประชุม',
      performance: 'การแสดง',
      workshop: 'เวิร์กช็อป',
      other: 'อื่นๆ',
    };
    const eventType = eventTypeMap[event.type] || event.type;
    
    // Create notification message
    const message = `🔔 แจ้งเตือนกิจกรรมใหม่!\n\n` +
      `📌 ${event.title}\n` +
      `📅 ประเภท: ${eventType}\n` +
      `📆 วันที่: ${dateStr}\n` +
      `⏰ เวลา: ${event.time}\n` +
      `📍 สถานที่: ${event.location}\n` +
      (event.description ? `\n📝 รายละเอียด:\n${event.description}` : '');
    
    await sendLineMessage(lineUserId, message);
  } catch (error) {
    console.error('Error sending event notification:', error);
    // Don't throw - log error instead as per requirements
  }
};

/**
 * Send assignment notification to club members
 */
export const sendAssignmentNotification = async (email: string, assignment: any): Promise<void> => {
  try {
    // Get LINE User ID for this email
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT line_user_id FROM line_users WHERE email = ?',
      [email]
    );
    
    if (rows.length === 0) {
      // User not registered with LINE, skip
      return;
    }
    
    const lineUserId = rows[0].line_user_id;
    
    // Format dates
    // Handle both Date objects and date strings (MySQL DATETIME format)
    let availableDate: Date;
    let dueDate: Date;
    
    if (typeof assignment.availableDate === 'string' && assignment.availableDate.includes(' ')) {
      // MySQL DATETIME format - parse as local time
      const [datePart, timePart] = assignment.availableDate.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
      availableDate = new Date(year, month - 1, day, hours, minutes, seconds);
    } else {
      availableDate = assignment.availableDate instanceof Date 
        ? assignment.availableDate 
        : new Date(assignment.availableDate);
    }
    
    if (typeof assignment.dueDate === 'string' && assignment.dueDate.includes(' ')) {
      // MySQL DATETIME format - parse as local time
      const [datePart, timePart] = assignment.dueDate.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
      dueDate = new Date(year, month - 1, day, hours, minutes, seconds);
    } else {
      dueDate = assignment.dueDate instanceof Date 
        ? assignment.dueDate 
        : new Date(assignment.dueDate);
    }
    
    const availableDateStr = availableDate.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const dueDateStr = dueDate.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    // Create notification message
    const message = `📝 แจ้งเตือนงานใหม่!\n\n` +
      `📌 ${assignment.title}\n` +
      `📅 เปิดรับส่ง: ${availableDateStr}\n` +
      `⏰ กำหนดส่ง: ${dueDateStr}\n` +
      (assignment.maxScore ? `💯 คะแนนเต็ม: ${assignment.maxScore} คะแนน\n` : '') +
      (assignment.description ? `\n📝 รายละเอียด:\n${assignment.description}` : '');
    
    await sendLineMessage(lineUserId, message);
  } catch (error) {
    console.error('Error sending assignment notification:', error);
    // Don't throw - log error instead as per requirements
  }
};

/**
 * Send notifications to all club members for an event
 */
export const notifyClubMembersForEvent = async (clubId: number, event: any): Promise<void> => {
  try {
    // Get all approved members' emails for this club
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT u.email 
       FROM club_memberships cm
       INNER JOIN users u ON cm.user_id = u.id
       WHERE cm.club_id = ? AND cm.status = 'approved'`,
      [clubId]
    );
    
    const emails = rows.map((row: any) => row.email);
    
    // Send notification to each member
    await Promise.all(
      emails.map((email) => sendEventNotification(email, event))
    );
  } catch (error) {
    console.error('Error notifying club members for event:', error);
    // Don't throw - log error instead as per requirements
  }
};

/**
 * Send notifications to all club members for an assignment
 */
export const notifyClubMembersForAssignment = async (clubId: number, assignment: any): Promise<void> => {
  try {
    // Get all approved members' emails for this club
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT u.email 
       FROM club_memberships cm
       INNER JOIN users u ON cm.user_id = u.id
       WHERE cm.club_id = ? AND cm.status = 'approved'`,
      [clubId]
    );
    
    const emails = rows.map((row: any) => row.email);
    
    // Send notification to each member
    await Promise.all(
      emails.map((email) => sendAssignmentNotification(email, assignment))
    );
  } catch (error) {
    console.error('Error notifying club members for assignment:', error);
    // Don't throw - log error instead as per requirements
  }
};

