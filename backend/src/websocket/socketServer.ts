import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../features/auth/utils/jwt';
import { setSocketIO } from '../features/checkin/controllers/checkinController';

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

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
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

    socket.on('disconnect', () => {
      console.log(`❌ WebSocket client disconnected: ${user?.email || 'unknown'}`);
    });
  });

  return io;
};

export const getSocketIO = (): SocketIOServer | null => {
  return io;
};

