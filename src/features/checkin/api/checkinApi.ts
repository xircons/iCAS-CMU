import api from '../../../config/api';
import { axiosApiErrorPayload, toUserThaiMessage } from '../../../utils/apiErrorMessage';

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
        throw new Error('คุณได้ส่งคำขอเริ่มกิจกรรมหลายครั้ง กรุณารอสักครั้งก่อนลองใหม่');
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
        throw new Error('คุณได้ลองสแกน QR Code หลายครั้ง กรุณารอสักครั้งก่อนลองใหม่');
      }
      if (error.response?.status === 409) {
        throw new Error('คุณได้ลงชื่อเช็กอินกิจกรรมนี้แล้ว');
      }
      if (error.response?.status === 404) {
        throw new Error('QR Code หมดอายุ กรุณาขอ QR Code ใหม่จากหัวหน้าชมรม');
      }
      if (error.response?.status === 400) {
        const { message: errorMessage, code } = axiosApiErrorPayload(error);
        const resolved = toUserThaiMessage(
          errorMessage || (typeof error.message === 'string' ? error.message : undefined),
          code,
          'QR Code ไม่ถูกต้อง กรุณาลองใหม่',
        );
        throw new Error(resolved);
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
        throw new Error('คุณได้ลองกรอกรหัส Passcode หลายครั้ง กรุณารอสักครั้งก่อนลองใหม่');
      }
      if (error.response?.status === 409) {
        throw new Error('คุณได้ลงชื่อเช็กอินกิจกรรมนี้แล้ว');
      }
      if (error.response?.status === 400) {
        const { message: errorMessage, code } = axiosApiErrorPayload(error);
        const resolved = toUserThaiMessage(
          errorMessage || (typeof error.message === 'string' ? error.message : undefined),
          code,
          'รหัส Passcode ไม่ถูกต้องหรือหมดอายุ',
        );
        throw new Error(resolved);
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
        throw new Error('คุณได้ส่งคำขอเช็กอินกิจกรรมหลายครั้ง กรุณารอสักครั้งก่อนลองใหม่');
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
        throw new Error('คุณได้ส่งคำขอเช็กอินกิจกรรมหลายครั้ง กรุณารอสักครั้งก่อนลองใหม่');
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
        throw new Error('คุณได้ส่งคำขอจบกิจกรรมหลายครั้ง กรุณารอสักครั้งก่อนลองใหม่');
      }
      throw error;
    }
  },
};

