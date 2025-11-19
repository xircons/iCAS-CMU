import api from '../../../config/api';
import type { SmartDocument, CreateDocumentFormData, DocumentTemplate } from '../../../components/smart-document/types';

export interface CreateDocumentRequest extends CreateDocumentFormData {}

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

export const documentApi = {
  /**
   * Get all documents for a club
   * @param clubId Club ID
   */
  getClubDocuments: async (clubId: number): Promise<SmartDocument[]> => {
    const response = await api.get(`/clubs/${clubId}/documents`);
    return response.data.documents;
  },

  /**
   * Get documents assigned to the current user (member access)
   * @param clubId Club ID
   */
  getMemberAssignedDocuments: async (clubId: number): Promise<SmartDocument[]> => {
    const response = await api.get(`/clubs/${clubId}/documents/assigned`);
    return response.data.documents;
  },

  /**
   * Get a single document by ID
   * @param clubId Club ID
   * @param documentId Document ID
   */
  getDocumentById: async (clubId: number, documentId: number): Promise<SmartDocument> => {
    const response = await api.get(`/clubs/${clubId}/documents/${documentId}`);
    return response.data.document;
  },

  /**
   * Create a new document
   * @param clubId Club ID
   * @param data Document data
   */
  createDocument: async (clubId: number, data: CreateDocumentRequest): Promise<SmartDocument> => {
    const response = await api.post(`/clubs/${clubId}/documents`, data);
    return response.data.document;
  },

  /**
   * Update a document
   * @param clubId Club ID
   * @param documentId Document ID
   * @param data Update data
   */
  updateDocument: async (clubId: number, documentId: number, data: UpdateDocumentRequest): Promise<SmartDocument> => {
    const response = await api.put(`/clubs/${clubId}/documents/${documentId}`, data);
    return response.data.document;
  },

  /**
   * Update document status
   * @param clubId Club ID
   * @param documentId Document ID
   * @param status Status update
   */
  updateDocumentStatus: async (clubId: number, documentId: number, status: UpdateDocumentStatusRequest): Promise<SmartDocument> => {
    const response = await api.patch(`/clubs/${clubId}/documents/${documentId}/status`, status);
    return response.data.document;
  },

  /**
   * Delete a document
   * @param clubId Club ID
   * @param documentId Document ID
   */
  deleteDocument: async (clubId: number, documentId: number): Promise<void> => {
    await api.delete(`/clubs/${clubId}/documents/${documentId}`);
  },

  /**
   * Update member submission status
   * @param clubId Club ID
   * @param documentId Document ID
   * @param data Member status update
   */
  updateMemberSubmissionStatus: async (clubId: number, documentId: number, data: UpdateMemberSubmissionStatusRequest): Promise<SmartDocument> => {
    const response = await api.patch(`/clubs/${clubId}/documents/${documentId}/member-status`, data);
    return response.data.document;
  },

  /**
   * Get available templates (with filters)
   */
  getTemplates: async (filters?: { category?: string; clubId?: string; isPublic?: boolean }): Promise<DocumentTemplate[]> => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.clubId) params.append('clubId', filters.clubId);
    if (filters?.isPublic !== undefined) params.append('isPublic', String(filters.isPublic));
    
    const response = await api.get(`/clubs/documents/templates?${params.toString()}`);
    return response.data.templates.map((t: any) => ({
      ...t,
      path: t.filePath, // Legacy compatibility
    }));
  },

  /**
   * Create a new template
   */
  createTemplate: async (clubId: number, file: File, data: { name: string; description?: string; category?: string; tags?: string[]; isPublic?: boolean }): Promise<DocumentTemplate> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    if (data.category) formData.append('category', data.category);
    if (data.tags) formData.append('tags', JSON.stringify(data.tags));
    if (data.isPublic !== undefined) formData.append('isPublic', String(data.isPublic));

    const response = await api.post(`/clubs/${clubId}/documents/templates`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return {
      ...response.data.template,
      path: response.data.template.filePath,
    };
  },

  /**
   * Update template metadata
   */
  updateTemplate: async (templateId: number, data: { name?: string; description?: string; category?: string; tags?: string[]; isPublic?: boolean }): Promise<DocumentTemplate> => {
    const response = await api.put(`/clubs/documents/templates/${templateId}`, data);
    return {
      ...response.data.template,
      path: response.data.template.filePath,
    };
  },

  /**
   * Delete template
   */
  deleteTemplate: async (templateId: number): Promise<void> => {
    await api.delete(`/clubs/documents/templates/${templateId}`);
  },

  /**
   * Submit document file (member)
   * @param clubId Club ID
   * @param documentId Document ID
   * @param file File to upload
   */
  submitDocumentFile: async (clubId: number, documentId: number, file: File): Promise<SmartDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/clubs/${clubId}/documents/${documentId}/submit`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.document;
  },

  /**
   * Review submission (admin/leader)
   * @param clubId Club ID
   * @param documentId Document ID
   * @param data Review data
   */
  reviewSubmission: async (clubId: number, documentId: number, data: ReviewSubmissionRequest): Promise<SmartDocument> => {
    const response = await api.patch(`/clubs/${clubId}/documents/${documentId}/review`, data);
    return response.data.document;
  },

  /**
   * Get file URL for download
   * @param filePath File path from document
   */
  getFileUrl: (filePath: string): string => {
    const baseURL = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5002';
    return `${baseURL}/${filePath}`;
  },

  /**
   * Bulk update document status
   * @param clubId Club ID
   * @param data Bulk status update data
   */
  bulkUpdateStatus: async (clubId: number, data: BulkUpdateStatusRequest): Promise<{ success: boolean; message: string; updatedCount: number }> => {
    const response = await api.post(`/clubs/${clubId}/documents/bulk-update-status`, data);
    return response.data;
  },

  /**
   * Bulk assign members to documents
   * @param clubId Club ID
   * @param data Bulk assign data
   */
  bulkAssign: async (clubId: number, data: BulkAssignRequest): Promise<{ success: boolean; message: string; assignedCount: number }> => {
    const response = await api.post(`/clubs/${clubId}/documents/bulk-assign`, data);
    return response.data;
  },

  /**
   * Bulk delete documents
   * @param clubId Club ID
   * @param data Bulk delete data
   */
  bulkDelete: async (clubId: number, data: BulkDeleteRequest): Promise<{ success: boolean; message: string; deletedCount: number }> => {
    const response = await api.post(`/clubs/${clubId}/documents/bulk-delete`, data);
    return response.data;
  },

  /**
   * Bulk export documents
   * @param clubId Club ID
   * @param data Bulk export data
   */
  bulkExport: async (clubId: number, data: BulkExportRequest): Promise<Blob | { success: boolean; documents: any[]; count: number }> => {
    const response = await api.post(`/clubs/${clubId}/documents/bulk-export`, data, {
      responseType: data.format === 'csv' ? 'blob' : 'json',
    });
    return response.data;
  },
};

