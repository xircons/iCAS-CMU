export interface SmartDocument {
  id: number;
  clubId: number;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  type: 'Report' | 'Checklist' | 'Request Form' | 'Contract' | 'Letter' | 'Other';
  dueDate: string; // Date string in YYYY-MM-DD format
  status: 'Open' | 'In Progress' | 'Completed';
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  templatePath?: string; // Path to template file from backend/documents
  // Populated fields
  clubName?: string;
  creatorFirstName?: string;
  creatorLastName?: string;
  assignedMembers?: DocumentAssignment[];
  isOverdue?: boolean; // Computed field
}

export interface DocumentAssignment {
  id: number;
  documentId: number;
  userId: number;
  status: 'Open' | 'In Progress' | 'Completed';
  submissionStatus: 'Not Submitted' | 'Submitted' | 'Approved' | 'Needs Revision';
  createdAt: Date;
  updatedAt: Date;
  // File upload fields
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  submittedAt?: Date;
  adminComment?: string;
  // Populated fields
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  userAvatar?: string;
  userRole?: string;
}

export interface CreateDocumentRequest {
  title: string;
  description: string;
  clubId: number;
  priority: 'Low' | 'Medium' | 'High';
  type: 'Report' | 'Checklist' | 'Request Form' | 'Contract' | 'Letter' | 'Other';
  dueDate: string; // YYYY-MM-DD format
  assignedMemberIds: number[];
  templatePath?: string; // Optional template path from backend/documents
}

export interface UpdateDocumentRequest {
  title?: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
  type?: 'Report' | 'Checklist' | 'Request Form' | 'Contract' | 'Letter' | 'Other';
  dueDate?: string;
  status?: 'Open' | 'In Progress' | 'Completed';
  assignedMemberIds?: number[];
}

export interface UpdateDocumentStatusRequest {
  status: 'Open' | 'In Progress' | 'Completed';
}

export interface UpdateMemberSubmissionStatusRequest {
  userId: number;
  submissionStatus: 'Not Submitted' | 'Submitted' | 'Approved' | 'Needs Revision';
}

export interface ReviewSubmissionRequest {
  userId: number;
  submissionStatus: 'Approved' | 'Needs Revision';
  comment?: string;
}

export interface BulkUpdateStatusRequest {
  documentIds: number[];
  status: 'Open' | 'In Progress' | 'Completed';
}

export interface BulkAssignRequest {
  documentIds: number[];
  memberIds: number[];
}

export interface BulkDeleteRequest {
  documentIds: number[];
}

export interface BulkExportRequest {
  documentIds: number[];
  format?: 'json' | 'csv';
}

