# OTP Email Setup Instructions

## ✅ Completed Steps

1. ✅ Installed `nodemailer` and `@types/nodemailer` packages
2. ✅ Created `emailService.ts` for sending OTP emails
3. ✅ Created `otpService.ts` for OTP generation and verification
4. ✅ Added `requestOTP` function to `authController.ts`
5. ✅ Modified `signup` function to require OTP verification
6. ✅ Added `/request-otp` route to auth routes
7. ✅ Created SQL script for `email_otps` table

## 📝 Manual Steps Required

### 1. Create `.env` file

Since `.env` files are typically gitignored, you need to manually create `backend/.env` with the following content:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=12345
DB_NAME=icas_cmu_hub

# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=icascmu@gmail.com
SMTP_PASS=fovygwijlrddube
SMTP_FROM=iCAS CMU HUB <icascmu@gmail.com>
```

### 2. Create Database Table

The `email_otps` table has been added to the main database file `backend/database/icas_cmu_hub.sql`. 

If you're setting up a new database, the table will be created automatically when you import the SQL file:

```bash
mysql -u root -p icas_cmu_hub < backend/database/icas_cmu_hub.sql
```

If you already have an existing database, you can manually execute the CREATE TABLE statement from the SQL file, or run:

```sql
CREATE TABLE IF NOT EXISTS `email_otps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `otp` varchar(6) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `is_used` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_is_used` (`is_used`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 🚀 Usage

### Request OTP
```http
POST /api/auth/request-otp
Content-Type: application/json

{
  "email": "user@cmu.ac.th"
}
```

### Signup with OTP
```http
POST /api/auth/signup
Content-Type: application/json

{
  "firstName": "ชื่อ",
  "lastName": "นามสกุล",
  "email": "user@cmu.ac.th",
  "password": "password123",
  "confirmPassword": "password123",
  "phoneNumber": "081-234-5678",
  "major": "Computer Science",
  "otp": "123456"
}
```

## 📋 Features

- ✅ OTP generation (6-digit random number)
- ✅ Email sending via Gmail SMTP
- ✅ OTP expiration (15 minutes)
- ✅ Rate limiting (1 minute between requests)
- ✅ OTP validation on signup
- ✅ Automatic cleanup of used OTPs

## ⚠️ Notes

- Make sure your Gmail account has "Less secure app access" enabled or use an App Password
- The OTP expires after 15 minutes
- Users must wait 1 minute between OTP requests
- OTPs are automatically marked as used after verification

