# Integrated Club Administration System (iCAS-CMU HUB)

A comprehensive club management system built with React, TypeScript, and Node.js.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- XAMPP (for MySQL)
- npm or yarn

### 1. Database Setup (XAMPP MySQL)

1. Start XAMPP and start MySQL service
2. Open phpMyAdmin: `http://localhost/phpmyadmin`
3. Create database: `icas_cmu_hub`
4. Import schema: Copy and run `backend/database/schema.sql` in phpMyAdmin SQL tab

See `backend/database/README.md` for detailed instructions.

### 2. Backend Setup (Docker - Recommended)

**Option A: Run Backend in Docker (Always Running)**
```bash
# Start backend in Docker (runs in background)
docker-compose up -d backend

# Check if backend is running
docker-compose ps

# View logs
docker-compose logs -f backend

# Stop backend
docker-compose stop backend
```

Backend will run on `http://localhost:5000` and automatically restart if it crashes.

**Option B: Run Backend Locally (Development)**
```bash
cd backend
npm install

# Create .env file (see Environment Variables section)
npm run dev
```

### 3. Frontend Setup (Local Development)

```bash
# From project root
npm install
npm run dev
```

Frontend will run on `http://localhost:3000` with hot-reload enabled.

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

## 🐳 Docker

### Development Mode (Backend Only - Recommended)

**Setup:**
- **Backend**: Run in Docker (always running, auto-restart)
- **Frontend**: Run locally with `npm run dev` (for hot-reload)

```bash
# Start only backend in Docker
docker-compose up -d backend

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend

# Stop backend
docker-compose stop backend
```

- Frontend: `http://localhost:3000` (local dev server with hot-reload)
- Backend API: `http://localhost:5000` (Docker container)

**Note:** Frontend service is commented out in `docker-compose.yml`. 
To run both in Docker, uncomment the frontend service.

### Production

```bash
docker-compose up -d
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

## 🔧 Environment Variables

### Backend (.env)
Create `backend/.env` file:
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=icas_cmu_hub
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

**Note:** Copy `backend/.env.example` to `backend/.env` and update values as needed.

### Frontend (.env) - Optional
Create `.env` in project root (only if API URL differs):
```env
VITE_API_URL=http://localhost:5000/api
```

## 🧪 Testing Database Connection

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

- Database connection is configured for XAMPP MySQL (localhost, root, no password)
- Update `backend/.env` if your MySQL has different credentials
- Frontend uses axios for API calls (configured in `src/config/api.ts`)
- Backend uses TypeScript with Express and mysql2

-g