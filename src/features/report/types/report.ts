export type ReportType = 'feedback' | 'issue' | 'suggestion' | 'complaint' | 'question' | 'appreciation';
export type ReportStatus = 'new' | 'in-review' | 'resolved';

export interface Report {
  id: number;
  type: ReportType;
  targetClubId?: number | null;
  subject: string;
  message: string;
  senderId: number;
  sender?: {
    name: string;
    email: string;
    club?: string;
  };
  status: ReportStatus;
  assignedTo?: string;
  response?: string;
  responseDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportRequest {
  type: ReportType;
  subject: string;
  message: string;
  targetClubPublicId?: string;
}

export interface UpdateReportStatusRequest {
  status: ReportStatus;
  assignedTo?: string;
}

export interface UpdateReportResponseRequest {
  response: string;
}

export interface ReportStats {
  total: number;
  byType: Record<ReportType, number>;
  byStatus: Record<ReportStatus, number>;
  recentReports: Report[];
}

