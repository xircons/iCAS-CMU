# Integrated Club Administration System (iCAS-CMU HUB)

A comprehensive club management system built with React, TypeScript, and Node.js.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- npm or yarn

### Docker Setup (Recommended)

The easiest way to run the entire application is using Docker Compose, which sets up all services automatically:

```bash
# Start all services (database, backend, frontend)
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

**Access Points:**
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5002/api
- **Database**: localhost:3307 (user: `root`, password: `rootpassword`)

The SQL file (`backend/database/icas_cmu_hub.sql`) is automatically executed when the database container starts for the first time.

### Local Development Setup

**Option A: Run Everything Locally**

1. **Database Setup (XAMPP MySQL)**
   - Start XAMPP and start MySQL service
   - Open phpMyAdmin: `http://localhost/phpmyadmin`
   - Create database: `icas_cmu_hub`
   - Import schema: Copy and run `backend/database/icas_cmu_hub.sql` in phpMyAdmin SQL tab

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Create .env file (see Environment Variables section)
   npm run dev
   ```
   Backend will run on `http://localhost:5000`

3. **Frontend Setup**
   ```bash
   # From project root
   npm install
   npm run dev
   ```
   Frontend will run on `http://localhost:3000` with hot-reload enabled.

**Option B: Hybrid (Docker Database + Backend, Local Frontend)**

```bash
# Start database and backend in Docker
docker-compose up -d database backend

# Run frontend locally for hot-reload
npm install
npm run dev
```

## 📁 Project Structure

```
├── backend/              # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── routes/       # API routes
│   │   ├── controllers/ # Request handlers
│   │   ├── models/       # Data models
│   │   └── types/        # TypeScript types
│   └── database/        # SQL schema files
├── src/                  # React frontend
│   ├── components/      # React components
│   └── config/          # API configuration
└── public/               # Static assets
```

## 🐳 Docker Details

The Docker setup includes three services:
- **Database**: MySQL 8.0 with automatic SQL initialization
- **Backend**: Node.js API server (TypeScript + Express)
- **Frontend**: React application served with nginx

### Service Ports

Due to potential port conflicts with local services, the Docker services use alternative ports:
- **Frontend**: Port `3001` (mapped from container port 80)
- **Backend**: Port `5002` (mapped from container port 5000)
- **Database**: Port `3307` (mapped from container port 3306)

### Database Management

The SQL file (`backend/database/icas_cmu_hub.sql`) is automatically executed when the database container starts for the first time. The database is stored in a Docker volume (`mysql_data`), so data persists between container restarts.

**To reset the database and re-run the SQL file:**

```bash
# Stop services and remove database volume
docker-compose down
docker volume rm icas-cmu-hub_mysql_data

# Start services (SQL will run automatically on first startup)
docker-compose up -d
```

**To access the database directly:**

```bash
# Connect to MySQL container
docker exec -it icas-database mysql -uroot -prootpassword icas_cmu_hub

# Or from host machine
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword icas_cmu_hub
```

### Useful Docker Commands

```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f database
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a specific service
docker-compose restart backend

# Rebuild and restart services
docker-compose up -d --build

# Stop all services
docker-compose down

# Stop and remove volumes (will delete database data)
docker-compose down -v
```

## 🔧 Environment Variables

### Docker Environment Variables

The Docker Compose setup uses environment variables defined in `docker-compose.yml`. Key variables:

**Database:**
- `MYSQL_ROOT_PASSWORD=rootpassword`
- `MYSQL_DATABASE=icas_cmu_hub`
- `MYSQL_USER=icas_user`
- `MYSQL_PASSWORD=icas_password`

**Backend:**
- `DB_HOST=database` (service name for Docker networking)
- `DB_PORT=3306`
- `DB_USER=root`
- `DB_PASSWORD=rootpassword`
- `DB_NAME=icas_cmu_hub`
- `JWT_SECRET=your-secret-key-change-in-production`
- `JWT_EXPIRES_IN=7d`
- `CORS_ORIGIN=http://localhost:3000`

**Frontend:**
- `VITE_API_URL=http://localhost:5000/api` (Note: Update to `http://localhost:5002/api` if using Docker backend)

### Local Development (.env files)

**Backend** - Create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=icas_cmu_hub
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

**Frontend** - Create `.env` in project root (optional):
```env
VITE_API_URL=http://localhost:5000/api
```

**Note:** For Docker backend, use `http://localhost:5002/api` instead.

## 🧪 Testing

### Test Database Connection

**With Docker:**
```bash
# Check backend health endpoint
curl http://localhost:5002/api/health

# Or test database connection directly
docker exec -it icas-database mysql -uroot -prootpassword -e "USE icas_cmu_hub; SHOW TABLES;"
```

**Local Development:**
```bash
cd backend
npm run dev
# Check http://localhost:5000/api/health
```

Or test directly:
```bash
cd backend
npx tsx src/scripts/test-connection.ts
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - Verify JWT token
- `GET /api/auth/me` - Get current user (protected)

### Health
- `GET /api/health` - Health check and database connection status

## 🛠️ Development

### Backend
```bash
cd backend
npm run dev      # Development with hot-reload
npm run build    # Build for production
npm start        # Run production build
npm run type-check  # TypeScript type checking
```

### Frontend
```bash
npm run dev      # Development server
npm run build    # Production build
```

## 📝 Notes

### Docker Setup
- All services run in Docker containers with isolated networking
- Database data persists in Docker volume `mysql_data`
- SQL file is automatically executed on first database initialization
- Ports are configured to avoid conflicts: Frontend (3001), Backend (5002), Database (3307)

### Local Development
- Database connection defaults to XAMPP MySQL (localhost:3306, root, no password)
- Update `backend/.env` if your MySQL has different credentials
- Frontend uses axios for API calls (configured in `src/config/api.ts`)
- Backend uses TypeScript with Express and mysql2

### Troubleshooting

**Port conflicts:**
If ports 3001, 5002, or 3307 are already in use, update the port mappings in `docker-compose.yml`.

**Database not initializing:**
If the SQL file doesn't run, remove the volume and restart:
```bash
docker-compose down -v
docker-compose up -d
```

**Frontend can't connect to backend:**
Ensure the `VITE_API_URL` environment variable matches the backend port (5002 for Docker, 5000 for local).

