# 🔧 Quick Fix Guide

## ปัญหา: Error เมื่อใช้ OTP System

### ✅ วิธีแก้ไข

#### 1. สร้างไฟล์ `.env` (สำคัญมาก!)

ไฟล์ `.env` ถูก gitignore เพื่อความปลอดภัย คุณต้องสร้างเอง:

**Windows PowerShell:**
```powershell
cd backend
@"
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=12345
DB_NAME=icas_cmu_hub

# Gmail SMTP Configuration
# ⚠️ ต้องใช้ App Password ไม่ใช่ password ปกติ (ดู GMAIL_APP_PASSWORD.md)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=icascmu@gmail.com
SMTP_PASS=your_gmail_app_password_here
SMTP_FROM=iCAS CMU HUB <icascmu@gmail.com>

# LINE Bot Configuration (Optional)
# LINE_CHANNEL_ACCESS_TOKEN=your_token_here
# LINE_CHANNEL_SECRET=your_secret_here
"@ | Out-File -FilePath .env -Encoding utf8
```

**Linux/Mac:**
```bash
cd backend
cat > .env << 'EOF'
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
EOF
```

**หรือสร้างด้วยมือ:**
1. สร้างไฟล์ `backend/.env`
2. คัดลอกเนื้อหาด้านบนใส่ไฟล์
3. บันทึกไฟล์

#### 2. สร้างตาราง `email_otps` ในฐานข้อมูล

รันคำสั่งนี้ใน terminal:

```bash
cd backend
npm run create:otp-table
```

หรือถ้าต้องการสร้างด้วย SQL โดยตรง:

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

#### 2. ตรวจสอบไฟล์ `.env`

สร้างไฟล์ `backend/.env` (ถ้ายังไม่มี) ด้วยเนื้อหาดังนี้:

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

#### 3. Restart Server

หลังจากสร้างตารางแล้ว ให้ restart server:

```bash
# หยุด server (Ctrl+C)
# แล้วรันใหม่
npm run dev
```

### 🔍 ตรวจสอบว่าแก้ไขสำเร็จ

เมื่อ server เริ่มทำงาน คุณควรเห็นข้อความ:

```
✅ Database connected successfully
✅ email_otps table exists
✅ LINE Bot client initialized  (ถ้าตั้งค่า LINE แล้ว)
```

### ⚠️ ปัญหาที่พบบ่อย:

#### 1. Gmail SMTP Error 535
**ปัญหา:** `Error: Invalid login: 535-5.7.8 Username and Password not accepted`

**วิธีแก้:** ต้องใช้ **Gmail App Password** แทน password ปกติ
- ดูคำแนะนำใน `backend/GMAIL_APP_PASSWORD.md`
- หรือไปที่: https://myaccount.google.com/apppasswords

#### 2. LINE Bot ไม่ทำงาน
**ปัญหา:** `⚠️ LINE Bot credentials not configured`

**วิธีแก้:** 
- LINE Bot เป็น **optional** - ถ้าไม่ต้องการใช้ก็ไม่ต้องตั้งค่า
- ถ้าต้องการใช้ ดูคำแนะนำใน `backend/LINE_BOT_SETUP_QUICK.md`

### 📝 หมายเหตุ

- ไม่ต้องแก้ไข nginx configuration
- ตารางจะถูกสร้างอัตโนมัติเมื่อ import `icas_cmu_hub.sql` สำหรับ database ใหม่
- สำหรับ database ที่มีอยู่แล้ว ต้องรัน script `create:otp-table` เอง

