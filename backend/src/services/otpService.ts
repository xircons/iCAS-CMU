import { RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { sendOTPEmail } from './emailService';

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createAndSendOTP = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const [recentOTPs] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM email_otps 
       WHERE email = ? 
       AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)
       AND is_used = 0
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    if (recentOTPs.length > 0) {
      return {
        success: false,
        message: 'กรุณารอ 1 นาทีก่อนขอ OTP ใหม่',
      };
    }

    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await pool.execute(
      'UPDATE email_otps SET is_used = 1 WHERE email = ? AND is_used = 0',
      [email]
    );

    await pool.execute(
      'INSERT INTO email_otps (email, otp, expires_at) VALUES (?, ?, ?)',
      [email, otp, expiresAt]
    );

    await sendOTPEmail(email, otp);

    return {
      success: true,
      message: 'OTP ส่งไปที่อีเมลของคุณแล้ว',
    };
  } catch (error: any) {
    console.error('Error creating OTP:', error);
    // Check if table doesn't exist
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message?.includes('email_otps')) {
      console.error('❌ email_otps table does not exist. Please run: npm run create:otp-table');
      throw new Error('Database table not found. Please contact administrator.');
    }
    throw error;
  }
};

export const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM email_otps 
       WHERE email = ? 
       AND otp = ? 
       AND is_used = 0 
       AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, otp]
    );

    if (rows.length === 0) {
      return false;
    }

    await pool.execute(
      'UPDATE email_otps SET is_used = 1 WHERE id = ?',
      [rows[0].id]
    );

    return true;
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    // Check if table doesn't exist
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message?.includes('email_otps')) {
      console.error('❌ email_otps table does not exist. Please run: npm run create:otp-table');
    }
    return false;
  }
};

