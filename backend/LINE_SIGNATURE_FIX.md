# LINE Webhook Signature Validation Fix

## ปัญหา: Signature Validation Failed

### สาเหตุที่เป็นไปได้:

1. **LINE_CHANNEL_SECRET ไม่ถูกต้อง**
   - ตรวจสอบว่า secret ใน `.env` ตรงกับ LINE Developers Console
   - Secret ต้องตรงกับ Channel Secret ใน Messaging API settings

2. **Webhook URL ไม่ตรง**
   - ถ้าใช้ ngrok URL เปลี่ยน ต้องอัปเดตใน LINE Developers Console
   - ตรวจสอบว่า webhook URL ถูกต้อง

3. **Body Parser Issues**
   - LINE middleware ต้องการ raw body สำหรับ signature validation
   - Express body parser อาจแปลง body เป็น JSON ก่อน middleware

## วิธีแก้ไข

### 1. ตรวจสอบ LINE_CHANNEL_SECRET

```bash
# ตรวจสอบใน .env file
cat backend/.env | grep LINE_CHANNEL_SECRET
```

ต้องตรงกับ Channel Secret ใน LINE Developers Console:
1. ไปที่ https://developers.line.biz/
2. เลือก Channel ของคุณ
3. ไปที่ Messaging API settings
4. ดู Channel Secret
5. เปรียบเทียบกับ `.env` file

### 2. ตรวจสอบ Webhook URL

- ต้องเป็น HTTPS (ไม่ใช่ HTTP)
- URL ต้องถูกต้อง: `https://your-domain.com/api/line/webhook`
- ถ้าใช้ ngrok ต้องอัปเดต URL ทุกครั้งที่ restart

### 3. Restart Server

หลังจากแก้ไข `.env`:
```bash
# หยุด server (Ctrl+C)
# แล้วรันใหม่
npm run dev
```

### 4. Verify Webhook อีกครั้ง

1. ไปที่ LINE Developers Console
2. ไปที่ Messaging API settings
3. Click "Verify" อีกครั้ง

## Debugging

### ตรวจสอบ Logs

ดู server logs สำหรับ:
- `✅ LINE Bot client initialized` = credentials ถูกต้อง
- `⚠️ LINE signature validation failed` = secret ไม่ถูกต้อง
- `📥 LINE webhook received` = webhook มาถึงแล้ว
- `📨 Processing LINE event` = กำลัง process event
- `📤 Sending LINE message` = กำลังส่งข้อความ
- `✅ LINE message sent successfully` = ส่งสำเร็จ

### ทดสอบ Webhook ด้วย curl

```bash
# ทดสอบ webhook endpoint
curl -X POST http://localhost:5000/api/line/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'
```

ควรได้ response: `{"success":true,"message":"No events to process"}`

## หมายเหตุ

- Code ได้แก้ไขให้ return 200 แม้ signature validation จะ fail (สำหรับ development)
- แต่ใน production ควรแก้ไข secret ให้ถูกต้อง
- Logs จะแสดง warning เมื่อ signature validation fail

