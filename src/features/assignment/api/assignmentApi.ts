import api from '../../../config/api';

function toPositiveIntId(value: unknown): number | null {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= 1 ? n : null;
}

export interface AssignmentAttachment {
  id: number;
  assignmentId: number;
  filePath: string;
  fileName: string;
  fileMimeType?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: number;
  publicId: string;
  clubId: number;
  title: string;
  description?: string;
  maxScore?: number;
  availableDate: string;
  dueDate: string;
  isVisible?: boolean;
  // Legacy fields for backward compatibility
  attachmentPath?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  // New multiple attachments support
  attachments?: AssignmentAttachment[];
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
  isVisible?: boolean;
}

export interface GradeSubmissionRequest {
  score?: number;
  comment?: string;
}

export const assignmentApi = {
  // Get all assignments for a club (categorized)
  getClubAssignments: async (clubId: string): Promise<CategorizedAssignments> => {
    const response = await api.get(`/clubs/${clubId}/assignments`);
    return response.data.assignments;
  },

  // Get a single assignment
  getAssignment: async (clubId: string, assignmentId: string, cacheBust?: boolean): Promise<Assignment> => {
    const url = `/clubs/${clubId}/assignments/${assignmentId}`;
    const finalUrl = cacheBust ? `${url}?t=${Date.now()}` : url;
    const response = await api.get(finalUrl);
    const a = response.data.assignment as Assignment;
    return {
      ...a,
      attachments: Array.isArray(a.attachments) ? a.attachments : [],
    };
  },

  // Create a new assignment (leader only)
  createAssignment: async (clubId: string, data: CreateAssignmentRequest, attachmentFiles?: File[]): Promise<Assignment> => {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.maxScore !== undefined) formData.append('maxScore', data.maxScore.toString());
    formData.append('availableDate', data.availableDate);
    formData.append('dueDate', data.dueDate);
    if (attachmentFiles && attachmentFiles.length > 0) {
      attachmentFiles.forEach(file => {
        formData.append('attachments', file);
      });
    }

    // Don't set Content-Type header - let axios set it automatically with the correct boundary
    const response = await api.post(`/clubs/${clubId}/assignments`, formData);
    return response.data.assignment;
  },

  // Update an assignment (leader only)
  updateAssignment: async (
    clubId: string,
    assignmentId: string,
    data: UpdateAssignmentRequest,
    attachmentFiles?: File[] | null
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
      if (data.isVisible !== undefined && data.isVisible !== null) {
        formData.append('isVisible', data.isVisible.toString());
      }
      if (attachmentFiles && attachmentFiles.length > 0) {
        attachmentFiles.forEach(file => {
          formData.append('attachments', file);
        });
      }
    
    console.log('FormData entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File: ${value.name}` : value);
    }

    // Don't set Content-Type header - let axios set it automatically with the correct boundary
    console.log('updateAssignment - About to send PUT request to:', `/clubs/${clubId}/assignments/${assignmentId}`);
    console.log('updateAssignment - FormData has', Array.from(formData.entries()).length, 'entries');
    
    try {
      const response = await api.put(`/clubs/${clubId}/assignments/${assignmentId}`, formData);
      console.log('updateAssignment - PUT request completed successfully');
      console.log('updateAssignment API response:', {
      success: response.data.success,
      message: response.data.message,
      assignment: response.data.assignment,
      assignmentAttachments: response.data.assignment?.attachments,
      assignmentAttachmentsCount: response.data.assignment?.attachments?.length || 0
    });
    return response.data.assignment;
    } catch (error: any) {
      console.error('updateAssignment - PUT request failed:', error);
      console.error('updateAssignment - Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  // Delete a single attachment (leader only)
  deleteAttachment: async (
    clubId: string,
    assignmentId: string,
    attachmentId: number
  ): Promise<void> => {
    await api.delete(`/clubs/${clubId}/assignments/${assignmentId}/attachments/${attachmentId}`);
  },

  // Delete an assignment (leader only)
  deleteAssignment: async (clubId: string, assignmentId: string): Promise<void> => {
    await api.delete(`/clubs/${clubId}/assignments/${assignmentId}`);
  },

  // Submit an assignment (text)
  submitAssignmentText: async (
    clubId: string,
    assignmentId: string,
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
    clubId: string,
    assignmentId: string,
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
  getUserSubmission: async (clubId: string, assignmentId: string): Promise<AssignmentSubmission | null> => {
    const response = await api.get(`/clubs/${clubId}/assignments/${assignmentId}/submission`);
    return response.data.submission;
  },

  // Get all submissions for an assignment (leader only)
  getAssignmentSubmissions: async (clubId: string, assignmentId: string): Promise<AssignmentSubmission[]> => {
    const response = await api.get(`/clubs/${clubId}/assignments/${assignmentId}/submissions`);
    return response.data.submissions;
  },

  // Get a specific submission (leader only)
  getSubmission: async (
    clubId: string,
    assignmentId: string,
    submissionId: number
  ): Promise<AssignmentSubmission> => {
    const response = await api.get(
      `/clubs/${clubId}/assignments/${assignmentId}/submissions/${submissionId}`
    );
    return response.data.submission;
  },

  // Grade a submission (leader only)
  gradeSubmission: async (
    clubId: string,
    assignmentId: string,
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
    // Backend serves uploads at /uploads route
    // Get base URL - use same logic as api.ts
    let baseUrl: string;
    
    if (typeof window !== 'undefined') {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl) {
        // If VITE_API_URL is set (e.g., "http://localhost:5001/api"), remove "/api"
        baseUrl = apiUrl.replace('/api', '').replace(/\/$/, '');
      } else {
        // Infer from window location (same as api.ts)
        const origin = window.location.origin;
        if (origin.includes('localhost:3000') || origin.includes('127.0.0.1:3000')) {
          baseUrl = 'http://localhost:5001';
        } else {
          baseUrl = origin;
        }
      }
    } else {
      baseUrl = 'http://localhost:5001';
    }
    
    // Normalize filePath - remove leading slashes
    let normalizedPath = filePath.replace(/^\/+/, '');
    
    // filePath from database is already "uploads/assignments/..."
    // So we can use it directly
    const fullUrl = `${baseUrl}/${normalizedPath}`;
    
    // Debug logging (can be removed in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('getFileUrl:', { 
        filePath, 
        normalizedPath, 
        fullUrl, 
        baseUrl,
        windowOrigin: typeof window !== 'undefined' ? window.location.origin : 'N/A'
      });
    }
    
    return fullUrl;
  },

  // Comment methods
  getAssignmentComments: async (clubId: string, assignmentId: string): Promise<AssignmentComment[]> => {
    const response = await api.get(`/clubs/${clubId}/assignments/${assignmentId}/comments`);
    return response.data.comments;
  },

  createComment: async (
    clubId: string,
    assignmentId: string,
    commentText: string,
    parentCommentId?: number
  ): Promise<AssignmentComment> => {
    const payload: { commentText: string; parentCommentId?: number } = { commentText };
    const pid =
      parentCommentId == null ? null : toPositiveIntId(parentCommentId);
    if (pid != null) payload.parentCommentId = pid;
    const response = await api.post(`/clubs/${clubId}/assignments/${assignmentId}/comments`, payload);
    return response.data.comment;
  },

  updateComment: async (
    clubId: string,
    assignmentId: string,
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
    clubId: string,
    assignmentId: string,
    commentId: number
  ): Promise<void> => {
    await api.delete(`/clubs/${clubId}/assignments/${assignmentId}/comments/${commentId}`);
  },

  hideComment: async (
    clubId: string,
    assignmentId: string,
    commentId: number,
    isHidden: boolean
  ): Promise<AssignmentComment> => {
    const response = await api.patch(
      `/clubs/${clubId}/assignments/${assignmentId}/comments/${commentId}/visibility`,
      { isHidden }
    );
    return response.data.comment;
  },
};

export interface AssignmentComment {
  id: number;
  assignmentId: number;
  userId: number;
  commentText: string;
  parentCommentId?: number;
  isHidden?: boolean;
  createdAt: string;
  updatedAt: string;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  replies?: AssignmentComment[];
}

