import './envBootstrap';
import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import cors, { CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import { testConnection } from './config/database';
import { ensureUserSuspensionSchema } from './config/ensureUserSuspensionSchema';
import { ensureClubPresidencyAuditSchema } from './config/ensureClubPresidencyAuditSchema';
import { ensureSmartDocumentArchiveSchema } from './config/ensureSmartDocumentArchiveSchema';
import healthRouter from './routes/health';
import authRouter from './features/auth/routes/auth';
import checkinRouter from './features/checkin/routes/checkin';
import clubRouter from './features/club/routes/club';
import chatRouter from './features/club/routes/chat';
import eventRouter from './features/event/routes/event';
import assignmentRouter from './features/assignment/routes/assignment';
import documentRouter from './features/smart-document/routes/document';
import reportRouter from './features/report/routes/report';
import adminRouter from './features/admin/routes/admin';
import { initializeSocketIO } from './websocket/socketServer';
import path from 'path';

const app: Express = express();
app.set('trust proxy', 1);
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

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Serve static files for documents (templates)
app.use('/documents', express.static(path.join(__dirname, '../documents')));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/checkin', checkinRouter);
// clubRouter must be first so public GET / and /:id are not blocked by authenticate on other routers.
app.use('/api/clubs', clubRouter);
app.use('/api/clubs', assignmentRouter); // /:clubId/assignments...
app.use('/api/clubs', chatRouter);
app.use('/api/clubs', documentRouter); // /:clubId/documents...
app.use('/api/events', eventRouter);
app.use('/api/reports', reportRouter);
app.use('/api/admin', adminRouter);

// Serve React app static files in production
if (!isDevelopment) {
  const buildPath = path.join(__dirname, '../../build');
  app.use(express.static(buildPath));
}

// Root endpoint - only in development, in production serve React app
if (isDevelopment) {
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
        events: '/api/events',
        assignments: '/api/clubs/:clubId/assignments',
      },
    });
  });
}

// Catch-all handler: serve React app for all non-API routes (SPA routing)
// This ensures React Router can handle client-side routing
if (!isDevelopment) {
  app.get('*', (req: Request, res: Response) => {
    // Don't serve React app for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    // Serve React app's index.html for all other routes
    res.sendFile(path.join(__dirname, '../../build/index.html'));
  });
}

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.warn('⚠️  Warning: Database connection failed. Some features may not work.');
    } else {
      await ensureUserSuspensionSchema();
      await ensureClubPresidencyAuditSchema();
      await ensureSmartDocumentArchiveSchema();
    }

    // Initialize WebSocket server
    initializeSocketIO(httpServer);
    console.log('WebSocket server initialized');

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

