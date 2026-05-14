import { useEffect, useState, useRef } from 'react';
import { connectSocket, getSocket } from '../../../config/websocket';
import { toast } from 'sonner';

interface ClubJoinRequest {
  clubPublicId: string;
  membership: any;
  userId: number;
}

interface ClubMembershipUpdated {
  clubPublicId: string;
  membership: any;
  status: 'approved' | 'rejected';
}

interface ClubMemberRoleUpdated {
  clubPublicId: string;
  membership: any;
}

interface ClubMemberRemoved {
  clubPublicId: string;
  membershipId: number;
  userId: number;
}

interface UserRoleUpdated {
  userId: number;
  newRole: 'member' | 'leader' | 'admin';
  message: string;
}

interface ClubHomeContentUpdated {
  clubPublicId: string;
  club: any;
}

interface UseClubSocketOptions {
  clubId?: string | null;
  onJoinRequest?: (data: ClubJoinRequest) => void;
  onMembershipUpdated?: (data: ClubMembershipUpdated) => void;
  onMemberRoleUpdated?: (data: ClubMemberRoleUpdated) => void;
  onMemberRemoved?: (data: ClubMemberRemoved) => void;
  onMembershipStatusChanged?: (data: ClubMembershipUpdated) => void;
  onUserRoleUpdated?: (data: UserRoleUpdated) => void;
  onHomeContentUpdated?: (data: ClubHomeContentUpdated) => void;
}

export const useClubSocket = (options: UseClubSocketOptions = {}) => {
  const {
    clubId,
    onJoinRequest,
    onMembershipUpdated,
    onMemberRoleUpdated,
    onMemberRemoved,
    onMembershipStatusChanged,
    onUserRoleUpdated,
    onHomeContentUpdated,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<ReturnType<typeof getSocket>>(null);

  useEffect(() => {
    // Connect even without clubId to receive user-specific notifications
    // Or if we need to listen for home content updates
    if (!onMembershipStatusChanged && !clubId && !onHomeContentUpdated) return;

    try {
      const socket = connectSocket();
      socketRef.current = socket;

      // Set up connection state
      setIsConnected(socket.connected);

      // Join club room immediately if socket is already connected
      const joinClubRoom = () => {
        if (clubId && socket.connected) {
          socket.emit('join-club', clubId);
          console.log(`📥 Joining club room: club-${clubId}`);
        }
      };

      // Join room if already connected, otherwise wait for connect
      if (socket.connected) {
        joinClubRoom();
      }

      const handleConnect = () => {
        setIsConnected(true);
        joinClubRoom();
      };

      const handleReconnect = () => {
        setIsConnected(true);
        joinClubRoom();
      };

      const handleDisconnect = () => {
        setIsConnected(false);
      };

      // Listen for club events
      const handleJoinRequest = (data: ClubJoinRequest) => {
        console.log('📨 Received club-join-request:', data);
        if (data.clubPublicId === clubId && onJoinRequest) {
          onJoinRequest(data);
        }
      };

      const handleMembershipUpdated = (data: ClubMembershipUpdated) => {
        console.log('📨 Received club-membership-updated:', data);
        if (data.clubPublicId === clubId && onMembershipUpdated) {
          onMembershipUpdated(data);
        }
      };

      const handleMemberRoleUpdated = (data: ClubMemberRoleUpdated) => {
        console.log('📨 Received club-member-role-updated:', data);
        if (data.clubPublicId === clubId && onMemberRoleUpdated) {
          onMemberRoleUpdated(data);
        }
      };

      const handleMemberRemoved = (data: ClubMemberRemoved) => {
        console.log('📨 Received club-member-removed:', data);
        if (data.clubPublicId === clubId && onMemberRemoved) {
          onMemberRemoved(data);
        }
      };

      // Listen for membership status changes (for users who requested to join)
      const handleMembershipStatusChanged = (data: ClubMembershipUpdated) => {
        console.log('📨 Received membership-status-changed:', data);
        if (onMembershipStatusChanged) {
          onMembershipStatusChanged(data);
        } else {
          // Only show toast if no callback is provided
          if (data.status === 'approved') {
            toast.success(`คุณได้รับการอนุมัติเข้าร่วมชมรมแล้ว!`);
          } else if (data.status === 'rejected') {
            toast.info(`คำขอเข้าร่วมชมรมของคุณถูกปฏิเสธ`);
          }
        }
      };

      // Listen for user role updates
      const handleUserRoleUpdated = (data: UserRoleUpdated) => {
        console.log('📨 Received user-role-updated:', data);
        if (onUserRoleUpdated) {
          onUserRoleUpdated(data);
        } else {
          // Default behavior: show toast and suggest refresh
          toast.info(data.message || 'บทบาทของคุณได้รับการอัปเดต กรุณารีเฟรชหน้าเว็บ');
        }
      };

      // Listen for club home content updates
      const handleHomeContentUpdated = (data: ClubHomeContentUpdated) => {
        console.log('📨 Received club-home-content-updated:', data);
        if (data.clubPublicId === clubId && onHomeContentUpdated) {
          onHomeContentUpdated(data);
        }
      };

      // Register event listeners
      socket.on('connect', handleConnect);
      socket.on('reconnect', handleReconnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('club-join-request', handleJoinRequest);
      socket.on('club-membership-updated', handleMembershipUpdated);
      socket.on('club-member-role-updated', handleMemberRoleUpdated);
      socket.on('club-member-removed', handleMemberRemoved);
      socket.on('membership-status-changed', handleMembershipStatusChanged);
      socket.on('user-role-updated', handleUserRoleUpdated);
      socket.on('club-home-content-updated', handleHomeContentUpdated);

      return () => {
        // Remove event listeners to prevent duplicates
        socket.off('connect', handleConnect);
        socket.off('reconnect', handleReconnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('club-join-request', handleJoinRequest);
        socket.off('club-membership-updated', handleMembershipUpdated);
        socket.off('club-member-role-updated', handleMemberRoleUpdated);
        socket.off('club-member-removed', handleMemberRemoved);
        socket.off('membership-status-changed', handleMembershipStatusChanged);
        socket.off('user-role-updated', handleUserRoleUpdated);
        socket.off('club-home-content-updated', handleHomeContentUpdated);
        
        if (socket && socket.connected && clubId) {
          socket.emit('leave-club', clubId);
          console.log(`📤 Left club room: club-${clubId}`);
        }
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [clubId, onJoinRequest, onMembershipUpdated, onMemberRoleUpdated, onMemberRemoved, onMembershipStatusChanged, onUserRoleUpdated, onHomeContentUpdated]);

  return { isConnected };
};

