import api from '../../../config/api';

export interface AdminUserSummary {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  major: string;
  isSuspended: boolean;
}

export interface OversightLeader {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  isSuspended: boolean;
  clubPublicId: string;
  clubName: string;
  memberCount: number;
  relation: string;
  activityNote?: string;
}

export interface OversightMember {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  appRole: string;
  membershipRole: string;
  isSuspended: boolean;
  clubPublicId: string;
  clubName: string;
  joinedAt?: string;
}

export interface RecentSmartDocument {
  id: number;
  clubIdNum: number;
  clubName: string;
  title: string;
  type: string;
  status: string;
  updatedAt: string;
  submittedByName: string;
}

export const adminApi = {
  listUsers: async (params?: { search?: string; role?: string; limit?: number; offset?: number }): Promise<AdminUserSummary[]> => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set('search', params.search);
    if (params?.role) sp.set('role', params.role);
    if (params?.limit != null) sp.set('limit', String(params.limit));
    if (params?.offset != null) sp.set('offset', String(params.offset));
    const q = sp.toString();
    const r = await api.get<{ success: boolean; users: AdminUserSummary[] }>(
      `/admin/users${q ? `?${q}` : ''}`
    );
    return r.data.users;
  },

  patchUserSuspension: async (
    userId: number,
    suspended: boolean
  ): Promise<void> => {
    await api.patch(`/admin/users/${userId}/suspension`, { suspended });
  },

  getOversight: async (): Promise<{ leaders: OversightLeader[]; members: OversightMember[] }> => {
    const r = await api.get<{
      success: boolean;
      leaders: OversightLeader[];
      members: OversightMember[];
    }>('/admin/oversight');
    return { leaders: r.data.leaders, members: r.data.members };
  },

  getRecentSmartDocuments: async (limit = 10): Promise<RecentSmartDocument[]> => {
    const r = await api.get<{ success: boolean; documents: RecentSmartDocument[] }>(
      `/admin/smart-documents/recent?limit=${limit}`
    );
    return r.data.documents;
  },
};
