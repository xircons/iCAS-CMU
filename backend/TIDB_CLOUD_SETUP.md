# 🚀 TiDB Cloud Setup Guide for iCAS-CMU

This guide will help you connect your iCAS-CMU backend to TiDB Cloud.

## 📋 Prerequisites

- TiDB Cloud account (sign up at https://tidbcloud.com)
- TiDB Cloud Starter cluster created

---

## Step 1: Get Your TiDB Cloud Connection Details

1. **Go to TiDB Cloud Console**: https://tidbcloud.com
2. **Navigate to your cluster**:
   - Click on **Clusters** in the sidebar
   - Click on your **ICAS-CMU-HUB** cluster name
3. **Click "Connect"** button in the upper-right corner
4. **Select connection method**: Choose "**MySQL Client**"

You'll see a connection string like:

```bash
mysql --connect-timeout 15 -u '<prefix>.root' -h gateway01.us-west-2.prod.aws.tidbcloud.com -P 4000 -D test --ssl-mode=VERIFY_IDENTITY --ssl-ca=/etc/ssl/cert.pem -p
```

---

## Step 2: Generate Password

1. In the Connect dialog, click **"Generate Password"**
2. **⚠️ IMPORTANT**: Copy and save this password immediately! It won't be shown again.
3. Keep this password secure - you'll need it in Step 3

---

## Step 3: Update Your `.env` File

Open `backend/.env` and update these values:

```env
# Get the host from TiDB Cloud connection string
# Example: gateway01.us-west-2.prod.aws.tidbcloud.com
DB_HOST=gateway01.YOUR-REGION.prod.aws.tidbcloud.com

# TiDB Cloud uses port 4000 (not 3306)
DB_PORT=4000

# User format: '<prefix>.root' (INCLUDE the quotes!)
# Get the prefix from your connection string
# Example: '4qPkj6Tz3eabc12.root'
DB_USER='YOUR_PREFIX.root'

# Paste the password you generated in Step 2
DB_PASSWORD=your_generated_password_here

# Database name (should match what you created)
DB_NAME=icas_cmu_hub

# Enable SSL for TiDB Cloud
DB_SSL=true
```

### 🔍 Where to Find These Values:

| Value | Where to Find |
|-------|---------------|
| `DB_HOST` | After `-h` in connection string |
| `DB_PORT` | After `-P` in connection string (4000) |
| `DB_USER` | After `-u` in connection string (includes quotes!) |
| `DB_PASSWORD` | Click "Generate Password" button |
| `DB_NAME` | Your database name in TiDB Cloud |

---

## Step 4: Import Your Database Schema

### Option A: Using TiDB Cloud SQL Editor (Recommended)

1. **Go to SQL Editor** in TiDB Cloud sidebar
2. **Add USE statement** at the top of your SQL file:
   ```sql
   USE icas_cmu_hub;
   ```
3. **Copy all content** from `backend/.sql/icas_cmu_hub.sql`
4. **Paste into SQL Editor**
5. **Select all** (Cmd/Ctrl + A)
6. **Run all statements** (Cmd/Ctrl + Shift + Enter)
7. **Verify tables created**: Run `SHOW TABLES;`

### Option B: Using Data Import Feature

1. **Go to Data** → **Import** in TiDB Cloud sidebar
2. **Upload file**: Select `backend/.sql/icas_cmu_hub.sql`
3. **Choose target database**: `icas_cmu_hub`
4. **Start import**
5. **Wait for completion** (should take 1-2 minutes)

---

## Step 5: Test the Connection

### Test from Backend:

```bash
cd backend
npm run test:db
```

You should see:
```
✅ Database connected successfully
```

### Test from MySQL Client:

```bash
mysql --connect-timeout 15 -u '<YOUR_PREFIX>.root' -h gateway01.YOUR-REGION.prod.aws.tidbcloud.com -P 4000 -D icas_cmu_hub --ssl-mode=VERIFY_IDENTITY -p
```

Then run:
```sql
SHOW TABLES;
```

You should see 16 tables including:
- users
- clubs
- club_memberships
- events
- check_ins
- assignments
- documents
- reports
- etc.

---

## Step 6: Start Your Backend

```bash
cd backend
npm run dev
```

You should see:
```
✅ Database connected successfully
✅ WebSocket server initialized
🚀 Server running on http://localhost:5001
```

---

## 🔒 Security Notes

1. **Never commit** your `.env` file with real credentials
2. **Use strong passwords** for production
3. **TLS/SSL is required** for TiDB Cloud Starter clusters
4. **Keep your connection string private**

---

## 🐛 Troubleshooting

### Connection Timeout

```
Error: connect ETIMEDOUT
```

**Solution**: Check your internet connection and TiDB Cloud cluster status.

### Authentication Failed

```
Error: Access denied for user
```

**Solutions**:
- Verify password is correct
- Ensure username includes quotes: `'<prefix>.root'`
- Check if password was copied correctly (no extra spaces)

### SSL/TLS Error

```
Error: unable to verify the first certificate
```

**Solution**: Ensure `DB_SSL=true` in your `.env` file.

### Database Not Found

```
Error: Unknown database 'icas_cmu_hub'
```

**Solution**: Create the database first in TiDB Cloud:
```sql
CREATE DATABASE icas_cmu_hub;
```

### Tables Not Created

**Solutions**:
1. Run `SHOW TABLES;` to verify
2. Re-import the SQL file
3. Check query logs in TiDB Cloud for errors

---

## 📚 Resources

- [TiDB Cloud Documentation](https://docs.pingcap.com/tidbcloud/)
- [TiDB Cloud Console](https://tidbcloud.com)
- [MySQL Client Connection Guide](https://docs.pingcap.com/tidbcloud/connect-via-standard-connection)

---

## ✅ Checklist

- [ ] TiDB Cloud cluster created
- [ ] Password generated and saved
- [ ] `.env` file updated with connection details
- [ ] Database schema imported (910 lines, 16 tables)
- [ ] Connection tested successfully
- [ ] Backend starts without errors
- [ ] Can query data from TiDB Cloud

---

**Need help?** Check TiDB Cloud documentation or your project's main README.md
