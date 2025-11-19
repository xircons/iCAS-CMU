# Flow การสแกน QR Code สำหรับ Check-in

## Overview
ระบบ Check-in ด้วย QR Code ทำงานโดยมี Leader สร้าง QR Code Session แล้ว Member สแกน QR Code เพื่อ Check-in เข้ากิจกรรม

---

## 🔄 Flow การทำงานทั้งหมด

### 1️⃣ **Leader สร้าง Check-in Session** (POST `/api/checkin/session/:eventId`)

**เมื่อ:** Leader กดปุ่ม "Start Check-in" ใน Event

**กระบวนการ:**
1. **Deactivate session เก่า** - ปิด session เก่าของ event นี้ (ถ้ามี)
   ```sql
   UPDATE check_in_sessions SET is_active = 0 WHERE event_id = ?
   ```

2. **Generate Passcode** - สร้างรหัสผ่าน 6 หลัก (เช่น: `ABC123`)

3. **Generate QR Code Data** - สร้างข้อมูลสำหรับ QR Code:
   ```json
   {
     "eventId": 1,
     "sessionId": "a1b2c3d4e5f6...", // random 16 bytes hex
     "timestamp": 1234567890,
     "token": "abc123..." // SHA256 hash (16 chars)
   }
   ```

4. **Set Expiration** - QR Code มีอายุ 15 นาที

5. **Create Session** - บันทึกใน `check_in_sessions`:
   ```sql
   INSERT INTO check_in_sessions 
   (event_id, passcode, qr_code_data, expires_at, created_by, is_active, regenerate_on_checkin)
   VALUES (?, ?, ?, ?, ?, 1, ?)
   ```
   - `regenerate_on_checkin` = 1 (default) = สร้าง QR Code ใหม่ทุกครั้งที่有人 check-in

6. **Emit WebSocket** - ส่ง event `check-in-session-started` ให้ Leader และ Member ที่ join room `event-{eventId}`

**Response:**
```json
{
  "success": true,
  "data": {
    "passcode": "ABC123",
    "qrCodeData": "{...}",
    "expiresAt": "2025-11-11T10:30:00.000Z",
    "regenerateOnCheckin": true
  }
}
```

---

### 2️⃣ **Member สแกน QR Code** (POST `/api/checkin/qr`)

**เมื่อ:** Member เปิดกล้องสแกน QR Code

**กระบวนการ:**

#### Step 1: Parse QR Code Data
```javascript
qrData = JSON.parse(qrCodeData)
// ได้: { eventId, sessionId, timestamp, token }
```

#### Step 2: Validate QR Code Format
- เช็คว่า JSON parse ได้
- ถ้า parse ไม่ได้ → Error: "Invalid QR code format"

#### Step 3: Find Active Session
```sql
SELECT * FROM check_in_sessions 
WHERE event_id = ? AND is_active = 1 AND expires_at > NOW()
```

**เช็คเงื่อนไข:**
- ✅ Session ต้อง `is_active = 1`
- ✅ Session ต้องยังไม่หมดอายุ (`expires_at > NOW()`)
- ✅ `sessionId` ใน QR Code ต้องตรงกับใน database

**ถ้าไม่เจอ session:**
- Error: "No active check-in session found" (404)
- Error: "Invalid QR code" (400)

#### Step 4: Validate Event
```sql
SELECT club_id FROM events WHERE id = ?
```
- เช็คว่า Event มีอยู่จริง
- ถ้าไม่เจอ → Error: "Event not found" (404)

#### Step 5: Check Club Membership
```sql
SELECT id FROM club_memberships 
WHERE user_id = ? AND club_id = ? AND status = 'approved'
```
- เช็คว่า Member เป็นสมาชิกของ Club ที่จัด Event นี้
- ต้องเป็น `status = 'approved'`
- ถ้าไม่ใช่สมาชิก → Error: "You must be a member of this club to check in" (403)

#### Step 6: Check Duplicate Check-in
```sql
SELECT id FROM check_ins WHERE event_id = ? AND user_id = ?
```
- เช็คว่า User check-in ไปแล้วหรือยัง
- ถ้า check-in ไปแล้ว → Error: "You have already checked in for this event" (409)

#### Step 7: Create Check-in Record ✅
```sql
INSERT INTO check_ins (event_id, user_id, check_in_method) 
VALUES (?, ?, 'qr')
```
- บันทึกการ Check-in ใน database
- `check_in_method = 'qr'`

#### Step 8: Regenerate QR Code (Security Feature) 🔒
**ถ้า `regenerate_on_checkin = 1`:**
```javascript
// Generate new passcode และ QR code ใหม่
newPasscode = generatePasscode() // เช่น: "XYZ789"
newSessionId = crypto.randomBytes(16).toString('hex')
newQrCodeData = JSON.stringify({
  eventId,
  sessionId: newSessionId,
  timestamp: Date.now(),
  token: hash(newSessionId)
})

// Update session
UPDATE check_in_sessions 
SET passcode = ?, qr_code_data = ? 
WHERE event_id = ? AND is_active = 1
```

**เหตุผล:** ป้องกันการ Share QR Code ต่อกัน เพราะ QR Code จะเปลี่ยนทุกครั้งที่有人 check-in

#### Step 9: Emit WebSocket Events 📡

**Event 1: Check-in Success**
```javascript
io.to(`event-${eventId}`).emit('check-in-success', {
  eventId: 1,
  userId: 10,
  firstName: "สมชาย",
  lastName: "ใจดี",
  method: "qr",
  checkInTime: "2025-11-11T10:15:30.000Z"
})
```
- Leader และ Member ที่ join room จะเห็นว่า有人 check-in แล้ว

**Event 2: Session Updated** (ถ้า regenerate)
```javascript
io.to(`event-${eventId}`).emit('check-in-session-updated', {
  eventId: 1,
  passcode: "XYZ789",
  qrCodeData: "{...}"
})
```
- Leader จะเห็น QR Code และ Passcode ใหม่
- QR Code เก่าจะใช้ไม่ได้แล้ว

#### Step 10: Response
```json
{
  "success": true,
  "message": "Successfully checked in via QR code"
}
```

---

## 📊 Database Tables ที่เกี่ยวข้อง

### `check_in_sessions`
เก็บข้อมูล Check-in Session ของแต่ละ Event
```sql
- id
- event_id
- passcode (6 หลัก)
- qr_code_data (JSON string)
- expires_at (15 นาที)
- created_by (leader user_id)
- is_active (1 = active, 0 = inactive)
- regenerate_on_checkin (1 = regenerate หลัง check-in)
```

### `check_ins`
เก็บประวัติการ Check-in
```sql
- id
- event_id
- user_id
- check_in_method ('qr' หรือ 'passcode')
- check_in_time (timestamp)
```

### `events`
ข้อมูล Event
```sql
- id
- club_id
- title
- ...
```

### `club_memberships`
เช็คว่า User เป็นสมาชิกของ Club หรือไม่
```sql
- user_id
- club_id
- status ('approved')
```

---

## 🔐 Security Features

1. **QR Code มีอายุ 15 นาที** - ป้องกันการใช้ QR Code เก่า
2. **Session-based Security** - แต่ละ Session มี unique `sessionId`
3. **Token Validation** - QR Code มี token ที่ hash จาก `sessionId` + `JWT_SECRET`
4. **Regenerate on Check-in** - QR Code เปลี่ยนทุกครั้งที่有人 check-in (ป้องกัน sharing)
5. **Club Membership Check** - ต้องเป็นสมาชิกของ Club ที่จัด Event
6. **Duplicate Prevention** - เช็คว่า check-in ซ้ำ

---

## 🎯 Error Cases

| Error | Status Code | เหตุผล |
|-------|------------|--------|
| Invalid QR code format | 400 | JSON parse ไม่ได้ |
| No active check-in session found | 404 | ไม่มี session หรือหมดอายุ |
| Invalid QR code | 400 | sessionId ไม่ตรง |
| Event not found | 404 | Event ไม่มีอยู่ |
| You must be a member... | 403 | ไม่ใช่สมาชิกของ Club |
| You have already checked in | 409 | check-in ซ้ำ |

---

## 📱 Frontend Flow

### Leader Side:
1. Leader เปิด Event → กด "Start Check-in"
2. ระบบสร้าง Session → แสดง QR Code และ Passcode
3. Leader แสดง QR Code บนหน้าจอ
4. เมื่อ有人 check-in → ระบบแสดง notification + รีเฟรช QR Code (ถ้า regenerate)

### Member Side:
1. Member เปิด Event → กด "Check-in"
2. เปิดกล้องสแกน QR Code
3. ส่ง QR Code data ไปยัง API
4. ถ้าสำเร็จ → แสดง "Check-in successful"
5. ถ้า error → แสดง error message

---

## 🚀 Flow สรุป

```
Leader Start Session
    ↓
Generate QR Code + Passcode
    ↓
Save to check_in_sessions
    ↓
Display QR Code
    ↓
[Member สแกน QR Code]
    ↓
Validate QR Code
    ↓
Check Membership
    ↓
Check Duplicate
    ↓
Insert to check_ins ✅
    ↓
Regenerate QR Code (if enabled)
    ↓
Emit WebSocket Events
    ↓
Response Success
```

