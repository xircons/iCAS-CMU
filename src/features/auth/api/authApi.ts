import api from '../../../config/api';
import type { SignupRequest, SignupResponse, LoginRequest, LoginResponse, VerifyResponse } from '../types/auth';

export const authApi = {
  signup: async (data: SignupRequest): Promise<SignupResponse> => {
    const response = await api.post<SignupResponse>('/auth/signup', data);
    return response.data;
  },

  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  verify: async (token: string): Promise<VerifyResponse> => {
    // Token is passed explicitly, but interceptor will also add it if in storage
    // We'll use a custom config to ensure the token is sent
    const response = await api.post<VerifyResponse>(
      '/auth/verify',
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  getMe: async (): Promise<VerifyResponse> => {
    const response = await api.get<VerifyResponse>('/auth/me');
    return response.data;
  },
};

