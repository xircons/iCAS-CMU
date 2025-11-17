import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useUser } from '../../../App';
import type { User } from '../../../App';
import { toast } from 'sonner';

export const useAuth = () => {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const requestOTP = async (email: string): Promise<void> => {
    setIsLoading(true);
    try {
      await authApi.requestOTP(email);
      toast.success('OTP ส่งไปที่อีเมลของคุณแล้ว');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.response?.data?.message || 'ไม่สามารถส่ง OTP ได้ กรุณาลองอีกครั้ง';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    confirmPassword: string,
    phoneNumber: string | undefined,
    major: string,
    otp: string
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
        otp,
      });
      // Cookies are set automatically by the backend
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
        memberships: response.user.memberships || [],
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

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.login({ email, password });
      // Cookies are set automatically by the backend
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
        memberships: response.user.memberships || [],
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

  const logout = async () => {
    try {
      await authApi.logout();
      // Cookies are cleared automatically by the backend
      setUser(null);
      navigate('/login');
      toast.success('ออกจากระบบแล้ว');
    } catch (error: any) {
      // Even if logout API fails, clear local state
      setUser(null);
      navigate('/login');
      toast.success('ออกจากระบบแล้ว');
    }
  };

  const verifyToken = async (): Promise<boolean> => {
    try {
      const response = await authApi.getMe();
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
        memberships: response.user.memberships || [],
      });
      return true;
    } catch (error) {
      setUser(null);
      return false;
    }
  };

  return {
    user,
    isLoading,
    requestOTP,
    signup,
    login,
    logout,
    verifyToken,
  };
};
