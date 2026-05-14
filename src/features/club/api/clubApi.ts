import api from '../../../config/api';

export interface Club {
  id: number;
  publicId: string;
  name: string;
  description?: string;
  category?: string;
  presidentId?: number;
  presidentName?: string;
  presidentEmail?: string;
  /** Approved membership leaders excluding president */
  coLeaderNames?: string;
  meetingDay?: string;
  location?: string;
  logo?: string;
  status: 'active' | 'pending' | 'inactive';
  memberCount?: number;
  homeContent?: string;
  homeTitle?: string;
  createdAt: string;
}

export interface ClubMembership {
  id: number;
  clubId: number;
  clubPublicId?: string;
  clubName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'left';
  role?: 'member' | 'staff' | 'leader';
  requestDate: string;
  approvedDate?: string;
  approvedBy?: number;
  createdAt: string;
}

export interface JoinClubRequest {
  clubPublicId: string;
}

export interface UpdateMembershipStatusRequest {
  status: 'approved' | 'rejected';
}

export interface CreateClubBody {
  name: string;
  description?: string;
  category?: string;
  meetingDay?: string;
  location?: string;
  status?: 'active' | 'pending' | 'inactive';
  logo?: File;
}

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
    if (apiUrl) {
      return apiUrl.replace('/api', '').replace(/\/$/, '');
    }
    const origin = window.location.origin;
    if (origin.includes('localhost:3000') || origin.includes('127.0.0.1:3000')) {
      return 'http://localhost:5001';
    }
    return origin;
  }
  return 'http://localhost:5001';
};

export const clubApi = {
  // Get all clubs
  getAllClubs: async (): Promise<Club[]> => {
    const response = await api.get('/clubs');
    return response.data.clubs;
  },

  createClub: async (body: CreateClubBody): Promise<Club> => {
    const formData = new FormData();
    formData.append('name', body.name);
    if (body.description) formData.append('description', body.description);
    if (body.category) formData.append('category', body.category);
    if (body.meetingDay) formData.append('meetingDay', body.meetingDay);
    if (body.location) formData.append('location', body.location);
    if (body.status) formData.append('status', body.status);
    if (body.logo) formData.append('logo', body.logo);

    const response = await api.post('/clubs', formData);
    return response.data.club;
  },

  getLogoUrl: (logoPath?: string): string | undefined => {
    if (!logoPath) return undefined;
    const normalizedPath = logoPath.replace(/^\/+/, '');
    if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;
    return `${getApiBaseUrl()}/${normalizedPath}`;
  },

  // Get club by ID
  getClubById: async (publicId: string | number): Promise<Club> => {
    const response = await api.get(`/clubs/${publicId}`);
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
  getClubJoinRequests: async (clubPublicId: string | number): Promise<any[]> => {
    const response = await api.get(`/clubs/${clubPublicId}/requests`);
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
  getClubMembers: async (clubPublicId: string | number): Promise<any[]> => {
    const response = await api.get(`/clubs/${clubPublicId}/members`);
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
  getClubMembershipStats: async (clubPublicId: string | number): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    activeMembers: number;
  }> => {
    const response = await api.get(`/clubs/${clubPublicId}/stats`);
    return response.data.stats;
  },

  // Update club home content (leader/admin only)
  updateClubHomeContent: async (clubPublicId: string | number, content: string, title?: string): Promise<Club> => {
    const response = await api.patch(`/clubs/${clubPublicId}/home-content`, { content, title });
    return response.data.club;
  },

  patchClubPresident: async (
    clubPublicId: string | number,
    presidentUserId: number | null
  ): Promise<Pick<Club, 'id' | 'publicId' | 'name' | 'presidentId' | 'presidentName' | 'presidentEmail' | 'status'>> => {
    const response = await api.patch(`/clubs/${clubPublicId}/president`, { presidentUserId });
    return response.data.club as Pick<
      Club,
      'id' | 'publicId' | 'name' | 'presidentId' | 'presidentName' | 'presidentEmail' | 'status'
    >;
  },

  patchClubLifecycleStatus: async (
    clubPublicId: string | number,
    status: Club['status']
  ): Promise<void> => {
    await api.patch(`/clubs/${clubPublicId}/status`, { status });
  },

  deleteClub: async (clubPublicId: string | number): Promise<void> => {
    await api.delete(`/clubs/${clubPublicId}`);
  },

  getPresidentAuditEntries: async (clubPublicId: string): Promise<
    {
      id: string;
      clubId: string;
      clubName: string;
      previousOwner?: string;
      newOwner: string;
      changedBy: string;
      date: string;
    }[]
  > => {
    const r = await api.get<{ success: boolean; entries: any[] }>(`/clubs/${clubPublicId}/president-audit`);
    return Array.isArray(r.data.entries) ? r.data.entries : [];
  },
};

