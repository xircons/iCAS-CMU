// Quick test script to verify SMTP credentials
import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

console.log('=== SMTP Configuration Test ===\n');
console.log('SMTP_USER:', smtpUser || 'NOT SET');
console.log('SMTP_PASS:', smtpPass ? `${smtpPass.substring(0, 3)}...${smtpPass.substring(smtpPass.length - 3)} (length: ${smtpPass.length})` : 'NOT SET');
console.log('SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com');
console.log('SMTP_PORT:', process.env.SMTP_PORT || '587');
console.log('');

if (!smtpUser || !smtpPass) {
  console.error('❌ SMTP credentials not found in .env file');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

console.log('🔄 Testing SMTP connection...\n');

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Verification Failed:');
    console.error('   Error:', error.message);
    console.error('');
    
    if (error.code === 'EAUTH' || (error as any).responseCode === 535) {
      console.error('🔴 Gmail Authentication Error!');
      console.error('');
      console.error('   This means your App Password is incorrect or expired.');
      console.error('');
      console.error('   Steps to fix:');
      console.error('   1. Go to: https://myaccount.google.com/apppasswords');
      console.error('   2. Make sure 2-Step Verification is enabled');
      console.error('   3. Create a new App Password for "Mail"');
      console.error('   4. Copy the 16-character password (no spaces)');
      console.error('   5. Update SMTP_PASS in backend/.env');
      console.error('   6. Run this test again: npm run test:smtp');
      console.error('');
    }
    process.exit(1);
  } else {
    console.log('✅ SMTP connection successful!');
    console.log('   Your Gmail credentials are working correctly.');
    console.log('');
    console.log('   You can now use OTP email functionality.');
    process.exit(0);
  }
});

