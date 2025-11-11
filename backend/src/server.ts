import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import cors, { CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { testConnection } from './config/database';
import healthRouter from './routes/health';
import authRouter from './features/auth/routes/auth';
import checkinRouter from './features/checkin/routes/checkin';
import clubRouter from './features/club/routes/club';
import { initializeSocketIO } from './websocket/socketServer';

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5001;
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const isDevelopment = process.env.NODE_ENV !== 'production';

// CORS Configuration
const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // In development, allow any localhost port
    if (isDevelopment || !process.env.NODE_ENV) {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    
    // In production or if CORS_ORIGIN is set, use specific origin
    if (CORS_ORIGIN) {
      if (origin === CORS_ORIGIN) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }
    
          // Default: allow localhost:3000
    if (origin === 'http://localhost:3000') {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200,
};

// Handle preflight requests
app.options('*', cors(corsOptions));

// Middleware - CORS must be before other middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/checkin', checkinRouter);
app.use('/api/clubs', clubRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'iCAS-CMU HUB API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      checkin: '/api/checkin',
      clubs: '/api/clubs',
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.warn('⚠️  Warning: Database connection failed. Some features may not work.');
    }

    // Initialize WebSocket server
    initializeSocketIO(httpServer);
    console.log('✅ WebSocket server initialized');

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      if (isDevelopment) {
        console.log(`🔗 CORS enabled for: All localhost ports (development mode)`);
      } else {
              console.log(`🔗 CORS enabled for: ${CORS_ORIGIN || 'http://localhost:3000'}`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

