import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../config/websocket';

interface WebSocketContextType {
  isConnected: boolean;
  socket: ReturnType<typeof getSocket> | null;
  subscribe: (event: string, handler: (data: any) => void) => () => void;
  emit: (event: string, data: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children?: React.ReactNode;
  enabled?: boolean;
}

export function WebSocketProvider({ children, enabled = true }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const handlersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  // Initialize WebSocket connection
  useEffect(() => {
    if (!enabled) {
      return;
    }

    try {
      const socket = connectSocket();
      socketRef.current = socket;

      const handleConnect = () => {
        setIsConnected(true);
        console.log('✅ Global WebSocket connected');
      };

      const handleDisconnect = (reason: string) => {
        setIsConnected(false);
        console.log('❌ Global WebSocket disconnected:', reason);
      };

      const handleReconnect = () => {
        setIsConnected(true);
        console.log('✅ Global WebSocket reconnected');
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('reconnect', handleReconnect);

      // Set initial connection state
      setIsConnected(socket.connected);

      // Generic event handler that routes to registered handlers
      const createEventHandler = (event: string) => {
        return (data: any) => {
          const handlers = handlersRef.current.get(event);
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(data);
              } catch (error) {
                console.error(`Error in WebSocket handler for ${event}:`, error);
              }
            });
          }
        };
      };

      // Track registered events
      const registeredEvents = new Set<string>();

      // Function to register event listener
      const registerEvent = (event: string) => {
        if (!registeredEvents.has(event)) {
          const handler = createEventHandler(event);
          socket.on(event, handler);
          registeredEvents.add(event);
          // Store handler for cleanup
          (socket as any)._eventHandlers = (socket as any)._eventHandlers || new Map();
          (socket as any)._eventHandlers.set(event, handler);
        }
      };

      // Store register function and registered events for later use
      (socket as any)._registerEvent = registerEvent;
      (socket as any)._registeredEvents = registeredEvents;

      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('reconnect', handleReconnect);
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }, [enabled]);

  // Subscribe to an event
  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);

    // Register the event with socket if not already registered
    const socket = socketRef.current;
    if (socket && (socket as any)._registerEvent) {
      (socket as any)._registerEvent(event);
    }

    // Return unsubscribe function
    return () => {
      const handlers = handlersRef.current.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          handlersRef.current.delete(event);
          // Remove socket listener if no more handlers
          if (socket) {
            const eventHandler = (socket as any)._eventHandlers?.get(event);
            if (eventHandler) {
              socket.off(event, eventHandler);
              (socket as any)._eventHandlers?.delete(event);
            }
            if ((socket as any)._registeredEvents) {
              (socket as any)._registeredEvents.delete(event);
            }
          }
        }
      }
    };
  }, []);

  // Emit an event
  const emit = useCallback((event: string, data: any) => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: WebSocket not connected`);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!enabled) {
        disconnectSocket();
      }
    };
  }, [enabled]);

  const value: WebSocketContextType = {
    isConnected,
    socket: socketRef.current,
    subscribe,
    emit,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

