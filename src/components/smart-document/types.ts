export type DocumentStatus = 'Open' | 'In Progress' | 'Completed';

export type Priority = 'Low' | 'Medium' | 'High';

export type DocumentType = 'Report' | 'Checklist' | 'Request Form' | 'Contract' | 'Letter' | 'Other';

export interface AssignedMember {
  userId: number;
  firstName: string;
  lastName: string;
  avatar?: string;
  role?: 'member' | 'leader';
  submissionStatus?: 'Not Submitted' | 'Submitted' | 'Approved' | 'Needs Revision';
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  submittedAt?: string;
  adminComment?: string;
}

export interface SmartDocument {
  id: number;
  title: string;
  description: string;
  clubId: number;
  clubName: string;
  priority: Priority;
  type: DocumentType;
  dueDate: string; // ISO date string
  status: DocumentStatus;
  templatePath?: string; // Path to template file
  assignedMemberIds: number[];
  assignedMembers: AssignedMember[];
  createdAt: string;
  updatedAt: string;
  createdBy: number; // userId
  isOverdue: boolean; // computed
}

export interface CreateDocumentFormData {
  title: string;
  description: string;
  clubId: number;
  priority: Priority;
  type: DocumentType;
  dueDate: string;
  assignedMemberIds: number[];
  templatePath?: string;
}

export interface DocumentTemplate {
  id?: number;
  name: string;
  description?: string;
  category?: 'Report' | 'Form' | 'Contract' | 'Letter' | 'Checklist' | 'Other';
  filePath: string;
  path?: string; // Legacy field, maps to filePath
  clubId?: number;
  clubName?: string;
  createdBy?: number;
  creatorFirstName?: string;
  creatorLastName?: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  isPublic?: boolean;
}

export type KanbanColumn = 'Open' | 'In Progress' | 'Completed';
