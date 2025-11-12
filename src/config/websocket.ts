import { io, Socket } from 'socket.io-client';

const inferSocketUrl = () => {
  const base = import.meta.env.VITE_API_URL?.replace('/api', '');

  if (base) {
    return base;
  }

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;

    if (
      origin.includes('localhost:3000') ||
      origin.includes('127.0.0.1:3000')
    ) {
      return 'http://localhost:5000';
    }

    return origin.replace(/^http/, 'ws');
  }

  return 'http://localhost:5000';
};

const SOCKET_URL = inferSocketUrl();

let socket: Socket | null = null;

export const getSocket = (): Socket | null => {
  return socket;
};

export const connectSocket = (): Socket => {
  if (socket?.connected) {
    return socket;
  }

  // Cookies are sent automatically with withCredentials
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    withCredentials: true, // Send cookies with WebSocket connection
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ WebSocket connection error:', error);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`✅ WebSocket reconnected after ${attemptNumber} attempts`);
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 WebSocket reconnection attempt ${attemptNumber}`);
  });

  socket.on('reconnect_error', (error) => {
    console.error('❌ WebSocket reconnection error:', error);
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ WebSocket reconnection failed');
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const reconnectSocket = (): Socket => {
  disconnectSocket();
  return connectSocket();
};

