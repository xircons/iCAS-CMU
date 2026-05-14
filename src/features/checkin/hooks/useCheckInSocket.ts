import { useEffect, useRef, useState } from 'react';
import { connectSocket } from '../../../config/websocket';
import type { CheckedInMember } from '../api/checkinApi';

function sameEventId(a: unknown, b: number | null): boolean {
  if (b == null) return false;
  const na = typeof a === 'number' ? a : Number(a);
  const nb = typeof b === 'number' ? b : Number(b);
  return Number.isFinite(na) && Number.isFinite(nb) && na === nb;
}

export const useCheckInSocket = (eventId: number | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [checkedInMembers, setCheckedInMembers] = useState<CheckedInMember[]>([]);
  const eventIdRef = useRef<number | null>(eventId);

  useEffect(() => {
    eventIdRef.current = eventId;
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;

    const socket = connectSocket();

    const joinRoom = () => {
      const id = eventIdRef.current;
      if (!id || !socket.connected) return;
      socket.emit('join-event', id);
    };

    const onCheckInSuccess = (data: {
      eventId: number;
      userId: number;
      firstName: string;
      lastName: string;
      method: 'qr' | 'passcode';
      checkInTime: string;
    }) => {
      const id = eventIdRef.current;
      if (!sameEventId(data.eventId, id)) return;
      const newMember: CheckedInMember = {
        userId: data.userId,
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        checkInTime: data.checkInTime,
        method: data.method,
      };
      setCheckedInMembers((prev) => {
        if (prev.some((m) => m.userId === newMember.userId)) return prev;
        return [newMember, ...prev];
      });
    };

    const onSessionStarted = (data: { eventId: number }) => {
      if (!sameEventId(data.eventId, eventIdRef.current)) return;
      setCheckedInMembers([]);
    };

    const onSessionEnded = (data: { eventId: number }) => {
      if (!sameEventId(data.eventId, eventIdRef.current)) return;
    };

    const onConnect = () => {
      setIsConnected(true);
      joinRoom();
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    socket.off('check-in-success', onCheckInSuccess);
    socket.off('check-in-session-started', onSessionStarted);
    socket.off('check-in-session-ended', onSessionEnded);
    socket.off('connect', onConnect);
    socket.off('disconnect', onDisconnect);

    socket.on('check-in-success', onCheckInSuccess);
    socket.on('check-in-session-started', onSessionStarted);
    socket.on('check-in-session-ended', onSessionEnded);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    setIsConnected(socket.connected);
    if (socket.connected) {
      joinRoom();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('check-in-success', onCheckInSuccess);
      socket.off('check-in-session-started', onSessionStarted);
      socket.off('check-in-session-ended', onSessionEnded);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      if (socket.connected) {
        socket.emit('leave-event', eventId);
      }
    };
  }, [eventId]);

  const addMember = (member: CheckedInMember) => {
    setCheckedInMembers((prev) => {
      if (prev.some((m) => m.userId === member.userId)) return prev;
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
