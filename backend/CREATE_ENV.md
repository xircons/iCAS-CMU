# สร้างไฟล์ .env

ไฟล์ `.env` ถูก gitignore เพื่อความปลอดภัย คุณต้องสร้างเอง:

## ⚠️ ปัญหาที่พบ:

1. **Gmail SMTP Error 535**: Gmail credentials ไม่ถูกต้อง - ต้องใช้ **App Password** แทน password ปกติ
2. **LINE Bot ไม่ทำงาน**: ต้องเพิ่ม LINE credentials ใน `.env`

## วิธีสร้างไฟล์ .env

### Windows (PowerShell):
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
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=icascmu@gmail.com
SMTP_PASS=fovygwijlrddube
SMTP_FROM=iCAS CMU HUB <icascmu@gmail.com>

# LINE Bot Configuration (Optional - for LINE notifications)
# Get these from LINE Developers Console: https://developers.line.biz/
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here
LINE_CHANNEL_SECRET=your_line_channel_secret_here
"@ | Out-File -FilePath .env -Encoding utf8
```

### Linux/Mac:
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

# LINE Bot Configuration (Optional - for LINE notifications)
# Get these from LINE Developers Console: https://developers.line.biz/
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here
LINE_CHANNEL_SECRET=your_line_channel_secret_here
EOF
```

### หรือสร้างด้วยมือ:
1. สร้างไฟล์ `backend/.env`
2. คัดลอกเนื้อหาด้านบนใส่ไฟล์
3. บันทึกไฟล์

## ตรวจสอบว่าไฟล์ถูกสร้างแล้ว:
```bash
# Windows
cd backend
Test-Path .env

# Linux/Mac
cd backend
ls -la .env
```

## หมายเหตุ:
- ไฟล์ `.env` จะไม่ถูก commit ไปใน git (ถูก gitignore)
- ต้องสร้างไฟล์นี้ทุกครั้งที่ clone repository ใหม่
- อย่าแชร์ไฟล์ `.env` ที่มี credentials จริง

