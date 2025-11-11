import api from '../../../config/api';

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
  createdAt: string;
}

export interface ClubMembership {
  id: number;
  clubId: number;
  clubName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'left';
  role?: 'member' | 'staff' | 'leader';
  requestDate: string;
  approvedDate?: string;
  approvedBy?: number;
  createdAt: string;
}

export interface JoinClubRequest {
  clubId: number;
}

export interface UpdateMembershipStatusRequest {
  status: 'approved' | 'rejected';
}

export const clubApi = {
  // Get all clubs
  getAllClubs: async (): Promise<Club[]> => {
    const response = await api.get('/clubs');
    return response.data.clubs;
  },

  // Get club by ID
  getClubById: async (id: number): Promise<Club> => {
    const response = await api.get(`/clubs/${id}`);
    return response.data.club;
  },

  // Get user's club memberships
  getUserMemberships: async (): Promise<ClubMembership[]> => {
    const response = await api.get('/clubs/memberships/me');
    return response.data.memberships;
  },

  // Request to join a club
  joinClub: async (request: JoinClubRequest): Promise<ClubMembership> => {
    const response = await api.post('/clubs/join', request);
    return response.data.membership;
  },

  // Get join requests for a club (leader/admin only)
  getClubJoinRequests: async (clubId: number): Promise<any[]> => {
    const response = await api.get(`/clubs/${clubId}/requests`);
    return response.data.requests;
  },

  // Approve or reject a membership request (leader/admin only)
  updateMembershipStatus: async (
    membershipId: number,
    request: UpdateMembershipStatusRequest
  ): Promise<ClubMembership> => {
    const response = await api.patch(`/clubs/memberships/${membershipId}/status`, request);
    return response.data.membership;
  },

  // Get leader's clubs
  getLeaderClubs: async (): Promise<Club[]> => {
    const response = await api.get('/clubs/leader/my-clubs');
    return response.data.clubs;
  },

  // Get club members (leader/admin only)
  getClubMembers: async (clubId: number): Promise<any[]> => {
    const response = await api.get(`/clubs/${clubId}/members`);
    return response.data.members;
  },

  // Update member role (leader/admin only)
  updateMemberRole: async (
    membershipId: number,
    role: 'member' | 'staff' | 'leader'
  ): Promise<ClubMembership> => {
    const response = await api.patch(`/clubs/memberships/${membershipId}/role`, { role });
    return response.data.membership;
  },

  // Remove member (leader/admin only)
  removeMember: async (membershipId: number): Promise<void> => {
    await api.delete(`/clubs/memberships/${membershipId}`);
  },

  // Get club membership statistics (leader/admin only)
  getClubMembershipStats: async (clubId: number): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    activeMembers: number;
  }> => {
    const response = await api.get(`/clubs/${clubId}/stats`);
    return response.data.stats;
  },
};

