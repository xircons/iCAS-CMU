# LINE Webhook Troubleshooting Guide

## Error: 503 Service Unavailable

### สาเหตุที่เป็นไปได้:

1. **Server ไม่มี LINE credentials**
   - ตรวจสอบว่าได้เพิ่ม environment variables ใน `.env` แล้ว:
     ```
     LINE_CHANNEL_ACCESS_TOKEN=your_token_here
     LINE_CHANNEL_SECRET=your_secret_here
     ```
   - Restart server หลังจากเพิ่ม environment variables

2. **Webhook URL ไม่สามารถเข้าถึงได้จากอินเทอร์เน็ต**
   - LINE Platform ต้องสามารถส่ง HTTP POST request ไปยัง webhook URL ได้
   - ถ้าใช้ localhost จะไม่ทำงาน ต้องใช้:
     - Production server (public IP/domain)
     - ngrok หรือ tunneling service สำหรับ development

3. **Firewall หรือ Network blocking**
   - ตรวจสอบว่า firewall เปิด port ที่ server ใช้ (default: 5000)
   - ตรวจสอบว่า server binding กับ `0.0.0.0` ไม่ใช่ `127.0.0.1`

## วิธีแก้ไข

### สำหรับ Development (ใช้ ngrok)

1. **ติดตั้ง ngrok**
   ```bash
   # Windows: Download from https://ngrok.com/download
   # หรือใช้ chocolatey: choco install ngrok
   ```

2. **รัน ngrok**
   ```bash
   ngrok http 5000
   ```
   (เปลี่ยน 5000 เป็น port ที่ server ใช้)

3. **Copy HTTPS URL**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:5000
   ```

4. **ตั้งค่า Webhook URL ใน LINE Developers Console**
   ```
   https://abc123.ngrok.io/api/line/webhook
   ```

5. **Verify Webhook**
   - Click "Verify" ใน LINE Developers Console
   - ควรจะเห็น "Success"

**หมายเหตุ**: ngrok free tier จะเปลี่ยน URL ทุกครั้งที่ restart ต้องอัปเดต webhook URL ใหม่

### สำหรับ Production

1. **Deploy server ไปยัง production**
   - ใช้ VPS, Cloud Server (AWS, GCP, Azure, etc.)
   - หรือใช้ Platform-as-a-Service (Heroku, Railway, Render, etc.)

2. **ตั้งค่า Domain และ SSL**
   - ใช้ domain name (เช่น `api.yourdomain.com`)
   - ตั้งค่า SSL certificate (Let's Encrypt, Cloudflare, etc.)

3. **ตั้งค่า Webhook URL**
   ```
   https://api.yourdomain.com/api/line/webhook
   ```

4. **ตรวจสอบ Firewall**
   - เปิด port ที่ server ใช้ (80 สำหรับ HTTP, 443 สำหรับ HTTPS)
   - ตรวจสอบ security groups/rules

5. **Verify Webhook**
   - Click "Verify" ใน LINE Developers Console

## ตรวจสอบว่า Server ทำงาน

### ทดสอบ Webhook Endpoint

```bash
# ใช้ curl
curl -X POST https://your-domain.com/api/line/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'

# ควรได้ response: {"success":true}
```

### ตรวจสอบ Server Logs

ดู console output ของ server:
- ถ้าเห็น "✅ LINE Bot client initialized" = credentials ถูกต้อง
- ถ้าเห็น "⚠️ LINE Bot credentials not configured" = ต้องตั้งค่า environment variables

## Checklist

- [ ] Environment variables ถูกตั้งค่าใน `.env`
- [ ] Server restart หลังจากเพิ่ม environment variables
- [ ] Webhook URL accessible จาก internet (ไม่ใช่ localhost)
- [ ] Webhook URL ถูกต้อง: `https://your-domain.com/api/line/webhook`
- [ ] Firewall เปิด port ที่ใช้
- [ ] SSL certificate ถูกต้อง (สำหรับ HTTPS)
- [ ] Server binding กับ `0.0.0.0` ไม่ใช่ `127.0.0.1`

## ตัวอย่าง Environment Variables

สร้างไฟล์ `.env` ใน `backend/` directory:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=icas_cmu_hub

# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=IgtnK/JcjYMpIzZQSHqbB0kQdLPWdjWj9TEJ050ayFYRDxSL1M6LuLJ28fdry6oABDt9WOeN/VtRYie5dSEgQE0/RQOKTF8X6b9JA0YUwvH/NuiTEu/55r97F7uRWK/gc/bP2dLk4ZUXs1aShLDD6AdB04t89/1O/w1cDnyilFU=
LINE_CHANNEL_SECRET=3110ecd8c8e5394724fab5333dc95ada

# Other variables...
PORT=5000
JWT_SECRET=your-secret-key
```

## ยังแก้ไม่ได้?

1. ตรวจสอบ server logs สำหรับ error messages
2. ทดสอบ webhook endpoint ด้วย curl หรือ Postman
3. ตรวจสอบ LINE Developers Console สำหรับ error details
4. ดู LINE Platform documentation: https://developers.line.biz/en/docs/messaging-api/

