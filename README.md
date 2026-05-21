# Integrated Club Administration System (iCAS-CMU HUB)

A comprehensive club management system built with React, TypeScript, and Node.js.

## Quick Start

### Prerequisites     

- Docker and Docker Compose
- Node.js 20+ (for local development)
- npm or yarn

### Docker Setup (Recommended)

Production-oriented Compose stack (database, backend, frontend with same-origin API proxy):

```bash
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD, JWT secrets, CORS_ORIGIN, etc.

docker compose --env-file .env up -d --build
docker compose ps
./scripts/docker-smoke.sh   # health checks on http://127.0.0.1:3001
```

**Access (local):**
- **App (SPA + API + WebSocket)**: http://127.0.0.1:3001 — API at `/api`, Socket.IO at `/socket.io/`
- **Database**: internal only (not published on the host)

Server deployment with HTTPS: see [docs/DEPLOY.md](docs/DEPLOY.md).

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

**Option B: Hybrid (Docker stack + local frontend dev server)**

Run the full stack with Compose, or run `npm run dev` locally with `VITE_API_URL` pointing at your API (see Environment Variables).

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

- **Frontend**: `127.0.0.1:3001` → container port 80 (Nginx serves SPA and proxies `/api/` and `/socket.io/` to the backend)
- **Backend**: internal port 5000 only (not published on the host)
- **Database**: internal port 5432 only (not published on the host)

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

Copy [`.env.example`](.env.example) to `.env` at the project root. Compose loads it via `env_file`. Do **not** set `VITE_API_URL` for production Docker (same-origin `/api` via Nginx).

Key variables: `POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `CHAT_ENCRYPTION_KEY`, SMTP settings.

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
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:3001/api/health

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
- Three services: `database`, `backend`, `frontend` (Nginx proxies API and Socket.IO)
- Volumes: `postgres_data`, `backend_uploads`
- Only the frontend is published on `127.0.0.1:3001`

### Local Development
- Database connection uses PostgreSQL via `DATABASE_URL`
- Update `backend/.env` when using Supabase or another Postgres instance
- Frontend uses axios for API calls (configured in `src/config/api.ts`)
- Backend uses TypeScript with Express and **PostgreSQL** via `pg` (e.g. Supabase). See [backend/docs/SUPABASE_POSTGRES_MIGRATION.md](backend/docs/SUPABASE_POSTGRES_MIGRATION.md) for moving from MySQL/MariaDB.

### Troubleshooting

**Port conflicts:**
If port 3001 is in use, change the frontend mapping in `docker-compose.yml` (e.g. `127.0.0.1:3002:80`).

**Database reset:**
```bash
docker compose down -v
docker compose --env-file .env up -d --build
```

**Frontend can't reach API:**
With Docker, use http://127.0.0.1:3001 (same origin). Do not set `VITE_API_URL` unless using a split dev setup.
