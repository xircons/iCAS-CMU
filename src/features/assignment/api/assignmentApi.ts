import api from '../../../config/api';

export interface Assignment {
  id: number;
  clubId: number;
  title: string;
  description?: string;
  maxScore?: number;
  availableDate: string;
  dueDate: string;
  attachmentPath?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  createdBy: number;
  creatorFirstName?: string;
  creatorLastName?: string;
  submissionCount?: number;
  userSubmission?: AssignmentSubmission;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentSubmission {
  id: number;
  assignmentId: number;
  userId: number;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  submissionType: 'text' | 'file';
  textContent?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  score?: number;
  comment?: string;
  gradedBy?: number;
  graderFirstName?: string;
  graderLastName?: string;
  gradedAt?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategorizedAssignments {
  current: Assignment[];
  upcoming: Assignment[];
  overdue: Assignment[];
  past: Assignment[];
}

export interface CreateAssignmentRequest {
  title: string;
  description?: string;
  maxScore?: number;
  availableDate: string;
  dueDate: string;
}

export interface UpdateAssignmentRequest {
  title?: string;
  description?: string;
  maxScore?: number;
  availableDate?: string;
  dueDate?: string;
}

export interface GradeSubmissionRequest {
  score?: number;
  comment?: string;
}

export const assignmentApi = {
  // Get all assignments for a club (categorized)
  getClubAssignments: async (clubId: number): Promise<CategorizedAssignments> => {
    const response = await api.get(`/clubs/${clubId}/assignments`);
    return response.data.assignments;
  },

  // Get a single assignment
  getAssignment: async (clubId: number, assignmentId: number): Promise<Assignment> => {
    const response = await api.get(`/clubs/${clubId}/assignments/${assignmentId}`);
    return response.data.assignment;
  },

  // Create a new assignment (leader only)
  createAssignment: async (clubId: number, data: CreateAssignmentRequest, attachmentFile?: File): Promise<Assignment> => {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.maxScore !== undefined) formData.append('maxScore', data.maxScore.toString());
    formData.append('availableDate', data.availableDate);
    formData.append('dueDate', data.dueDate);
    if (attachmentFile) {
      formData.append('attachment', attachmentFile);
    }

    const response = await api.post(`/clubs/${clubId}/assignments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.assignment;
  },

  // Update an assignment (leader only)
  updateAssignment: async (
    clubId: number,
    assignmentId: number,
    data: UpdateAssignmentRequest,
    attachmentFile?: File | null,
    removeAttachment?: boolean
  ): Promise<Assignment> => {
    const formData = new FormData();
    // Always append fields that are defined (even if empty string for description)
    if (data.title !== undefined && data.title !== null) {
      formData.append('title', data.title);
    }
    if (data.description !== undefined && data.description !== null) {
      formData.append('description', data.description);
    }
    if (data.maxScore !== undefined && data.maxScore !== null) {
      formData.append('maxScore', data.maxScore.toString());
    }
    if (data.availableDate !== undefined && data.availableDate !== null && data.availableDate !== '') {
      formData.append('availableDate', data.availableDate);
    }
    if (data.dueDate !== undefined && data.dueDate !== null && data.dueDate !== '') {
      formData.append('dueDate', data.dueDate);
    }
    if (removeAttachment) {
      formData.append('removeAttachment', 'true');
    }
    if (attachmentFile) {
      formData.append('attachment', attachmentFile);
    }
    
    console.log('FormData entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File: ${value.name}` : value);
    }

    // Don't set Content-Type header - let axios set it automatically with the correct boundary
    const response = await api.put(`/clubs/${clubId}/assignments/${assignmentId}`, formData);
    return response.data.assignment;
  },

  // Delete an assignment (leader only)
  deleteAssignment: async (clubId: number, assignmentId: number): Promise<void> => {
    await api.delete(`/clubs/${clubId}/assignments/${assignmentId}`);
  },

  // Submit an assignment (text)
  submitAssignmentText: async (
    clubId: number,
    assignmentId: number,
    textContent: string
  ): Promise<AssignmentSubmission> => {
    const response = await api.post(`/clubs/${clubId}/assignments/${assignmentId}/submit`, {
      submissionType: 'text',
      textContent
    });
    return response.data.submission;
  },

  // Submit an assignment (file)
  submitAssignmentFile: async (
    clubId: number,
    assignmentId: number,
    file: File
  ): Promise<AssignmentSubmission> => {
    const formData = new FormData();
    formData.append('submissionType', 'file');
    formData.append('file', file);

    const response = await api.post(`/clubs/${clubId}/assignments/${assignmentId}/submit`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.submission;
  },

  // Get user's own submission
  getUserSubmission: async (clubId: number, assignmentId: number): Promise<AssignmentSubmission | null> => {
    const response = await api.get(`/clubs/${clubId}/assignments/${assignmentId}/submission`);
    return response.data.submission;
  },

  // Get all submissions for an assignment (leader only)
  getAssignmentSubmissions: async (clubId: number, assignmentId: number): Promise<AssignmentSubmission[]> => {
    const response = await api.get(`/clubs/${clubId}/assignments/${assignmentId}/submissions`);
    return response.data.submissions;
  },

  // Get a specific submission (leader only)
  getSubmission: async (
    clubId: number,
    assignmentId: number,
    submissionId: number
  ): Promise<AssignmentSubmission> => {
    const response = await api.get(
      `/clubs/${clubId}/assignments/${assignmentId}/submissions/${submissionId}`
    );
    return response.data.submission;
  },

  // Grade a submission (leader only)
  gradeSubmission: async (
    clubId: number,
    assignmentId: number,
    submissionId: number,
    data: GradeSubmissionRequest
  ): Promise<AssignmentSubmission> => {
    const response = await api.patch(
      `/clubs/${clubId}/assignments/${assignmentId}/submissions/${submissionId}/grade`,
      data
    );
    return response.data.submission;
  },

  // Get file URL for download
  getFileUrl: (filePath: string): string => {
    // Assuming backend serves uploads at /uploads route
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5002/api').replace('/api', '');
    return `${baseUrl}/${filePath}`;
  },

  // Comment methods
  getAssignmentComments: async (clubId: number, assignmentId: number): Promise<AssignmentComment[]> => {
    const response = await api.get(`/clubs/${clubId}/assignments/${assignmentId}/comments`);
    return response.data.comments;
  },

  createComment: async (
    clubId: number,
    assignmentId: number,
    commentText: string,
    parentCommentId?: number
  ): Promise<AssignmentComment> => {
    const response = await api.post(`/clubs/${clubId}/assignments/${assignmentId}/comments`, {
      commentText,
      parentCommentId,
    });
    return response.data.comment;
  },

  updateComment: async (
    clubId: number,
    assignmentId: number,
    commentId: number,
    commentText: string
  ): Promise<AssignmentComment> => {
    const response = await api.put(
      `/clubs/${clubId}/assignments/${assignmentId}/comments/${commentId}`,
      { commentText }
    );
    return response.data.comment;
  },

  deleteComment: async (
    clubId: number,
    assignmentId: number,
    commentId: number
  ): Promise<void> => {
    await api.delete(`/clubs/${clubId}/assignments/${assignmentId}/comments/${commentId}`);
  },
};

export interface AssignmentComment {
  id: number;
  assignmentId: number;
  userId: number;
  commentText: string;
  parentCommentId?: number;
  createdAt: string;
  updatedAt: string;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  replies?: AssignmentComment[];
}

