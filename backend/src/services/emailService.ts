import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
// Try multiple paths to handle different execution contexts
const possibleEnvPaths = [
  path.join(__dirname, '../../.env'), // From compiled dist folder
  path.join(process.cwd(), '.env'), // From backend directory
  path.join(process.cwd(), 'backend/.env'), // From project root
];

for (const envPath of possibleEnvPaths) {
  try {
    dotenv.config({ path: envPath });
    // Check if SMTP credentials are now loaded
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      break; // Successfully loaded
    }
  } catch (error) {
    // Continue to next path
  }
}

// Validate SMTP credentials
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

if (!smtpUser || !smtpPass) {
  console.warn('⚠️  Warning: SMTP credentials not found in .env file');
  console.warn('   Please create backend/.env with SMTP_USER and SMTP_PASS');
} else {
  // Debug: Show first and last 3 characters of password (for security)
  const passPreview = smtpPass.length > 6 
    ? `${smtpPass.substring(0, 3)}...${smtpPass.substring(smtpPass.length - 3)}`
    : '***';
  console.log(`📧 SMTP configured: ${smtpUser} (password length: ${smtpPass.length}, preview: ${passPreview})`);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: smtpUser && smtpPass ? {
    user: smtpUser,
    pass: smtpPass,
  } : undefined,
});

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  // Check if SMTP credentials are configured
  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in backend/.env');
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || smtpUser,
    to: email,
    subject: 'รหัสยืนยันอีเมล - iCAS CMU HUB',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">ยืนยันอีเมลของคุณ</h2>
        <p>สวัสดีครับ/ค่ะ</p>
        <p>คุณได้ทำการสมัครสมาชิก iCAS CMU HUB</p>
        <p>กรุณาใช้รหัสยืนยันด้านล่างเพื่อยืนยันอีเมลของคุณ:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 8px; margin: 0;">${otp}</h1>
        </div>
        <p>รหัสนี้จะหมดอายุใน <strong>15 นาที</strong></p>
        <p>หากคุณไม่ได้ทำการสมัครสมาชิก กรุณาเพิกเฉยต่ออีเมลนี้</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">iCAS CMU HUB - ระบบจัดการชมรม</p>
      </div>
    `,
    text: `รหัสยืนยันอีเมลของคุณคือ: ${otp}\nรหัสนี้จะหมดอายุใน 15 นาที`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
  } catch (error: any) {
    console.error('❌ Error sending OTP email:', error);
    
    // Provide helpful error messages
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.error('');
      console.error('🔴 Gmail Authentication Failed!');
      console.error('   Possible causes:');
      console.error('   1. App Password is incorrect or expired');
      console.error('   2. 2-Step Verification is not enabled');
      console.error('   3. App Password was revoked');
      console.error('');
      console.error('   Solution:');
      console.error('   1. Go to: https://myaccount.google.com/apppasswords');
      console.error('   2. Create a new App Password for "Mail"');
      console.error('   3. Update SMTP_PASS in backend/.env');
      console.error('   4. Restart the server');
      console.error('');
    }
    
    throw new Error('Failed to send OTP email');
  }
};

