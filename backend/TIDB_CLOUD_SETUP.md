# 🚀 TiDB Cloud Setup Guide

This guide will help you set up and migrate the iCAS-CMU HUB project to use TiDB Cloud as the database.

## 📋 Prerequisites

- TiDB Cloud account (sign up at https://tidbcloud.com)
- Node.js 18+ installed
- npm or yarn package manager

## 🔧 Step 1: Create TiDB Cloud Cluster

1. **Sign in to TiDB Cloud**
   - Go to https://tidbcloud.com
   - Sign in or create an account

2. **Create a New Cluster**
   - Click "Create Cluster"
   - Select **Developer Tier** (free tier available)
   - Choose **Singapore** region (or your preferred region)
   - Set cluster name (e.g., `icas-cmu-hub`)
   - Click "Create"

3. **Wait for Cluster to be Ready**
   - Cluster creation takes 5-10 minutes
   - Status will change to "Available" when ready

## 🔐 Step 2: Get Connection Details

1. **Open Cluster Dashboard**
   - Click on your cluster name
   - Go to "Connect" tab

2. **Get Connection Information**
   - **Host**: Copy the public endpoint (e.g., `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`)
   - **Port**: Usually `4000` (TiDB uses port 4000, not 3306)
   - **User**: Your root username
   - **Password**: The password you set during cluster creation
   - **Database**: Create a database named `icas_cmu_hub` (or use existing)

3. **Create Database** (if not exists)
   - Click "Connect" button
   - Use TiDB Cloud SQL Editor or connect via MySQL client:
   ```sql
   CREATE DATABASE IF NOT EXISTS icas_cmu_hub;
   ```

## ⚙️ Step 3: Configure Backend Environment

1. **Create/Update `backend/.env` file**
   ```env
   # Server Configuration
   PORT=5001
   NODE_ENV=development

   # TiDB Cloud Database Configuration
   DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
   DB_PORT=4000
   DB_USER=your_tidb_username
   DB_PASSWORD=your_tidb_password
   DB_NAME=icas_cmu_hub
   DB_SSL=true

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000

   # Chat Encryption Key (32+ characters)
   CHAT_ENCRYPTION_KEY=your-chat-encryption-key-at-least-32-characters-long

   # Email Configuration (Optional)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password

   # LINE Bot Configuration (Optional)
   LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
   LINE_CHANNEL_SECRET=your-line-channel-secret
   ```

2. **Important Notes:**
   - `DB_PORT` should be `4000` for TiDB Cloud (not 3306)
   - `DB_SSL=true` is required for TiDB Cloud connections
   - Replace all placeholder values with your actual credentials

## 📦 Step 4: Import Database Schema

1. **Install Dependencies** (if not already done)
   ```bash
   cd backend
   npm install
   ```

2. **Import SQL Schema**
   ```bash
   # Option 1: Using MySQL client
   mysql -h <DB_HOST> -P 4000 -u <DB_USER> -p <DB_NAME> < .sql/icas_cmu_hub.sql

   # Option 2: Using TiDB Cloud SQL Editor
   # Copy and paste the contents of backend/.sql/icas_cmu_hub.sql
   # into the SQL Editor and execute

   # Option 3: Using Node.js script
   npm run import:schema
   ```

3. **Verify Schema Import**
   ```bash
   npm run test:db
   ```

## 🔧 Step 5: Fix Chat Table (if needed)

If you're migrating from an existing database, run the chat table fix script:

```bash
npm run fix:chat-table
```

This script will:
- Add AUTO_INCREMENT to `club_chat_messages.id` if missing
- Clear old encrypted messages that can't be decrypted

## ✅ Step 6: Test Database Connection

1. **Test Connection**
   ```bash
   cd backend
   npm run test:db
   ```

2. **Expected Output:**
   ```
   ✅ Database connected successfully
   ```

3. **If Connection Fails:**
   - Check your `.env` file credentials
   - Verify cluster is running in TiDB Cloud dashboard
   - Check firewall/network settings
   - Ensure `DB_SSL=true` is set

## 🚀 Step 7: Start Development Servers

1. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

   Expected output:
   ```
   ✅ Database connected successfully
   ✅ WebSocket server initialized
   🚀 Server running on http://localhost:5001
   ```

2. **Start Frontend Server** (in a new terminal)
   ```bash
   npm install
   npm run dev
   ```

   Frontend will run on `http://localhost:3000`

## 🧪 Step 8: Test User Login

Use these test credentials to verify the system:

### Test Users (Password: `password123`)

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| Super Admin | `admin@cmu.ac.th` | `password123` | System administrator |
| Club Leader | `leader@cmu.ac.th` | `password123` | Club president/leader |
| Club Leader 2 | `leader2@cmu.ac.th` | `password123` | Alternative leader |
| Club Leader 3 | `leader3@cmu.ac.th` | `password123` | Alternative leader |
| Member | `member@cmu.ac.th` | `password123` | Regular club member |
| Member 2-5 | `member2@cmu.ac.th` - `member5@cmu.ac.th` | `password123` | Additional members |

### Reset Passwords (if needed)

If passwords don't work, reset all user passwords:

```bash
cd backend
npm run reset:passwords
```

This will set all user passwords to `password123`.

## 🔍 Troubleshooting

### Connection Issues

**Error: `Access denied for user`**
- Verify username and password in `.env`
- Check if user has proper permissions in TiDB Cloud
- Ensure database name is correct

**Error: `ECONNREFUSED` or `ETIMEDOUT`**
- Verify `DB_HOST` and `DB_PORT` (should be 4000)
- Check if TiDB Cloud cluster is running
- Verify network connectivity
- Check firewall settings

**Error: `SSL connection required`**
- Ensure `DB_SSL=true` in `.env`
- Verify SSL configuration in `database.ts`

**Error: `Unknown database`**
- Create database in TiDB Cloud SQL Editor:
  ```sql
  CREATE DATABASE icas_cmu_hub;
  ```

### Chat Functionality Issues

**Error: `Message could not be decrypted`**
- Ensure `CHAT_ENCRYPTION_KEY` is set in `.env`
- Run fix script: `npm run fix:chat-table`
- Old messages encrypted with different key cannot be decrypted

**Error: `AUTO_INCREMENT` issues**
- Run fix script: `npm run fix:chat-table`
- Or manually add AUTO_INCREMENT:
  ```sql
  ALTER TABLE club_chat_messages 
  MODIFY id int(11) NOT NULL AUTO_INCREMENT;
  ```

### API Connection Issues

**Frontend can't connect to backend**
- Verify backend is running on port 5001
- Check `src/config/api.ts` uses `localhost:5001`
- Check CORS settings in `backend/src/server.ts`
- Verify `CORS_ORIGIN=http://localhost:3000` in `.env`

### Port Conflicts

**Port 5001 already in use**
- Change `PORT` in `backend/.env` to another port (e.g., 5002)
- Update `src/config/api.ts` and `src/config/websocket.ts` accordingly

**Port 3000 already in use**
- Vite will automatically use the next available port
- Or specify port: `npm run dev -- --port 3001`

## 📚 Additional Resources

- [TiDB Cloud Documentation](https://docs.pingcap.com/tidbcloud/)
- [TiDB Cloud Connection Guide](https://docs.pingcap.com/tidbcloud/dev-guide/connect-via-standard-connection)
- [MySQL2 Documentation](https://github.com/sidorares/node-mysql2)

## 🔒 Security Notes

- **Never commit `.env` files** to version control
- **Use strong passwords** for database and JWT secrets
- **Rotate credentials** regularly in production
- **Enable IP whitelist** in TiDB Cloud for production
- **Use environment-specific** `.env` files (`.env.development`, `.env.production`)

## 📝 Next Steps

After successful setup:

1. ✅ Test all API endpoints
2. ✅ Verify chat messages send/receive correctly
3. ✅ Test file uploads (assignments, documents)
4. ✅ Verify WebSocket connections
5. ✅ Test all user roles and permissions
6. ✅ Set up production environment variables
7. ✅ Configure CI/CD pipelines
8. ✅ Set up monitoring and logging

---

**Need Help?** Check the troubleshooting section above or review the error logs in your terminal.
