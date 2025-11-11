import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../features/auth/utils/jwt';
import { setSocketIO } from '../features/checkin/controllers/checkinController';
import { setClubSocketIO } from '../features/club/controllers/clubController';

let io: SocketIOServer | null = null;

export const initializeSocketIO = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Set socket.io instance in check-in controller
  setSocketIO(io);
  // Set socket.io instance in club controller
  setClubSocketIO(io);

  io.use(async (socket: Socket, next) => {
    try {
      // Parse cookies from handshake headers
      const cookieHeader = socket.handshake.headers.cookie;
      let token: string | null = null;

      if (cookieHeader) {
        // Parse cookie string to extract access_token
        const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie: string) => {
          const [key, value] = cookie.trim().split('=');
          if (key && value) {
            acc[key] = decodeURIComponent(value);
          }
          return acc;
        }, {});
        
        token = cookies.access_token || null;
      }

      // Fallback to auth.token or Authorization header for backward compatibility
      if (!token) {
        token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '') || null;
      }
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyToken(token);
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    console.log(`✅ WebSocket client connected: ${user?.email || 'unknown'}`);

    // Join event room
    socket.on('join-event', (eventId: number) => {
      const room = `event-${eventId}`;
      socket.join(room);
      console.log(`📥 User ${user?.email} joined room: ${room}`);
    });

    // Leave event room
    socket.on('leave-event', (eventId: number) => {
      const room = `event-${eventId}`;
      socket.leave(room);
      console.log(`📤 User ${user?.email} left room: ${room}`);
    });

    // Join club room (for leaders to get real-time updates)
    socket.on('join-club', (clubId: number) => {
      const room = `club-${clubId}`;
      socket.join(room);
      console.log(`📥 User ${user?.email} joined club room: ${room}`);
    });

    // Leave club room
    socket.on('leave-club', (clubId: number) => {
      const room = `club-${clubId}`;
      socket.leave(room);
      console.log(`📤 User ${user?.email} left club room: ${room}`);
    });

    // Join user-specific room for personal notifications
    if (user?.userId) {
      const userRoom = `user-${user.userId}`;
      socket.join(userRoom);
      console.log(`📥 User ${user?.email} joined user room: ${userRoom}`);
    }

    socket.on('disconnect', () => {
      console.log(`❌ WebSocket client disconnected: ${user?.email || 'unknown'}`);
    });
  });

  return io;
};

export const getSocketIO = (): SocketIOServer | null => {
  return io;
};

