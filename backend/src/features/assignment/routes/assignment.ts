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

// Create a new assignment (leader only)
router.post('/:clubId/assignments', requireLeaderOrAdmin, createAssignment);

// Get a specific assignment
router.get('/:clubId/assignments/:assignmentId', requireClubMember, validateAssignmentAccess, getAssignment);

// Update an assignment (leader only)
router.put('/:clubId/assignments/:assignmentId', requireLeaderOrAdmin, validateAssignmentAccess, updateAssignment);

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

export default router;

