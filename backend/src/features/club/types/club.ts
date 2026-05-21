export interface Club {
  id: number;
  publicId: string;
  name: string;
  description?: string;
  category?: string;
  presidentId?: number;
  presidentName?: string;
  presidentEmail?: string;
  /** Comma-separated display names for approved leaders excluding the club president */
  coLeaderNames?: string;
  meetingDay?: string;
  location?: string;
  logo?: string;
  status: 'active' | 'pending' | 'inactive';
  memberCount?: number;
  homeContent?: string;
  homeTitle?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ClubMembership {
  id: number;
  userId: number;
  clubId: number;
  clubPublicId?: string;
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
  clubPublicId: string;
}

export interface UpdateMembershipStatusRequest {
  status: 'approved' | 'rejected';
}

