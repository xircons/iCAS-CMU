# 🔧 แก้ไขปัญหา MySQL Local (ไม่ใช้ Docker)

## ปัญหาปัจจุบัน
- MySQL รันอยู่ที่ port 3306 ✅
- Password ไม่ถูกต้อง ❌
- Database อาจยังไม่ได้สร้าง ❌

## วิธีแก้ไข

### วิธีที่ 1: หา Password ที่ถูกต้อง (แนะนำ)

รันสคริปต์เพื่อทดสอบ password ต่างๆ:
```powershell
cd backend
npm run find:db:password
```

สคริปต์จะทดสอบ password ธรรมดาๆ เช่น:
- (empty)
- root
- 12345
- rootpassword
- password
- admin

### วิธีที่ 2: Reset MySQL Password

#### ใช้ MySQL Workbench (ง่ายที่สุด)
1. เปิด MySQL Workbench
2. ไปที่ Server > Users and Privileges
3. เลือก root user
4. กด Change Password
5. ตั้ง password ใหม่ (แนะนำ: `12345`)
6. บันทึก

#### ใช้ Command Line (ถ้ามี MySQL client)
```powershell
# หา MySQL path
$mysqlPath = (Get-Service MySQL80).Path
$mysqlDir = Split-Path $mysqlPath

# เข้า MySQL (ถ้ารู้ password เดิม)
cd "$mysqlDir\bin"
.\mysql.exe -u root -p
```

แล้วรัน:
```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY '12345';
FLUSH PRIVILEGES;
```

#### Reset Password แบบ Skip Grant Tables (ถ้าจำ password ไม่ได้)

1. หยุด MySQL service:
   ```powershell
   Stop-Service MySQL80
   ```

2. Start MySQL ใน safe mode:
   ```powershell
   $mysqlPath = (Get-Service MySQL80).Path
   $mysqlDir = Split-Path $mysqlPath
   cd "$mysqlDir\bin"
   Start-Process .\mysqld.exe -ArgumentList "--skip-grant-tables" -WindowStyle Hidden
   ```

3. รอ 5 วินาที แล้วเข้า MySQL:
   ```powershell
   .\mysql.exe -u root
   ```

4. Reset password:
   ```sql
   USE mysql;
   ALTER USER 'root'@'localhost' IDENTIFIED BY '12345';
   FLUSH PRIVILEGES;
   EXIT;
   ```

5. หยุด MySQL process:
   ```powershell
   Get-Process mysqld | Stop-Process
   ```

6. Start MySQL service:
   ```powershell
   Start-Service MySQL80
   ```

### วิธีที่ 3: สร้าง User ใหม่

ถ้าเข้าถึง MySQL ได้ (ผ่าน MySQL Workbench หรือวิธีอื่น):

```sql
CREATE USER 'icas_user'@'localhost' IDENTIFIED BY 'icas_password';
GRANT ALL PRIVILEGES ON icas_cmu_hub.* TO 'icas_user'@'localhost';
FLUSH PRIVILEGES;
```

แล้วแก้ไข `.env`:
```env
DB_USER=icas_user
DB_PASSWORD=icas_password
```

## หลังจากแก้ไข Password แล้ว

### 1. อัพเดท .env file
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=12345  # เปลี่ยนเป็น password ที่ตั้งไว้
DB_NAME=icas_cmu_hub
```

### 2. สร้าง Database (ถ้ายังไม่มี)
```powershell
cd backend
npm run find:db:password
```

หรือใช้ MySQL client:
```sql
CREATE DATABASE IF NOT EXISTS icas_cmu_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Import Schema
```powershell
cd backend
npm run import:schema
```

### 4. ทดสอบการเชื่อมต่อ
```powershell
npm run test:db
```

### 5. ทดสอบแบบครอบคลุม
```powershell
npm run test:db:full
```

## ตรวจสอบสถานะ

```powershell
# ตรวจสอบ MySQL service
Get-Service MySQL80

# ตรวจสอบ port
netstat -an | Select-String ":3306"

# ตรวจสอบ .env
cd backend
Get-Content .env | Select-String "DB_"
```

## Tips

- ถ้าใช้ MySQL Workbench อยู่แล้ว ให้ใช้มัน reset password ง่ายที่สุด
- Password `12345` เป็น password ที่แนะนำเพราะง่ายต่อการจำ
- หลังจากแก้ไข password แล้ว ต้อง restart backend server
- ถ้ายังมีปัญหา ลองใช้ phpMyAdmin (ถ้ามีติดตั้ง)

