# 📱 ตั้งค่า LINE Bot (Quick Guide)

## ⚠️ Warning: LINE Bot credentials not configured

LINE Bot จะไม่ทำงานถ้ายังไม่ได้ตั้งค่า credentials

## ✅ วิธีแก้ไข:

### 1. สร้าง LINE Channel

1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. สร้าง Provider ใหม่ (ถ้ายังไม่มี)
3. สร้าง Messaging API Channel
4. ตั้งชื่อ Channel: `iCAS CMU HUB` (หรือชื่อที่ต้องการ)

### 2. รับ Credentials

หลังจากสร้าง Channel แล้ว:

1. ไปที่ **Messaging API** tab
2. คัดลอก:
   - **Channel access token** (ยาวมาก)
   - **Channel secret** (สั้นกว่า)

### 3. อัพเดทไฟล์ `.env`

เปิดไฟล์ `backend/.env` และเพิ่ม:

```env
# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here
```

**ตัวอย่าง:**
```env
LINE_CHANNEL_ACCESS_TOKEN=ABCD1234EFGH5678IJKL9012MNOP3456QRST7890UVWX1234YZAB5678CDEF9012GHIJ3456KLMN7890OPQR1234STUV5678WXYZ
LINE_CHANNEL_SECRET=1234567890abcdef1234567890abcdef
```

### 4. Restart Server

```powershell
# หยุด server (Ctrl+C)
# แล้วรันใหม่
npm run dev
```

## 🔍 ตรวจสอบว่าแก้ไขสำเร็จ:

เมื่อ server เริ่มทำงาน ควรเห็น:
```
✅ LINE Bot client initialized
```

แทนที่จะเป็น:
```
⚠️  LINE Bot credentials not configured. LINE notifications will be disabled.
```

## 📝 หมายเหตุ:

- LINE Bot เป็น **optional** - ถ้าไม่ต้องการใช้ LINE notifications ก็ไม่ต้องตั้งค่า
- ถ้าไม่ตั้งค่า LINE credentials ระบบอื่นๆ ยังทำงานได้ปกติ (แค่ LINE Bot จะไม่ทำงาน)
- สำหรับ production ควรใช้ LINE Channel ที่เป็น Production mode
- Webhook URL สำหรับ LINE: `https://your-domain.com/api/line/webhook`

## 🔗 เอกสารเพิ่มเติม:

ดู `backend/LINE_BOT_SETUP.md` สำหรับคำแนะนำแบบละเอียด

