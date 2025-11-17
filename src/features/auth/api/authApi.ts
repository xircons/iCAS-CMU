import api from '../../../config/api';
import type { SignupRequest, SignupResponse, LoginRequest, LoginResponse, VerifyResponse, LogoutResponse, RefreshResponse } from '../types/auth';

export const authApi = {
  requestOTP: async (email: string): Promise<{ success: boolean; message: string }> => {
    // Use longer timeout for OTP request (email sending can take time)
    const response = await api.post<{ success: boolean; message: string }>('/auth/request-otp', { email }, {
      timeout: 15000, // 15 seconds for email sending
    });
    return response.data;
  },

  signup: async (data: SignupRequest): Promise<SignupResponse> => {
    const response = await api.post<SignupResponse>('/auth/signup', data);
    return response.data;
  },

  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  verify: async (): Promise<VerifyResponse> => {
    // Cookies are sent automatically with withCredentials: true
    const response = await api.post<VerifyResponse>('/auth/verify', {});
    return response.data;
  },

  getMe: async (): Promise<VerifyResponse> => {
    const response = await api.get<VerifyResponse>('/auth/me');
    return response.data;
  },

  logout: async (): Promise<LogoutResponse> => {
    const response = await api.post<LogoutResponse>('/auth/logout', {});
    return response.data;
  },

  refresh: async (): Promise<RefreshResponse> => {
    const response = await api.post<RefreshResponse>('/auth/refresh', {});
    return response.data;
  },
};

