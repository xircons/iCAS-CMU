export type UserRole = 'member' | 'leader' | 'admin';

export interface User {
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
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DatabaseUser {
  id: number;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  major: string;
  role: UserRole;
  club_id: number | null;
  club_name: string | null;
  avatar: string | null;
  created_at: Date;
  updated_at: Date;
}

