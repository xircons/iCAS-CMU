import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authMiddleware';
import {
  getClubDocuments,
  getDocument,
  getMemberAssignedDocuments,
  createDocument,
  updateDocument,
  updateDocumentStatus,
  archiveDocument,
  deleteDocument,
  updateMemberSubmissionStatus,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  submitDocument,
  reviewSubmission,
  bulkUpdateStatus,
  bulkAssign,
  bulkDelete,
  bulkExport,
} from '../controllers/documentController';
import {
  requireLeaderOrAdmin,
  requireAdmin,
  requireClubMember,
  validateDocumentAccess,
} from '../middleware/documentMiddleware';
import { upload, templateUpload } from '../utils/fileUpload';
import { resolveClubPublicIdParam } from '../../../middleware/publicIdResolver';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Template routes - must be before parameterized routes
router.get('/documents/templates', getTemplates);
router.post('/:clubId/documents/templates', requireLeaderOrAdmin, templateUpload.single('file'), createTemplate);
router.put('/documents/templates/:templateId', updateTemplate);
router.delete('/documents/templates/:templateId', deleteTemplate);

// Resolve club public id only for routes that include :clubId/documents
router.use('/:clubId/documents', resolveClubPublicIdParam);

// Get all documents for a club (leader only)
router.get('/:clubId/documents', requireLeaderOrAdmin, getClubDocuments);

// Get documents assigned to current user (member access)
router.get('/:clubId/documents/assigned', requireClubMember, getMemberAssignedDocuments);

// Create a new document (admin only)
router.post('/:clubId/documents', requireAdmin, createDocument);

// Get a specific document (leader/admin or assigned member)
router.get('/:clubId/documents/:documentId', requireClubMember, validateDocumentAccess, getDocument);

// Update a document (admin only)
router.put('/:clubId/documents/:documentId', requireAdmin, validateDocumentAccess, updateDocument);

// Update document status (admin only)
router.patch('/:clubId/documents/:documentId/status', requireAdmin, validateDocumentAccess, updateDocumentStatus);

// Archive a document (admin only)
router.patch('/:clubId/documents/:documentId/archive', requireAdmin, validateDocumentAccess, archiveDocument);

// Delete a document (admin only)
router.delete('/:clubId/documents/:documentId', requireAdmin, validateDocumentAccess, deleteDocument);

// Update member submission status (leader only)
router.patch('/:clubId/documents/:documentId/member-status', requireLeaderOrAdmin, validateDocumentAccess, updateMemberSubmissionStatus);

// Submit document file (member)
router.post('/:clubId/documents/:documentId/submit', requireClubMember, validateDocumentAccess, upload.single('file'), submitDocument);

// Review submission (admin only)
router.patch('/:clubId/documents/:documentId/review', requireAdmin, validateDocumentAccess, reviewSubmission);

// Bulk operations (leader/admin only)
router.post('/:clubId/documents/bulk-update-status', requireLeaderOrAdmin, bulkUpdateStatus);
router.post('/:clubId/documents/bulk-assign', requireLeaderOrAdmin, bulkAssign);
router.post('/:clubId/documents/bulk-delete', requireLeaderOrAdmin, bulkDelete);
router.post('/:clubId/documents/bulk-export', requireLeaderOrAdmin, bulkExport);

export default router;

