import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authMiddleware';
import {
  getClubAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment
} from '../controllers/assignmentController';
import {
  submitAssignment,
  getUserSubmission,
  getAssignmentSubmissions,
  getSubmission,
  gradeSubmission
} from '../controllers/submissionController';
import {
  getAssignmentComments,
  createComment,
  updateComment,
  deleteComment
} from '../controllers/commentController';
import {
  requireLeaderOrAdmin,
  requireClubMember,
  validateAssignmentAccess
} from '../middleware/assignmentMiddleware';
import { upload } from '../utils/fileUpload';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Assignment routes (club-level)
// Get all assignments for a club (categorized)
router.get('/:clubId/assignments', requireClubMember, getClubAssignments);

// Create a new assignment (leader only) - supports file upload
router.post('/:clubId/assignments', requireLeaderOrAdmin, upload.single('attachment'), createAssignment);

// Get a specific assignment
router.get('/:clubId/assignments/:assignmentId', requireClubMember, validateAssignmentAccess, getAssignment);

// Update an assignment (leader only) - supports file upload
router.put('/:clubId/assignments/:assignmentId', requireLeaderOrAdmin, validateAssignmentAccess, upload.single('attachment'), updateAssignment);

// Delete an assignment (leader only)
router.delete('/:clubId/assignments/:assignmentId', requireLeaderOrAdmin, validateAssignmentAccess, deleteAssignment);

// Submission routes (assignment-level)
// Submit an assignment (member) - supports both text and file
router.post(
  '/:clubId/assignments/:assignmentId/submit',
  requireClubMember,
  validateAssignmentAccess,
  upload.single('file'),
  submitAssignment
);

// Get user's own submission
router.get(
  '/:clubId/assignments/:assignmentId/submission',
  requireClubMember,
  validateAssignmentAccess,
  getUserSubmission
);

// Get all submissions for an assignment (leader only)
router.get(
  '/:clubId/assignments/:assignmentId/submissions',
  requireLeaderOrAdmin,
  validateAssignmentAccess,
  getAssignmentSubmissions
);

// Get a specific submission (leader only)
router.get(
  '/:clubId/assignments/:assignmentId/submissions/:submissionId',
  requireLeaderOrAdmin,
  validateAssignmentAccess,
  getSubmission
);

// Grade a submission (leader only)
router.patch(
  '/:clubId/assignments/:assignmentId/submissions/:submissionId/grade',
  requireLeaderOrAdmin,
  validateAssignmentAccess,
  gradeSubmission
);

// Comment routes (assignment-level)
// Get all comments for an assignment
router.get(
  '/:clubId/assignments/:assignmentId/comments',
  requireClubMember,
  validateAssignmentAccess,
  getAssignmentComments
);

// Create a comment
router.post(
  '/:clubId/assignments/:assignmentId/comments',
  requireClubMember,
  validateAssignmentAccess,
  createComment
);

// Update a comment
router.put(
  '/:clubId/assignments/:assignmentId/comments/:commentId',
  requireClubMember,
  validateAssignmentAccess,
  updateComment
);

// Delete a comment
router.delete(
  '/:clubId/assignments/:assignmentId/comments/:commentId',
  requireClubMember,
  validateAssignmentAccess,
  deleteComment
);

export default router;

