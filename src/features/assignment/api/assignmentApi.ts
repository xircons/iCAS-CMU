import api from '../../../config/api';

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
  getClubAssignments: async (clubId: number): Promise<CategorizedAssignments> => {
    const response = await api.get(`/clubs/${clubId}/assignments`);
    return response.data.assignments;
  },

  // Get a single assignment
  getAssignment: async (clubId: number, assignmentId: number, cacheBust?: boolean): Promise<Assignment> => {
    const url = `/clubs/${clubId}/assignments/${assignmentId}`;
    const finalUrl = cacheBust ? `${url}?t=${Date.now()}` : url;
    const response = await api.get(finalUrl);
    return response.data.assignment;
  },

  // Create a new assignment (leader only)
  createAssignment: async (clubId: number, data: CreateAssignmentRequest, attachmentFiles?: File[]): Promise<Assignment> => {
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
    clubId: number,
    assignmentId: number,
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
    clubId: number,
    assignmentId: number,
    attachmentId: number
  ): Promise<void> => {
    await api.delete(`/clubs/${clubId}/assignments/${assignmentId}/attachments/${attachmentId}`);
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

  hideComment: async (
    clubId: number,
    assignmentId: number,
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

