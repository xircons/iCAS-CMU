export interface Assignment {
  id: number;
  clubId: number;
  title: string;
  description?: string;
  maxScore?: number;
  availableDate: Date;
  dueDate: Date;
  attachmentPath?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
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
  attachmentPath?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
}

export interface UpdateAssignmentRequest {
  title?: string;
  description?: string;
  maxScore?: number;
  availableDate?: string;
  dueDate?: string;
  attachmentPath?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  removeAttachment?: boolean;
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

export interface AssignmentComment {
  id: number;
  assignmentId: number;
  userId: number;
  commentText: string;
  parentCommentId?: number;
  createdAt: Date;
  updatedAt: Date;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  replies?: AssignmentComment[];
}

export interface CreateCommentRequest {
  commentText: string;
  parentCommentId?: number;
}

export interface UpdateCommentRequest {
  commentText: string;
}

