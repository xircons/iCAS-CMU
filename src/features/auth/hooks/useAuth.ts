import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useUser } from '../../../App';
import type { User } from '../../../App';
import { toast } from 'sonner';

const TOKEN_KEY = 'auth_token';
const REMEMBER_ME_KEY = 'remember_me';

export const getToken = (): string | null => {
  // Check localStorage first (remember me)
  const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
  if (rememberMe) {
    return localStorage.getItem(TOKEN_KEY);
  }
  // Otherwise check sessionStorage
  return sessionStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string, rememberMe: boolean): void => {
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_ME_KEY, 'true');
    // Clear from sessionStorage if it exists
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(REMEMBER_ME_KEY);
    // Clear from localStorage if it exists
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_ME_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
};

export const useAuth = () => {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const signup = async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    confirmPassword: string,
    phoneNumber: string | undefined,
    major: string,
    rememberMe: boolean = false
  ) => {
    setIsLoading(true);
    try {
      const response = await authApi.signup({
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
        phoneNumber,
        major,
      });
      setToken(response.token, rememberMe);
      setUser({
        id: String(response.user.id),
        email: response.user.email,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        phoneNumber: response.user.phoneNumber,
        major: response.user.major,
        role: response.user.role,
        clubId: response.user.clubId ? String(response.user.clubId) : undefined,
        clubName: response.user.clubName,
        avatar: response.user.avatar,
      });
      toast.success('สมัครสมาชิกสำเร็จ');
      
      // Navigate based on role
      const defaultPath = response.user.role === 'admin' ? '/create-clubs' : '/dashboard';
      navigate(defaultPath);
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองอีกครั้ง';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    setIsLoading(true);
    try {
      const response = await authApi.login({ email, password });
      setToken(response.token, rememberMe);
      setUser({
        id: String(response.user.id),
        email: response.user.email,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        phoneNumber: response.user.phoneNumber,
        major: response.user.major,
        role: response.user.role,
        clubId: response.user.clubId ? String(response.user.clubId) : undefined,
        clubName: response.user.clubName,
        avatar: response.user.avatar,
      });
      toast.success('เข้าสู่ระบบสำเร็จ');
      
      // Navigate based on role
      const defaultPath = response.user.role === 'admin' ? '/create-clubs' : '/dashboard';
      navigate(defaultPath);
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
    navigate('/login');
    toast.success('ออกจากระบบแล้ว');
  };

  const verifyToken = async (): Promise<boolean> => {
    const token = getToken();
    if (!token) {
      return false;
    }

    try {
      const response = await authApi.verify(token);
      setUser({
        id: String(response.user.id),
        email: response.user.email,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        phoneNumber: response.user.phoneNumber,
        major: response.user.major,
        role: response.user.role,
        clubId: response.user.clubId ? String(response.user.clubId) : undefined,
        clubName: response.user.clubName,
        avatar: response.user.avatar,
      });
      return true;
    } catch (error) {
      clearToken();
      return false;
    }
  };

  return {
    user,
    isLoading,
    signup,
    login,
    logout,
    verifyToken,
  };
};

