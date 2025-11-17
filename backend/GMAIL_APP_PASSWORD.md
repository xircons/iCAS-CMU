# 🔐 วิธีสร้าง Gmail App Password

## ❌ ปัญหา: Error 535 - Username and Password not accepted

Gmail ไม่ยอมรับ password ปกติแล้ว ต้องใช้ **App Password** แทน

## ✅ วิธีแก้ไข:

### 1. เปิดใช้งาน 2-Step Verification

1. ไปที่ [Google Account Security](https://myaccount.google.com/security)
2. เปิดใช้งาน **2-Step Verification** (ถ้ายังไม่ได้เปิด)
3. รอให้เสร็จสิ้น

### 2. สร้าง App Password

1. ไปที่ [App Passwords](https://myaccount.google.com/apppasswords)
   - หรือไปที่ Google Account → Security → 2-Step Verification → App passwords
2. เลือก **App**: Mail
3. เลือก **Device**: Other (Custom name)
4. ใส่ชื่อ: `iCAS CMU HUB`
5. กด **Generate**
6. **คัดลอก password ที่ได้** (16 ตัวอักษร ไม่มี space)

### 3. อัพเดทไฟล์ `.env`

เปิดไฟล์ `backend/.env` และแก้ไข:

```env
SMTP_PASS=your_16_character_app_password_here
```

**ตัวอย่าง:**
```env
SMTP_PASS=abcd efgh ijkl mnop
```
**เปลี่ยนเป็น:**
```env
SMTP_PASS=abcdefghijklmnop
```
(ไม่มี space)

### 4. Restart Server

```powershell
# หยุด server (Ctrl+C)
# แล้วรันใหม่
npm run dev
```

## 🔍 ตรวจสอบว่าแก้ไขสำเร็จ:

เมื่อขอ OTP ควรเห็น:
```
✅ OTP email sent to [email]
```

แทนที่จะเป็น:
```
❌ Error sending OTP email: Error: Invalid login: 535-5.7.8
```

## 📝 หมายเหตุ:

- App Password จะเป็น 16 ตัวอักษร (ไม่มี space)
- ถ้าใช้ password ปกติจะได้ Error 535
- App Password ใช้ได้กับ Gmail, Outlook, และ email providers อื่นๆ ที่รองรับ 2FA
- ถ้ายังมีปัญหา ให้ตรวจสอบว่า:
  - 2-Step Verification เปิดอยู่
  - App Password ถูกสร้างแล้ว
  - ไม่มี space ใน App Password
  - Username ถูกต้อง (email address เต็ม)

