import { Client, Config, middleware, MiddlewareConfig } from '@line/bot-sdk';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

// Check if LINE credentials are configured
const hasLineCredentials = 
  process.env.LINE_CHANNEL_ACCESS_TOKEN && 
  process.env.LINE_CHANNEL_SECRET &&
  process.env.LINE_CHANNEL_ACCESS_TOKEN.trim() !== '' &&
  process.env.LINE_CHANNEL_SECRET.trim() !== '';

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

// Create LINE client only if credentials are available
let client: Client | null = null;
if (hasLineCredentials) {
  try {
    client = new Client(config);
    console.log('✅ LINE Bot client initialized');
  } catch (error) {
    console.warn('⚠️  Failed to initialize LINE Bot client:', error);
    client = null;
  }
} else {
  console.warn('⚠️  LINE Bot credentials not configured. LINE notifications will be disabled.');
}

// Conversation states
type ConversationState = 'waiting_subscription' | 'waiting_email' | 'completed';

/**
 * Send a text message to a LINE user
 */
export const sendLineMessage = async (userId: string, message: string): Promise<void> => {
  if (!client) {
    console.warn('LINE Bot client not available. Message not sent.');
    return;
  }
  
  try {
    console.log(`📤 Sending LINE message to ${userId}:`, message.substring(0, 50) + '...');
    await client.pushMessage(userId, {
      type: 'text',
      text: message,
    });
    console.log(`✅ LINE message sent successfully to ${userId}`);
  } catch (error: any) {
    console.error('❌ Error sending LINE message:', error);
    if (error.statusCode) {
      console.error('Status code:', error.statusCode);
    }
    if (error.message) {
      console.error('Error message:', error.message);
    }
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
    console.log(`📝 Setting conversation state for ${lineUserId} to ${state}`);
    
    // Try to insert/update with foreign key constraint
    try {
      await pool.execute(
        `INSERT INTO line_conversations (line_user_id, state) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE state = ?, updated_at = CURRENT_TIMESTAMP`,
        [lineUserId, state, state]
      );
      console.log(`✅ Conversation state set to ${state} for ${lineUserId}`);
    } catch (error: any) {
      // If foreign key constraint fails, try to insert without constraint check
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        console.log(`⚠️  Foreign key constraint failed, inserting directly for ${lineUserId}`);
        // Use INSERT IGNORE to avoid foreign key check temporarily
        // This is needed because conversation state is set before user registration
        await pool.execute(
          `INSERT IGNORE INTO line_conversations (line_user_id, state) 
           VALUES (?, ?)`,
          [lineUserId, state]
        );
        // Then update if exists
        await pool.execute(
          `UPDATE line_conversations SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE line_user_id = ?`,
          [state, lineUserId]
        );
        console.log(`✅ Conversation state set to ${state} for ${lineUserId} (without FK check)`);
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error('❌ Error setting conversation state:', error);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.sqlMessage) {
      console.error('SQL error:', error.sqlMessage);
    }
  }
};

/**
 * Check if email exists in users table
 */
const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    console.log(`🔍 Checking email in database: ${email}`);
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    const exists = rows.length > 0;
    console.log(`${exists ? '✅' : '❌'} Email ${email} ${exists ? 'found' : 'not found'} in database`);
    return exists;
  } catch (error: any) {
    console.error('❌ Error checking email:', error);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.sqlMessage) {
      console.error('SQL error:', error.sqlMessage);
    }
    return false;
  }
};

/**
 * Link LINE User ID with email
 */
const linkLineUserWithEmail = async (lineUserId: string, email: string): Promise<boolean> => {
  try {
    console.log(`🔗 Linking LINE user ${lineUserId} with email ${email}`);
    const [result] = await pool.execute(
      `INSERT INTO line_users (line_user_id, email) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE email = ?, updated_at = CURRENT_TIMESTAMP`,
      [lineUserId, email, email]
    );
    console.log(`✅ Successfully linked LINE user ${lineUserId} with email ${email}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error linking LINE user with email:', error);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.sqlMessage) {
      console.error('SQL error:', error.sqlMessage);
    }
    return false;
  }
};

/**
 * Send menu/help message
 */
const sendMenuMessage = async (lineUserId: string): Promise<void> => {
  const message = `📋 เมนูคำสั่ง LINE Bot

พิมพ์คำสั่งต่อไปนี้:

🔔 **สมัครรับแจ้งเตือน**
พิมพ์: "สมัคร" หรือ "ลงทะเบียน"

📊 **ตรวจสอบสถานะ**
พิมพ์: "สถานะ" หรือ "ตรวจสอบ"

❌ **ยกเลิกการรับแจ้งเตือน**
พิมพ์: "ยกเลิก" หรือ "ยกเลิกการรับแจ้งเตือน"

ℹ️ **ความช่วยเหลือ**
พิมพ์: "help" หรือ "ช่วยเหลือ"

---
ต้องการรับแจ้งเตือนกิจกรรมและงานจากชมรมหรือไม่?

ตอบ "ใช่" เพื่อเริ่มสมัคร หรือ "ไม่" หากไม่ต้องการ`;
  
  await sendLineMessage(lineUserId, message);
};

/**
 * Handle follow event (when user adds LINE Official Account)
 */
export const handleFollowEvent = async (lineUserId: string): Promise<void> => {
  try {
    // Check if user already exists
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT email FROM line_users WHERE line_user_id = ?',
      [lineUserId]
    );
    
    if (existingRows.length > 0) {
      // User already registered, send welcome back message
      const email = existingRows[0].email;
      
      // Get user info
      const [userRows] = await pool.execute<RowDataPacket[]>(
        'SELECT first_name, last_name FROM users WHERE email = ?',
        [email]
      );
      const firstName = userRows.length > 0 ? userRows[0].first_name : '';
      const lastName = userRows.length > 0 ? userRows[0].last_name : '';
      const fullName = `${firstName} ${lastName}`.trim() || email;
      
      await sendLineMessage(
        lineUserId,
        `สวัสดีครับคุณ ${fullName}! 👋\n\nคุณได้ลงทะเบียนรับแจ้งเตือนแล้ว\n📧 Email: ${email}\n\nพิมพ์ "help" เพื่อดูเมนูคำสั่ง`
      );
      // Set state to completed (but don't fail if it doesn't exist yet)
      try {
        await setConversationState(lineUserId, 'completed');
      } catch (error) {
        // If state doesn't exist, create it without foreign key constraint
        console.log('Creating conversation state for existing user');
      }
    } else {
      // New user - create conversation state first (without foreign key)
      // We'll create line_users record later when they register
      try {
        await setConversationState(lineUserId, 'waiting_subscription');
      } catch (error: any) {
        // If foreign key constraint fails, insert directly
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          console.log('Creating conversation state without foreign key constraint');
          await pool.execute(
            `INSERT IGNORE INTO line_conversations (line_user_id, state) 
             VALUES (?, 'waiting_subscription')`,
            [lineUserId]
          );
        } else {
          throw error;
        }
      }
      await sendMenuMessage(lineUserId);
    }
  } catch (error) {
    console.error('Error handling follow event:', error);
  }
};

/**
 * Check subscription status
 */
const checkSubscriptionStatus = async (lineUserId: string): Promise<void> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT lu.email, u.first_name, u.last_name, lc.state 
       FROM line_users lu
       LEFT JOIN users u ON lu.email = u.email
       LEFT JOIN line_conversations lc ON lu.line_user_id = lc.line_user_id
       WHERE lu.line_user_id = ?`,
      [lineUserId]
    );
    
    if (rows.length === 0) {
      await sendLineMessage(
        lineUserId,
        '❌ คุณยังไม่ได้ลงทะเบียนรับแจ้งเตือน\n\nพิมพ์ "สมัคร" เพื่อลงทะเบียน'
      );
      return;
    }
    
    const user = rows[0];
    const email = user.email;
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const state = user.state;
    
    if (state === 'completed') {
      await sendLineMessage(
        lineUserId,
        `✅ สถานะการรับแจ้งเตือน: เปิดใช้งาน\n\n👤 ชื่อ: ${firstName} ${lastName}\n📧 Email: ${email}\n\nคุณจะได้รับแจ้งเตือนกิจกรรมและงานจากชมรมที่คุณเป็นสมาชิก`
      );
    } else {
      await sendLineMessage(
        lineUserId,
        `⏳ สถานะการรับแจ้งเตือน: กำลังดำเนินการ\n\n📧 Email: ${email}\n\nกรุณาทำรายการให้เสร็จสิ้น`
      );
    }
  } catch (error) {
    console.error('Error checking subscription status:', error);
    await sendLineMessage(
      lineUserId,
      'เกิดข้อผิดพลาดในการตรวจสอบสถานะ กรุณาลองใหม่อีกครั้ง'
    );
  }
};

/**
 * Handle text message from user
 */
export const handleTextMessage = async (lineUserId: string, text: string): Promise<void> => {
  try {
    console.log(`💬 Received message from ${lineUserId}: "${text}"`);
    const normalizedText = text.trim().toLowerCase();
    
    // Handle help/help commands (available at any state)
    if (normalizedText === 'help' || normalizedText === 'ช่วยเหลือ' || normalizedText === 'เมนู') {
      await sendMenuMessage(lineUserId);
      return;
    }
    
    // Handle status check (available at any state)
    if (normalizedText === 'สถานะ' || normalizedText === 'ตรวจสอบ' || normalizedText === 'status') {
      await checkSubscriptionStatus(lineUserId);
      return;
    }
    
    // Handle unsubscribe (available at any state if registered)
    if (normalizedText === 'ยกเลิก' || normalizedText === 'ยกเลิกการรับแจ้งเตือน' || normalizedText === 'unsubscribe' || normalizedText === 'stop') {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT email FROM line_users WHERE line_user_id = ?',
        [lineUserId]
      );
      
      if (rows.length > 0) {
        await handleUnsubscribe(lineUserId);
      } else {
        await sendLineMessage(
          lineUserId,
          '❌ คุณยังไม่ได้ลงทะเบียนรับแจ้งเตือน\n\nพิมพ์ "สมัคร" เพื่อลงทะเบียน'
        );
      }
      return;
    }
    
    // Handle subscribe command (available at any state)
    if (normalizedText === 'สมัคร' || normalizedText === 'ลงทะเบียน' || normalizedText === 'subscribe' || normalizedText === 'register') {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT email FROM line_users WHERE line_user_id = ?',
        [lineUserId]
      );
      
      if (rows.length > 0) {
        await sendLineMessage(
          lineUserId,
          `✅ คุณได้ลงทะเบียนรับแจ้งเตือนแล้ว\n\n📧 Email: ${rows[0].email}\n\nพิมพ์ "สถานะ" เพื่อตรวจสอบสถานะ`
        );
        return;
      }
      
      // Start subscription process
      try {
        await setConversationState(lineUserId, 'waiting_email');
      } catch (error) {
        console.log('Could not set state to waiting_email, continuing anyway');
      }
      await sendLineMessage(
        lineUserId,
        'กรุณากรอกอีเมลของคุณ (เช่น youraccount@cmu.ac.th)\n\nหรือพิมพ์ "ยกเลิก" เพื่อยกเลิกการสมัคร'
      );
      return;
    }
    
    // Get current state
    const state = await getConversationState(lineUserId);
    console.log(`📊 Current state for ${lineUserId}: ${state || 'none'}`);
    
    if (!state) {
      // If no state, treat as new user
      console.log(`🆕 New user detected: ${lineUserId}`);
      await setConversationState(lineUserId, 'waiting_subscription');
      await sendMenuMessage(lineUserId);
      return;
    }
    
    if (state === 'waiting_subscription') {
      // Check if user wants to subscribe
      if (normalizedText === 'ใช่' || normalizedText === 'yes' || normalizedText === 'y' || normalizedText === 'ต้องการ') {
        try {
          await setConversationState(lineUserId, 'waiting_email');
        } catch (error) {
          console.log('Could not set state to waiting_email, continuing anyway');
        }
        await sendLineMessage(
          lineUserId,
          'กรุณากรอกอีเมลของคุณ (เช่น youraccount@cmu.ac.th)\n\nหรือพิมพ์ "ยกเลิก" เพื่อยกเลิกการสมัคร'
        );
      } else if (normalizedText === 'ไม่' || normalizedText === 'no' || normalizedText === 'n' || normalizedText === 'ไม่ต้องการ') {
        await sendLineMessage(
          lineUserId,
          'ขอบคุณครับ หากต้องการรับแจ้งเตือนในอนาคต พิมพ์ "สมัคร" ได้เลย'
        );
      } else {
        await sendLineMessage(
          lineUserId,
          'กรุณาตอบ "ใช่" หากต้องการรับแจ้งเตือน หรือ "ไม่" หากไม่ต้องการ\n\nหรือพิมพ์ "help" เพื่อดูเมนูคำสั่ง'
        );
      }
    } else if (state === 'waiting_email') {
      // Check for cancel command first
      if (normalizedText === 'ยกเลิก' || normalizedText === 'cancel' || normalizedText === 'ยกเลิกการสมัคร') {
        try {
          await setConversationState(lineUserId, 'waiting_subscription');
        } catch (error) {
          console.log('Could not reset state, continuing anyway');
        }
        await sendLineMessage(
          lineUserId,
          '✅ ยกเลิกการสมัครแล้ว\n\nหากต้องการสมัครรับแจ้งเตือนในอนาคต พิมพ์ "สมัคร" ได้เลย\n\nพิมพ์ "help" เพื่อดูเมนูคำสั่ง'
        );
        return;
      }
      
      // Validate and process email
      const email = text.trim().toLowerCase();
      console.log(`📧 Received email from ${lineUserId}: ${email}`);
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log(`❌ Invalid email format: ${email}`);
        await sendLineMessage(
          lineUserId,
          '❌ รูปแบบอีเมลไม่ถูกต้อง\n\nกรุณากรอกอีเมลอีกครั้ง (เช่น youraccount@cmu.ac.th)\nหรือพิมพ์ "ยกเลิก" เพื่อยกเลิกการสมัคร'
        );
        return;
      }
      
      // Check if email exists in users table
      console.log(`🔍 Checking if email exists: ${email}`);
      const emailExists = await checkEmailExists(email);
      if (!emailExists) {
        console.log(`❌ Email not found in database: ${email}`);
        await sendLineMessage(
          lineUserId,
          `❌ ไม่พบอีเมล "${email}" ในระบบ\n\nกรุณาตรวจสอบอีเมลอีกครั้ง หรือพิมพ์ "ยกเลิก" เพื่อยกเลิกการสมัคร\n\nหากต้องการความช่วยเหลือ พิมพ์ "help" เพื่อดูเมนูคำสั่ง`
        );
        // Keep state as waiting_email to allow retry or cancel
        return;
      }
      
      console.log(`✅ Email found in database: ${email}`);
      
      // Get user info from database
      const [userRows] = await pool.execute<RowDataPacket[]>(
        'SELECT first_name, last_name FROM users WHERE email = ?',
        [email]
      );
      
      const firstName = userRows.length > 0 ? userRows[0].first_name : '';
      const lastName = userRows.length > 0 ? userRows[0].last_name : '';
      const fullName = `${firstName} ${lastName}`.trim() || email;
      
      // Link LINE User ID with email
      const linked = await linkLineUserWithEmail(lineUserId, email);
      if (linked) {
        await setConversationState(lineUserId, 'completed');
        await sendLineMessage(
          lineUserId,
          `✅ คุณ ${fullName} ได้สมัครรับการแจ้งเตือนเรียบร้อยแล้ว\n\n📧 Email: ${email}\n\nน้อง iCAS จะแจ้งเตือนพี่ๆ เมื่อมีอัพเดทหรือแจ้งเตือนตารางใหม่ๆ ของพี่ทันที\n\nพิมพ์ "help" เพื่อดูเมนูคำสั่ง`
        );
      } else {
        console.error(`❌ Failed to link LINE user ${lineUserId} with email ${email}`);
        await sendLineMessage(
          lineUserId,
          '❌ เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง\n\nพิมพ์ "help" เพื่อดูเมนูคำสั่ง'
        );
        // Reset state to allow retry
        try {
          await setConversationState(lineUserId, 'waiting_subscription');
        } catch (error) {
          console.log('Could not reset state, continuing anyway');
        }
      }
    } else if (state === 'completed') {
      // User is already registered, provide help message
      await sendLineMessage(
        lineUserId,
        'คุณได้ลงทะเบียนรับแจ้งเตือนแล้ว\n\nพิมพ์ "help" เพื่อดูเมนูคำสั่ง'
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
 * Handle unsubscribe - remove user from LINE notifications
 */
const handleUnsubscribe = async (lineUserId: string): Promise<void> => {
  try {
    // Delete from line_users and line_conversations
    await pool.execute(
      'DELETE FROM line_users WHERE line_user_id = ?',
      [lineUserId]
    );
    await pool.execute(
      'DELETE FROM line_conversations WHERE line_user_id = ?',
      [lineUserId]
    );
    
    await sendLineMessage(
      lineUserId,
      '✅ ยกเลิกการรับแจ้งเตือนสำเร็จ\n\nคุณจะไม่ได้รับแจ้งเตือนอีกต่อไป\n\nหากต้องการรับแจ้งเตือนอีกครั้ง กรุณา Add Friend และลงทะเบียนใหม่'
    );
  } catch (error) {
    console.error('Error handling unsubscribe:', error);
    await sendLineMessage(
      lineUserId,
      'เกิดข้อผิดพลาดในการยกเลิกการรับแจ้งเตือน กรุณาลองใหม่อีกครั้ง'
    );
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

