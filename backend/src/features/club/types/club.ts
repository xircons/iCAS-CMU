export interface Club {
  id: number;
  name: string;
  description?: string;
  category?: string;
  presidentId?: number;
  presidentName?: string;
  meetingDay?: string;
  location?: string;
  logo?: string;
  status: 'active' | 'pending' | 'inactive';
  memberCount?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ClubMembership {
  id: number;
  userId: number;
  clubId: number;
  status: 'pending' | 'approved' | 'rejected' | 'left';
  role: 'member' | 'staff' | 'leader';
  requestDate: Date;
  approvedDate?: Date;
  approvedBy?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ClubMembershipWithDetails extends ClubMembership {
  clubName?: string;
  userName?: string;
  userEmail?: string;
}

export interface CreateClubRequest {
  name: string;
  description?: string;
  category?: string;
  meetingDay?: string;
  location?: string;
  status?: 'active' | 'pending' | 'inactive';
}

export interface JoinClubRequest {
  clubId: number;
}

export interface UpdateMembershipStatusRequest {
  status: 'approved' | 'rejected';
}

