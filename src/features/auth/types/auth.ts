import type { UserRole } from '../../../App';
import type { ClubMembership } from '../../../App';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
  major: string;
}

export interface SignupResponse {
  success: boolean;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    major: string;
    role: UserRole;
    clubId?: number;
    clubName?: string;
    avatar?: string;
    memberships?: ClubMembership[];
  };
}

export interface LoginResponse {
  success: boolean;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    major: string;
    role: UserRole;
    clubId?: number;
    clubName?: string;
    avatar?: string;
    memberships?: ClubMembership[];
  };
}

export interface VerifyResponse {
  success: boolean;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    major: string;
    role: UserRole;
    clubId?: number;
    clubName?: string;
    avatar?: string;
    memberships?: ClubMembership[];
  };
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface RefreshResponse {
  success: boolean;
  message: string;
}

