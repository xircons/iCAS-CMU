# LINE Bot Integration - Setup Guide

## ✅ สิ่งที่ทำเสร็จแล้ว

### 1. Package Installation
- ✅ เพิ่ม `@line/bot-sdk` version 9.3.0 ใน `backend/package.json`
- **หมายเหตุ**: ต้องรัน `npm install` ใน backend directory

### 2. Database Tables
- ✅ สร้าง SQL schema ใน `backend/database/line_tables.sql`
  - ตาราง `line_users` - เก็บ LINE User ID และ email mapping
  - ตาราง `line_conversations` - เก็บ conversation state

### 3. LINE Bot Service
- ✅ สร้าง `backend/src/services/lineBotService.ts`
  - `sendLineMessage()` - ส่งข้อความ
  - `handleFollowEvent()` - จัดการเมื่อ Add Friend
  - `handleTextMessage()` - จัดการข้อความ
  - `handleUnfollowEvent()` - จัดการเมื่อ Block
  - `sendEventNotification()` - ส่งแจ้งเตือนกิจกรรม
  - `sendAssignmentNotification()` - ส่งแจ้งเตือนงาน
  - `notifyClubMembersForEvent()` - ส่งแจ้งเตือนให้สมาชิกชมรมสำหรับกิจกรรม
  - `notifyClubMembersForAssignment()` - ส่งแจ้งเตือนให้สมาชิกชมรมสำหรับงาน

### 4. LINE Webhook Controller
- ✅ สร้าง `backend/src/features/line/controllers/lineWebhookController.ts`
  - จัดการ webhook events จาก LINE (follow, unfollow, message)

### 5. LINE Routes
- ✅ สร้าง `backend/src/features/line/routes/line.ts`
  - Route: `POST /api/line/webhook`
  - ใช้ LINE middleware สำหรับ verify webhook signature

### 6. Event Controller Update
- ✅ อัปเดต `backend/src/features/event/controllers/eventController.ts`
  - เพิ่มการส่ง LINE notification ใน `createEvent()` หลังจาก emit WebSocket
  - ส่งแจ้งเตือนให้สมาชิกในชมรมที่ผู้สร้างกิจกรรมเป็นสมาชิก

### 7. Assignment Controller Update
- ✅ อัปเดต `backend/src/features/assignment/controllers/assignmentController.ts`
  - เพิ่มการส่ง LINE notification ใน `createAssignment()` หลังจากสร้าง assignment สำเร็จ
  - ส่งแจ้งเตือนให้สมาชิกในชมรม

### 8. Server Routes Registration
- ✅ อัปเดต `backend/src/server.ts`
  - เพิ่ม import: `import lineRouter from './features/line/routes/line';`
  - เพิ่ม route: `app.use('/api/line', lineRouter);`

## 📋 สิ่งที่ต้องทำต่อ

### 1. ติดตั้ง Package
```bash
cd backend
npm install
```

### 2. สร้าง Database Tables
รัน SQL ใน `backend/database/line_tables.sql`:
```bash
mysql -u your_user -p your_database < backend/database/line_tables.sql
```

หรือคัดลอก SQL และรันใน database management tool ของคุณ

### 3. เพิ่ม Environment Variables
เพิ่มในไฟล์ `.env` (ใน backend directory หรือ root directory):

```env
LINE_CHANNEL_ACCESS_TOKEN=IgtnK/JcjYMpIzZQSHqbB0kQdLPWdjWj9TEJ050ayFYRDxSL1M6LuLJ28fdry6oABDt9WOeN/VtRYie5dSEgQE0/RQOKTF8X6b9JA0YUwvH/NuiTEu/55r97F7uRWK/gc/bP2dLk4ZUXs1aShLDD6AdB04t89/1O/w1cDnyilFU=
LINE_CHANNEL_SECRET=3110ecd8c8e5394724fab5333dc95ada
```

### 4. ตั้งค่า LINE Bot Webhook

**สำคัญ**: Webhook URL ต้องสามารถเข้าถึงได้จากอินเทอร์เน็ต (publicly accessible)

#### วิธีที่ 1: ใช้ Production Server (แนะนำ)
1. Deploy server ไปยัง production (เช่น VPS, Cloud Server)
2. ตั้งค่า domain และ SSL certificate
3. ตั้งค่า Webhook URL เป็น: `https://your-domain.com/api/line/webhook`

#### วิธีที่ 2: ใช้ ngrok สำหรับ Development (ทดสอบ)
1. ติดตั้ง ngrok: https://ngrok.com/
2. รัน ngrok: `ngrok http 5000` (หรือ port ที่ server ใช้)
3. Copy HTTPS URL ที่ได้ (เช่น `https://abc123.ngrok.io`)
4. ตั้งค่า Webhook URL เป็น: `https://abc123.ngrok.io/api/line/webhook`

**หมายเหตุ**: ngrok free tier จะเปลี่ยน URL ทุกครั้งที่ restart ต้องอัปเดต webhook URL ใหม่

#### ตั้งค่าใน LINE Developers Console:
1. ไปที่ LINE Developers Console: https://developers.line.biz/
2. เลือก Channel ของคุณ
3. ไปที่ **Messaging API** settings
4. ตั้งค่า **Webhook URL** เป็น: `https://your-domain.com/api/line/webhook`
5. Enable **Webhook**
6. Click **Verify** เพื่อทดสอบ webhook
   - ถ้า verify สำเร็จ จะแสดง "Success"
   - ถ้า verify ไม่สำเร็จ ตรวจสอบว่า:
     - Server กำลังรันอยู่
     - Webhook URL ถูกต้องและ accessible จาก internet
     - Environment variables ถูกตั้งค่าแล้ว
     - Firewall เปิด port ที่ใช้

### 5. ทดสอบ
1. Add LINE Official Account เป็นเพื่อน
2. Bot จะถาม "ต้องการรับแจ้งเตือนหรือไม่?"
3. ตอบ "ใช่"
4. Bot จะถาม email
5. กรอก email ที่มีในระบบ (เช่น somying@cmu.ac.th)
6. Bot จะยืนยันการลงทะเบียน
7. สร้างกิจกรรมหรืองานใหม่ในระบบ
8. ตรวจสอบว่าได้รับแจ้งเตือนผ่าน LINE

## 🔄 Flow การทำงาน

### เมื่อ Add Friend
1. LINE ส่ง follow event → webhook
2. Bot ถาม "ต้องการรับแจ้งเตือนหรือไม่?"
3. ตั้ง state เป็น `waiting_subscription`

### เมื่อตอบ "ใช่"
1. Bot ถาม email
2. ตั้ง state เป็น `waiting_email`

### เมื่อกรอก email
1. ตรวจสอบ email ในตาราง `users`
2. ถ้าไม่พบ → แจ้งว่าไม่พบ
3. ถ้าพบ → บันทึก LINE User ID กับ email ใน `line_users`
4. ตั้ง state เป็น `completed`
5. แจ้งว่าลงทะเบียนสำเร็จ

### เมื่อมีกิจกรรม/งานใหม่
1. ระบบสร้างกิจกรรม/งาน
2. ดึง email ของสมาชิกในชมรมจาก `club_memberships`
3. หา LINE User ID จาก `line_users` โดยใช้ email
4. ส่งแจ้งเตือนผ่าน LINE ให้สมาชิกที่ลงทะเบียนแล้ว

## 📝 หมายเหตุ

- Conversation states: `waiting_subscription`, `waiting_email`, `completed`
- ข้อความแจ้งเตือนเป็นภาษาไทย
- ไม่ throw error เมื่อส่ง LINE notification ไม่สำเร็จ (log error แทน)
- ตรวจสอบว่า email อยู่ในชมรมที่เกี่ยวข้องก่อนส่งแจ้งเตือน
- ใช้ pool จาก database config ที่มีอยู่
- ใช้ errorHandler middleware ที่มีอยู่

## 🐛 Troubleshooting

### LINE Bot ไม่ตอบกลับ
- ตรวจสอบว่า webhook URL ถูกต้องและ accessible จาก internet
- ตรวจสอบ LINE_CHANNEL_ACCESS_TOKEN และ LINE_CHANNEL_SECRET ใน .env
- ตรวจสอบ logs ใน console

### ไม่ได้รับแจ้งเตือน
- ตรวจสอบว่า email ถูกต้องและอยู่ในตาราง `users`
- ตรวจสอบว่า user เป็นสมาชิกของชมรม (status = 'approved' ใน `club_memberships`)
- ตรวจสอบว่า user ลงทะเบียน LINE Bot แล้ว (มี record ใน `line_users`)
- ตรวจสอบ logs ใน console สำหรับ error messages

### Database Error
- ตรวจสอบว่าได้รัน SQL schema แล้ว
- ตรวจสอบว่า tables ถูกสร้างแล้ว: `SHOW TABLES;`
- ตรวจสอบ database connection

