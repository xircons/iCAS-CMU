import api from '../../../config/api';

export interface Assignment {
  id: number;
  clubId: number;
  title: string;
  description?: string;
  maxScore?: number;
  availableDate: string;
  dueDate: string;
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
  createAssignment: async (clubId: number, data: CreateAssignmentRequest): Promise<Assignment> => {
    const response = await api.post(`/clubs/${clubId}/assignments`, data);
    return response.data.assignment;
  },

  // Update an assignment (leader only)
  updateAssignment: async (
    clubId: number,
    assignmentId: number,
    data: UpdateAssignmentRequest
  ): Promise<Assignment> => {
    const response = await api.put(`/clubs/${clubId}/assignments/${assignmentId}`, data);
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
};

