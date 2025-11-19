# 🔧 วิธีแก้ปัญหา Database Password

## ปัญหา
Error: `Access denied for user 'root'@'localhost' (using password: YES)`

## วิธีแก้ไข

### วิธีที่ 1: เปลี่ยน password ใน .env file

แก้ไขไฟล์ `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=12345  # เปลี่ยนเป็น password ที่คุณตั้งไว้
DB_NAME=icas_cmu_hub
```

### วิธีที่ 2: Reset MySQL root password

ถ้าจำ password ไม่ได้:

1. หยุด MySQL service:
   ```powershell
   Stop-Service MySQL80
   ```

2. Start MySQL ใน safe mode (skip grant tables):
   ```powershell
   # หา MySQL path
   $mysqlPath = (Get-Service MySQL80).Path
   $mysqlDir = Split-Path $mysqlPath
   
   # Start MySQL ใน safe mode
   cd $mysqlDir
   .\mysqld.exe --skip-grant-tables --console
   ```

3. เปิด terminal ใหม่และ reset password:
   ```powershell
   mysql -u root
   ```
   ```sql
   USE mysql;
   UPDATE user SET authentication_string=PASSWORD('12345') WHERE User='root';
   FLUSH PRIVILEGES;
   EXIT;
   ```

4. Restart MySQL service:
   ```powershell
   Start-Service MySQL80
   ```

### วิธีที่ 3: ใช้ Docker แทน (แนะนำ)

1. เปิด Docker Desktop
2. แก้ไข `.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=3307  # Docker port
   DB_USER=root
   DB_PASSWORD=rootpassword
   DB_NAME=icas_cmu_hub
   ```
3. รัน:
   ```powershell
   docker-compose up -d
   ```

### วิธีที่ 4: สร้าง user ใหม่ใน MySQL

ถ้าเข้าถึง MySQL ได้:

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

## ทดสอบการเชื่อมต่อ

หลังจากแก้ไขแล้ว:
```powershell
cd backend
npm run test:db
```

