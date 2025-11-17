import { useEffect, useRef, useState } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../../../config/websocket';
import { CheckedInMember } from '../api/checkinApi';

export interface CheckInSocketEvents {
  'check-in-success': (data: {
    eventId: number;
    userId: number;
    firstName: string;
    lastName: string;
    method: 'qr' | 'passcode';
    checkInTime: string;
  }) => void;
  'check-in-session-started': (data: {
    eventId: number;
    passcode: string;
    expiresAt: string;
  }) => void;
  'check-in-session-ended': (data: {
    eventId: number;
  }) => void;
}

export const useCheckInSocket = (eventId: number | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [checkedInMembers, setCheckedInMembers] = useState<CheckedInMember[]>([]);
  const socketRef = useRef<ReturnType<typeof getSocket>>(null);

  useEffect(() => {
    if (!eventId) return;

    try {
      const socket = connectSocket();
      socketRef.current = socket;

      // Check if already connected
      if (socket.connected) {
        setIsConnected(true);
        socket.emit('join-event', eventId);
      }

      socket.on('connect', () => {
        setIsConnected(true);
        // Join event room
        socket.emit('join-event', eventId);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      // Listen for check-in events
      socket.on('check-in-success', (data) => {
        if (data.eventId === eventId) {
          const newMember: CheckedInMember = {
            userId: data.userId,
            firstName: data.firstName,
            lastName: data.lastName,
            checkInTime: data.checkInTime,
            method: data.method,
          };
          setCheckedInMembers((prev) => {
            // Check if member already exists (prevent duplicates)
            const exists = prev.some((m) => m.userId === newMember.userId);
            if (exists) return prev;
            return [newMember, ...prev];
          });
        }
      });

      socket.on('check-in-session-started', (data) => {
        if (data.eventId === eventId) {
          // Session started - clear old members list since new session means fresh start
          setCheckedInMembers([]);
          console.log('Check-in session started for event:', eventId);
        }
      });

      socket.on('check-in-session-ended', (data) => {
        if (data.eventId === eventId) {
          // Session ended, you might want to update UI
          console.log('Check-in session ended for event:', eventId);
        }
      });

      return () => {
        if (socket && socket.connected) {
          socket.emit('leave-event', eventId);
        }
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
    }
  }, [eventId]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (socketRef.current && eventId) {
        socketRef.current.emit('leave-event', eventId);
      }
    };
  }, [eventId]);

  const addMember = (member: CheckedInMember) => {
    setCheckedInMembers((prev) => {
      const exists = prev.some((m) => m.userId === member.userId);
      if (exists) return prev;
      return [member, ...prev];
    });
  };

  const clearMembers = () => {
    setCheckedInMembers([]);
  };

  return {
    isConnected,
    checkedInMembers,
    addMember,
    clearMembers,
  };
};

