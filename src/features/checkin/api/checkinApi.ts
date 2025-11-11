import api from '../../../config/api';

export interface CheckInSessionResponse {
  success: boolean;
  data: {
    passcode: string;
    qrCodeData: string;
    expiresAt: string;
  };
}

export interface CheckInResponse {
  success: boolean;
  message: string;
}

export interface CheckedInMember {
  userId: number;
  firstName: string;
  lastName: string;
  checkInTime: string;
  method: 'qr' | 'passcode';
}

export interface CheckInSessionInfo {
  passcode: string;
  qrCodeData: string;
  expiresAt: string;
  isActive: boolean;
}

export interface CheckInSessionInfoResponse {
  success: boolean;
  data: CheckInSessionInfo | null;
}

export interface CheckedInMembersResponse {
  success: boolean;
  data: {
    members: CheckedInMember[];
  };
}

export const checkinApi = {
  /**
   * Start a check-in session (leader/admin only)
   */
  startCheckInSession: async (eventId: number): Promise<CheckInSessionResponse> => {
    try {
      const response = await api.post<CheckInSessionResponse>(`/checkin/session/${eventId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please wait a moment before creating another session.');
      }
      throw error;
    }
  },

  /**
   * Check in via QR code (member only)
   * Event ID is optional - backend will find the event by QR code data
   */
  checkInViaQR: async (eventId: number | undefined, qrCodeData: string): Promise<CheckInResponse> => {
    try {
      const response = await api.post<CheckInResponse>('/checkin/qr', {
        eventId,
        qrCodeData,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('Too many scan attempts. Please wait a moment.');
      }
      if (error.response?.status === 409) {
        throw new Error('You have already checked in for this event.');
      }
      if (error.response?.status === 404) {
        throw new Error('Expired QR code. Please ask the leader for a new QR code.');
      }
      if (error.response?.status === 400) {
        // Check if it's an expired session error
        const errorMessage = error.response?.data?.message || error.message || '';
        if (errorMessage.includes('expired') || errorMessage.includes('No active') || errorMessage.includes('Invalid QR code')) {
          throw new Error('Expired QR code. Please ask the leader for a new QR code.');
        }
        throw new Error(errorMessage || 'Invalid QR code. Please try again.');
      }
      throw error;
    }
  },

  /**
   * Check in via passcode (member only)
   * Event ID is optional - backend will find the event by passcode
   */
  checkInViaPasscode: async (eventId: number | undefined, passcode: string): Promise<CheckInResponse> => {
    try {
      const response = await api.post<CheckInResponse>('/checkin/passcode', {
        eventId,
        passcode,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('Too many passcode attempts. Please wait a moment before trying again.');
      }
      if (error.response?.status === 409) {
        throw new Error('You have already checked in for this event.');
      }
      if (error.response?.status === 400) {
        throw new Error('Invalid or expired passcode.');
      }
      throw error;
    }
  },

  /**
   * Get active check-in session for an event (leader/admin only)
   */
  getCheckInSession: async (eventId: number): Promise<CheckInSessionInfoResponse> => {
    try {
      const response = await api.get<CheckInSessionInfoResponse>(`/checkin/session/${eventId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please wait a moment.');
      }
      throw error;
    }
  },

  /**
   * Get checked-in members for an event (leader/admin only)
   */
  getCheckedInMembers: async (eventId: number): Promise<CheckedInMembersResponse> => {
    try {
      const response = await api.get<CheckedInMembersResponse>(`/checkin/${eventId}/members`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please wait a moment.');
      }
      throw error;
    }
  },

  /**
   * End check-in session (leader/admin only)
   */
  endCheckInSession: async (eventId: number): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.delete<{ success: boolean; message: string }>(
        `/checkin/session/${eventId}`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please wait a moment.');
      }
      throw error;
    }
  },
};

