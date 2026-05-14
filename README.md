# Integrated Club Administration System (iCAS-CMU HUB)

A comprehensive club management system built with React, TypeScript, and Node.js.

## Quick Start

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
- **Database**: localhost:5433 (user: `icas_user`, password: `icas_password`)

The Docker database is PostgreSQL. Use `backend/docs/SUPABASE_POSTGRES_MIGRATION.md` when importing the legacy MySQL/MariaDB dump into Supabase.

### Local Development Setup

**Option A: Run Everything Locally**

1. **Database Setup (PostgreSQL or Supabase)**
   - Set `DATABASE_URL` in `backend/.env`
   - For Supabase migration, follow `backend/docs/SUPABASE_POSTGRES_MIGRATION.md`

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

## Project Structure

```
├── backend/              # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── routes/       # API routes
│   │   ├── controllers/ # Request handlers
│   │   ├── models/       # Data models
│   │   └── types/        # TypeScript types
│   └── .sql/           # SQL schema and migration helpers
├── src/                  # React frontend
│   ├── components/      # React components
│   └── config/          # API configuration
└── public/               # Static assets
```

## Docker Details

The Docker setup includes three services:
- **Database**: PostgreSQL 16 for local development
- **Backend**: Node.js API server (TypeScript + Express)
- **Frontend**: React application served with nginx

### Service Ports

Due to potential port conflicts with local services, the Docker services use alternative ports:
- **Frontend**: Port `3001` (mapped from container port 80)
- **Backend**: Port `5002` (mapped from container port 5000)
- **Database**: Port `5433` (mapped from container port 5432)

### Database Management

The database is stored in a Docker volume (`postgres_data`), so data persists between container restarts. The legacy dump at `backend/.sql/icas_cmu_hub.sql` is MySQL/MariaDB syntax and should be migrated with pgloader before loading into Supabase/Postgres.

**To reset the database and re-run the SQL file:**

```bash
docker-compose down
docker volume rm icas-cmu-hub_postgres_data

docker-compose up -d
```

**To access the database directly:**

```bash
docker exec -it icas-database psql -U icas_user -d icas_cmu_hub

psql "postgresql://icas_user:icas_password@127.0.0.1:5433/icas_cmu_hub?sslmode=disable"
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

## Environment Variables

### Docker Environment Variables

The Docker Compose setup uses environment variables defined in `docker-compose.yml`. Key variables:

**Database:**
- `POSTGRES_DB=icas_cmu_hub`
- `POSTGRES_USER=icas_user`
- `POSTGRES_PASSWORD=icas_password`

**Backend:**
- `DATABASE_URL=postgresql://icas_user:icas_password@database:5432/icas_cmu_hub?sslmode=disable`
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
DATABASE_URL=postgresql://icas_user:icas_password@localhost:5433/icas_cmu_hub?sslmode=disable
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

**Frontend** - Create `.env` in project root (optional):
```env
VITE_API_URL=http://localhost:5000/api
```

**Note:** For Docker backend, use `http://localhost:5002/api` instead.

## Testing

### Test Database Connection

**With Docker:**
```bash
# Check backend health endpoint
curl http://localhost:5002/api/health

docker exec -it icas-database psql -U icas_user -d icas_cmu_hub -c "\\dt"
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

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - Verify JWT token
- `GET /api/auth/me` - Get current user (protected)

### Health
- `GET /api/health` - Health check and database connection status

## Development

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

## Notes

### Docker Setup
- All services run in Docker containers with isolated networking
- Database data persists in Docker volume `postgres_data`
- Load migrated PostgreSQL schema/data separately when needed
- Ports are configured to avoid conflicts: Frontend (3001), Backend (5002), Database (5433)

### Local Development
- Database connection uses PostgreSQL via `DATABASE_URL`
- Update `backend/.env` when using Supabase or another Postgres instance
- Frontend uses axios for API calls (configured in `src/config/api.ts`)
- Backend uses TypeScript with Express and **PostgreSQL** via `pg` (e.g. Supabase). See [backend/docs/SUPABASE_POSTGRES_MIGRATION.md](backend/docs/SUPABASE_POSTGRES_MIGRATION.md) for moving from MySQL/MariaDB.

### Troubleshooting

**Port conflicts:**
If ports 3001, 5002, or 5433 are already in use, update the port mappings in `docker-compose.yml`.

**Database reset:**
To reset local Postgres, remove the volume and restart:
```bash
docker-compose down -v
docker-compose up -d
```

**Frontend can't connect to backend:**
Ensure the `VITE_API_URL` environment variable matches the backend port (5002 for Docker, 5000 for local).
