export interface Assignment {
  id: number;
  clubId: number;
  title: string;
  description?: string;
  maxScore?: number;
  availableDate: Date;
  dueDate: Date;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentSubmission {
  id: number;
  assignmentId: number;
  userId: number;
  submissionType: 'text' | 'file';
  textContent?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  score?: number;
  comment?: string;
  gradedBy?: number;
  gradedAt?: Date;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssignmentRequest {
  title: string;
  description?: string;
  maxScore?: number;
  availableDate: string; // ISO 8601 date string
  dueDate: string; // ISO 8601 date string
}

export interface UpdateAssignmentRequest {
  title?: string;
  description?: string;
  maxScore?: number;
  availableDate?: string;
  dueDate?: string;
}

export interface SubmitAssignmentRequest {
  submissionType: 'text' | 'file';
  textContent?: string;
}

export interface GradeSubmissionRequest {
  score?: number;
  comment?: string;
}

export interface CategorizedAssignments {
  current: Assignment[];
  upcoming: Assignment[];
  overdue: Assignment[];
  past: Assignment[];
}

