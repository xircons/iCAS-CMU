# 📊 รายงานการตรวจสอบฐานข้อมูล

## 🔍 สรุปผลการตรวจสอบ

### ✅ สิ่งที่ทำงานได้ดี:
1. **โครงสร้างฐานข้อมูล (SQL Schema)**
   - มีตารางครบถ้วน 16 ตาราง
   - Foreign key constraints ถูกต้อง
   - Indexes ครบถ้วน
   - AUTO_INCREMENT ตั้งค่าถูกต้อง

2. **Database Configuration**
   - Connection pool ตั้งค่าถูกต้อง
   - Retry logic สำหรับการเชื่อมต่อ
   - Error handling ที่ดี

3. **SQL Syntax**
   - ไม่พบ syntax errors ใน SQL file
   - Foreign key relationships ถูกต้อง

### ⚠️ ปัญหาที่พบ:

#### 1. **การเชื่อมต่อฐานข้อมูลล้มเหลว**
**สาเหตุที่เป็นไปได้:**
- MySQL server ไม่ได้รันอยู่
- ข้อมูลการเชื่อมต่อไม่ถูกต้อง (host, port, user, password)
- Database ยังไม่ได้ถูกสร้าง

**วิธีแก้ไข:**

**ถ้าใช้ Docker:**
```powershell
# ตรวจสอบว่า Docker containers รันอยู่หรือไม่
docker ps

# ถ้ายังไม่รัน ให้ start
docker-compose up -d

# ตรวจสอบ logs
docker-compose logs database

# ทดสอบการเชื่อมต่อ
docker exec -it icas-database mysql -uroot -prootpassword -e "USE icas_cmu_hub; SHOW TABLES;"
```

**ถ้าใช้ MySQL แบบ local:**
```powershell
# ตรวจสอบว่า MySQL service รันอยู่หรือไม่
Get-Service | Where-Object {$_.Name -like "*mysql*"}

# ถ้ายังไม่รัน ให้ start
# (ขึ้นอยู่กับว่าติดตั้ง MySQL อย่างไร)

# ตรวจสอบไฟล์ .env
cd backend
Test-Path .env
Get-Content .env | Select-String "DB_"
```

**การตั้งค่า .env สำหรับ local MySQL:**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=12345  # หรือ password ที่ตั้งไว้
DB_NAME=icas_cmu_hub
```

**การตั้งค่า .env สำหรับ Docker MySQL:**
```env
DB_HOST=localhost
DB_PORT=3307  # ⚠️ ใช้ 3307 ไม่ใช่ 3306 เพราะ Docker map port
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=icas_cmu_hub
```

#### 2. **ตารางอาจยังไม่ได้ถูกสร้าง**
**วิธีแก้ไข:**
```powershell
cd backend

# Import schema
npm run import:schema

# หรือใช้ MySQL client โดยตรง
mysql -uroot -p12345 icas_cmu_hub < database/icas_cmu_hub.sql
```

#### 3. **Foreign Key Integrity Issues**
อาจมีข้อมูลที่ reference ไปยัง records ที่ไม่มีอยู่

**วิธีตรวจสอบ:**
```sql
-- ตรวจสอบ events ที่ reference ไปยัง club ที่ไม่มี
SELECT e.id, e.club_id, e.title 
FROM events e 
LEFT JOIN clubs c ON e.club_id = c.id 
WHERE c.id IS NULL;

-- ตรวจสอบ club_memberships ที่ reference ไปยัง user ที่ไม่มี
SELECT cm.id, cm.user_id, cm.club_id 
FROM club_memberships cm 
LEFT JOIN users u ON cm.user_id = u.id 
WHERE u.id IS NULL;
```

## 🧪 วิธีทดสอบฐานข้อมูล

### 1. ทดสอบการเชื่อมต่อแบบง่าย
```powershell
cd backend
npm run test:db
```

### 2. ทดสอบแบบครอบคลุม (แนะนำ)
```powershell
cd backend
npm run test:db:full
```

### 3. ทดสอบผ่าน Health Endpoint
```powershell
# ถ้า server รันอยู่
curl http://localhost:5000/api/health
# หรือ
curl http://localhost:5002/api/health  # ถ้าใช้ Docker
```

## 📋 Checklist การตรวจสอบ

- [ ] MySQL server รันอยู่
- [ ] ไฟล์ `.env` มีอยู่และตั้งค่าถูกต้อง
- [ ] Database `icas_cmu_hub` ถูกสร้างแล้ว
- [ ] ตารางทั้งหมดถูกสร้างแล้ว (16 ตาราง)
- [ ] Foreign key constraints ทำงานได้
- [ ] สามารถ query ข้อมูลได้
- [ ] ไม่มี orphaned records

## 🔧 ตารางที่ต้องมี (16 ตาราง)

1. `users` - ข้อมูลผู้ใช้
2. `clubs` - ข้อมูลชมรม
3. `club_memberships` - สมาชิกชมรม
4. `events` - กิจกรรม
5. `check_in_sessions` - session สำหรับ check-in
6. `check_ins` - ข้อมูล check-in
7. `documents` - เอกสาร (ตารางเก่า)
8. `reports` - รายงาน/ข้อเสนอแนะ
9. `club_assignments` - งานที่มอบหมาย
10. `assignment_submissions` - การส่งงาน
11. `assignment_attachments` - ไฟล์แนบงาน
12. `assignment_comments` - ความคิดเห็นในงาน
13. `document_assignments` - การมอบหมายเอกสาร
14. `document_templates` - เทมเพลตเอกสาร
15. `smart_documents` - เอกสารอัจฉริยะ
16. `email_otps` - OTP สำหรับ email verification

## 🐛 ปัญหาที่พบบ่อย

### Error: "ECONNREFUSED"
- **สาเหตุ:** MySQL server ไม่ได้รัน
- **แก้ไข:** Start MySQL service หรือ Docker container

### Error: "Access denied for user"
- **สาเหตุ:** Username หรือ password ไม่ถูกต้อง
- **แก้ไข:** ตรวจสอบ `.env` file

### Error: "Unknown database 'icas_cmu_hub'"
- **สาเหตุ:** Database ยังไม่ได้ถูกสร้าง
- **แก้ไข:** รัน `npm run import:schema` หรือสร้าง database ด้วยมือ

### Error: "Table doesn't exist"
- **สาเหตุ:** ตารางยังไม่ได้ถูกสร้าง
- **แก้ไข:** Import SQL schema

### Foreign Key Constraint Violation
- **สาเหตุ:** มีข้อมูลที่ reference ไปยัง records ที่ไม่มี
- **แก้ไข:** ตรวจสอบและลบ orphaned records

## 📝 คำสั่งที่มีประโยชน์

```powershell
# ตรวจสอบ Docker containers
docker ps
docker-compose ps

# ดู logs
docker-compose logs -f database
docker-compose logs -f backend

# Restart services
docker-compose restart database
docker-compose restart backend

# เข้า MySQL container
docker exec -it icas-database mysql -uroot -prootpassword

# ดูตารางทั้งหมด
docker exec -it icas-database mysql -uroot -prootpassword -e "USE icas_cmu_hub; SHOW TABLES;"

# ดูจำนวน records ในแต่ละตาราง
docker exec -it icas-database mysql -uroot -prootpassword -e "USE icas_cmu_hub; SELECT 'users' as table_name, COUNT(*) as count FROM users UNION ALL SELECT 'clubs', COUNT(*) FROM clubs UNION ALL SELECT 'events', COUNT(*) FROM events;"
```

## ✅ ขั้นตอนการแก้ไขปัญหา

1. **ตรวจสอบว่า MySQL รันอยู่**
   ```powershell
   # Docker
   docker ps | Select-String "database"
   
   # Local
   Get-Service | Where-Object {$_.Name -like "*mysql*"}
   ```

2. **ตรวจสอบไฟล์ .env**
   ```powershell
   cd backend
   Test-Path .env
   Get-Content .env
   ```

3. **ทดสอบการเชื่อมต่อ**
   ```powershell
   npm run test:db
   ```

4. **Import schema (ถ้ายังไม่ได้ทำ)**
   ```powershell
   npm run import:schema
   ```

5. **รันการทดสอบแบบครอบคลุม**
   ```powershell
   npm run test:db:full
   ```

## 📞 ต้องการความช่วยเหลือ?

ถ้ายังมีปัญหา:
1. ตรวจสอบ logs: `docker-compose logs database`
2. ตรวจสอบ error messages ใน console
3. ตรวจสอบว่า port ไม่ถูกใช้งานโดย service อื่น
4. ตรวจสอบ firewall settings

