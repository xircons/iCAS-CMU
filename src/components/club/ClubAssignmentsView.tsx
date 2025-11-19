import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { 
  ClipboardList, 
  Search, 
  Plus,
  Calendar,
  Clock, 
  AlertCircle,
  FileText,
  Users,
  Edit,
  Trash2,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useClub } from "../../contexts/ClubContext";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { assignmentApi, Assignment, CategorizedAssignments } from "../../features/assignment/api/assignmentApi";
import { documentApi } from "../../features/smart-document/api/documentApi";
import type { SmartDocument } from "../../components/smart-document/types";
import { CreateAssignmentDialog } from "./CreateAssignmentDialog";
import { EditAssignmentDialog } from "./EditAssignmentDialog";
import { SubmitAssignmentDialog } from "./SubmitAssignmentDialog";
import { AssignmentSubmissionsView } from "./AssignmentSubmissionsView";
import { FilterDropdown, FilterOption } from "../shared/FilterDropdown";
import { SortDropdown, SortOption } from "../shared/SortDropdown";
import { AssignmentProgressCard } from "./AssignmentProgressCard";
import { Sparkles } from "lucide-react";

// Unified type for assignments and smart documents
export type UnifiedAssignment = 
  | (Assignment & { type: 'assignment' })
  | (SmartDocument & { type: 'smartDocument' });

export interface CategorizedUnifiedAssignments {
  current: UnifiedAssignment[];
  upcoming: UnifiedAssignment[];
  overdue: UnifiedAssignment[];
  past: UnifiedAssignment[];
}

// Helper functions to normalize data
const normalizeAssignment = (assignment: Assignment): UnifiedAssignment => ({
  ...assignment,
  type: 'assignment' as const,
});

const normalizeSmartDocument = (document: SmartDocument): UnifiedAssignment => ({
  ...document,
  type: 'smartDocument' as const,
});

// Helper to get common properties
const getUnifiedTitle = (item: UnifiedAssignment): string => item.title;
const getUnifiedDescription = (item: UnifiedAssignment): string | undefined => item.description;
const getUnifiedDueDate = (item: UnifiedAssignment): string => {
  if (item.type === 'assignment') {
    return item.dueDate;
  } else {
    return item.dueDate;
  }
};
const getUnifiedId = (item: UnifiedAssignment): number => item.id;
const getUnifiedClubId = (item: UnifiedAssignment): number => item.clubId;

export function ClubAssignmentsView() {
  const { club, clubId } = useClub();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [assignments, setAssignments] = useState<CategorizedUnifiedAssignments>({
    current: [],
    upcoming: [],
    overdue: [],
    past: [],
  });
  const [displayAssignments, setDisplayAssignments] = useState<CategorizedUnifiedAssignments>({
    current: [],
    upcoming: [],
    overdue: [],
    past: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter and sort state
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [gradedFilter, setGradedFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("dueDate");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isSubmissionsViewOpen, setIsSubmissionsViewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<{ id: number; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLeader = user?.role === 'leader' || user?.role === 'admin';

  useEffect(() => {
    fetchAssignments();
  }, [clubId, isLeader]);

  const fetchAssignments = async () => {
    if (!clubId) return;
    
    try {
      setIsLoading(true);
      const assignmentData = await assignmentApi.getClubAssignments(clubId);
      
      // For members: also fetch smart documents assigned to them
      let smartDocuments: SmartDocument[] = [];
      if (!isLeader) {
        try {
          smartDocuments = await documentApi.getMemberAssignedDocuments(clubId);
        } catch (error: any) {
          console.error('Error fetching smart documents:', error);
          // Don't show error toast, just continue without smart documents
        }
      }
      
      // Normalize assignments
      const normalizedAssignments = {
        current: assignmentData.current.map(normalizeAssignment),
        upcoming: assignmentData.upcoming.map(normalizeAssignment),
        overdue: assignmentData.overdue.map(normalizeAssignment),
        past: assignmentData.past.map(normalizeAssignment),
      };
      
      // Normalize and categorize smart documents
      const now = new Date();
      const categorizedDocuments: CategorizedUnifiedAssignments = {
        current: [],
        upcoming: [],
        overdue: [],
        past: [],
      };
      
      smartDocuments.forEach((doc) => {
        const normalized = normalizeSmartDocument(doc);
        const dueDate = new Date(doc.dueDate);
        
        // Categorize based on due date
        if (dueDate < now) {
          if (doc.isOverdue && doc.status !== 'Completed') {
            categorizedDocuments.overdue.push(normalized);
          } else {
            categorizedDocuments.past.push(normalized);
          }
        } else {
          // Future due date - check if it's current or upcoming
          // For smart documents, we consider them "current" if due date is in the future
          // and "upcoming" if due date is more than 7 days away
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilDue <= 7) {
            categorizedDocuments.current.push(normalized);
          } else {
            categorizedDocuments.upcoming.push(normalized);
          }
        }
      });
      
      // Merge assignments and smart documents
      const merged: CategorizedUnifiedAssignments = {
        current: [...normalizedAssignments.current, ...categorizedDocuments.current],
        upcoming: [...normalizedAssignments.upcoming, ...categorizedDocuments.upcoming],
        overdue: [...normalizedAssignments.overdue, ...categorizedDocuments.overdue],
        past: [...normalizedAssignments.past, ...categorizedDocuments.past],
      };
      
      // For leaders, recategorize assignments based on dates only (ignore submission status)
      if (isLeader) {
        const recategorized: CategorizedUnifiedAssignments = {
          current: [],
          upcoming: [],
          overdue: [],
          past: [],
        };
        
        // Combine all assignments from all categories
        const allAssignments = [
          ...merged.current,
          ...merged.upcoming,
          ...merged.overdue,
          ...merged.past,
        ];
        
        allAssignments.forEach((item) => {
          if (item.type === 'assignment') {
            // Parse dates using UTC to match backend format
            let availableDate: Date;
            let dueDate: Date;
            
            if (item.availableDate.includes(' ')) {
              const [datePart, timePart] = item.availableDate.split(' ');
              const [year, month, day] = datePart.split('-').map(Number);
              const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
              availableDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
            } else {
              availableDate = new Date(item.availableDate);
            }
            
            if (item.dueDate.includes(' ')) {
              const [datePart, timePart] = item.dueDate.split(' ');
              const [year, month, day] = datePart.split('-').map(Number);
              const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
              dueDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
            } else {
              dueDate = new Date(item.dueDate);
            }
            
            if (dueDate < now) {
              recategorized.past.push(item);
            } else if (availableDate <= now) {
              recategorized.current.push(item);
            } else {
              recategorized.upcoming.push(item);
            }
          } else {
            // Smart document - use existing categorization
            const dueDate = new Date(item.dueDate);
            if (dueDate < now) {
              if (item.isOverdue && item.status !== 'Completed') {
                recategorized.overdue.push(item);
              } else {
                recategorized.past.push(item);
              }
            } else {
              const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (daysUntilDue <= 7) {
                recategorized.current.push(item);
              } else {
                recategorized.upcoming.push(item);
              }
            }
          }
        });
        
        // Set both assignments and displayAssignments for leaders
        setAssignments(recategorized);
        setDisplayAssignments(recategorized);
      } else {
        // For members, use merged data
        setAssignments(merged);
        setDisplayAssignments(merged);
      }
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch assignments');
      // Reset assignments on error
      setAssignments({
        current: [],
        upcoming: [],
        overdue: [],
        past: [],
      });
      setDisplayAssignments({
        current: [],
        upcoming: [],
        overdue: [],
        past: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get assignment status helper (moved before useEffect)
  const getAssignmentStatusForFilter = (assignment: Assignment) => {
    const now = new Date();
    
    let availableDate: Date;
    let dueDate: Date;
    
    if (assignment.availableDate.includes(' ')) {
      const [datePart, timePart] = assignment.availableDate.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
      availableDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
    } else {
      availableDate = new Date(assignment.availableDate);
    }
    
    if (assignment.dueDate.includes(' ')) {
      const [datePart, timePart] = assignment.dueDate.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
      dueDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
    } else {
      dueDate = new Date(assignment.dueDate);
    }

    if (isLeader) {
      if (dueDate < now) return 'past';
      if (availableDate <= now) return 'current';
      return 'upcoming';
    }

    const hasSubmission = assignment.userSubmission !== null && assignment.userSubmission !== undefined;
    const isGraded = hasSubmission && assignment.userSubmission?.gradedAt !== null;
    
    if (availableDate > now) return 'upcoming';
    if (dueDate < now) {
      if (isGraded) return 'graded';
      if (hasSubmission) return 'submitted';
      return 'overdue';
    }
    if (isGraded) return 'graded';
    if (hasSubmission) return 'submitted';
    return 'current';
  };

  // Get status for filtering (works with both types)
  const getUnifiedStatusForFilter = (item: UnifiedAssignment): string => {
    if (item.type === 'smartDocument') {
      const submissionStatus = item.assignedMembers?.[0]?.submissionStatus || 'Not Submitted';
      return submissionStatus.toLowerCase().replace(' ', '-');
    } else {
      return getAssignmentStatusForFilter(item);
    }
  };

  // Apply filters and sorting
  useEffect(() => {
    if (!assignments) return;

    let filtered: CategorizedUnifiedAssignments = {
      current: [...assignments.current],
      upcoming: [...assignments.upcoming],
      overdue: [...assignments.overdue],
      past: [...assignments.past],
    };

    // Apply status filters
    if (statusFilters.length > 0) {
      const filterAssignmentsByStatus = (list: UnifiedAssignment[]) => {
        return list.filter((item) => {
          const status = getUnifiedStatusForFilter(item);
          return statusFilters.includes(status);
        });
      };

      filtered.current = filterAssignmentsByStatus(filtered.current);
      filtered.upcoming = filterAssignmentsByStatus(filtered.upcoming);
      filtered.overdue = filterAssignmentsByStatus(filtered.overdue);
      filtered.past = filterAssignmentsByStatus(filtered.past);
    }

    // Apply graded filter (only for members, only for assignments)
    if (!isLeader && gradedFilter.length > 0) {
      const filterByGraded = (list: UnifiedAssignment[]) => {
        return list.filter((item) => {
          // Only apply graded filter to assignments, not smart documents
          if (item.type === 'smartDocument') {
            return true; // Include all smart documents
          }
          
          const hasSubmission = item.userSubmission !== null && item.userSubmission !== undefined;
          const isGraded = hasSubmission && item.userSubmission?.gradedAt !== null;
          
          if (gradedFilter.includes('graded')) {
            return isGraded;
          }
          if (gradedFilter.includes('ungraded')) {
            return hasSubmission && !isGraded;
          }
          if (gradedFilter.includes('not-submitted')) {
            return !hasSubmission;
          }
          return true;
        });
      };

      filtered.current = filterByGraded(filtered.current);
      filtered.upcoming = filterByGraded(filtered.upcoming);
      filtered.overdue = filterByGraded(filtered.overdue);
      filtered.past = filterByGraded(filtered.past);
    }

    // Apply sorting
    const sortAssignments = (list: UnifiedAssignment[]) => {
      return [...list].sort((a, b) => {
        switch (sortBy) {
          case 'dueDate':
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          case 'dueDateDesc':
            return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
          case 'title':
            return a.title.localeCompare(b.title);
          case 'titleDesc':
            return b.title.localeCompare(a.title);
          case 'createdAt':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'createdAtDesc':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'submissionCount':
            // Only assignments have submissionCount
            const aCount = (a.type === 'assignment' && a.submissionCount) ? a.submissionCount : 0;
            const bCount = (b.type === 'assignment' && b.submissionCount) ? b.submissionCount : 0;
            return aCount - bCount;
          case 'submissionCountDesc':
            const aCountDesc = (a.type === 'assignment' && a.submissionCount) ? a.submissionCount : 0;
            const bCountDesc = (b.type === 'assignment' && b.submissionCount) ? b.submissionCount : 0;
            return bCountDesc - aCountDesc;
          default:
            return 0;
        }
      });
    };

    filtered.current = sortAssignments(filtered.current);
    filtered.upcoming = sortAssignments(filtered.upcoming);
    filtered.overdue = sortAssignments(filtered.overdue);
    filtered.past = sortAssignments(filtered.past);

    setDisplayAssignments(filtered);
  }, [assignments, statusFilters, gradedFilter, sortBy, isLeader]);

  const handleCreateAssignment = () => {
    setIsCreateDialogOpen(false);
    fetchAssignments();
    toast.success('Assignment created successfully!');
  };

  const handleSubmitAssignment = () => {
    setIsSubmitDialogOpen(false);
    setSelectedAssignment(null);
    fetchAssignments();
  };

  const handleEditAssignment = async (item: UnifiedAssignment, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    
    // Only allow editing assignments, not smart documents
    if (item.type === 'smartDocument') {
      return;
    }
    
    const assignment = item;
    
    // Fetch the latest assignment data to ensure we have attachment fields
    if (clubId) {
      try {
        console.log('Fetching fresh assignment data for edit...', assignment.id);
        const freshAssignment = await assignmentApi.getAssignment(clubId, assignment.id);
        console.log('Fresh assignment data:', {
          id: freshAssignment.id,
          attachmentPath: freshAssignment.attachmentPath,
          attachmentName: freshAssignment.attachmentName,
          attachmentMimeType: freshAssignment.attachmentMimeType,
          attachments: freshAssignment.attachments,
          attachmentsCount: freshAssignment.attachments?.length || 0
        });
        setSelectedAssignment(freshAssignment);
        setIsEditDialogOpen(true);
      } catch (error) {
        console.error('Error fetching assignment:', error);
        // Fallback to the assignment from the list
        setSelectedAssignment(assignment);
        setIsEditDialogOpen(true);
      }
    } else {
      setSelectedAssignment(assignment);
      setIsEditDialogOpen(true);
    }
  };

  const handleEditSuccess = async (updatedAssignmentFromResponse?: Assignment) => {
    // Refresh assignments list
    await fetchAssignments();
    
    // Use the updated assignment from the response if provided, otherwise fetch it
    if (updatedAssignmentFromResponse) {
      console.log('Using updated assignment from response:', {
        id: updatedAssignmentFromResponse.id,
        attachmentPath: updatedAssignmentFromResponse.attachmentPath,
        attachmentName: updatedAssignmentFromResponse.attachmentName,
        attachmentMimeType: updatedAssignmentFromResponse.attachmentMimeType,
        attachments: updatedAssignmentFromResponse.attachments,
        attachmentsCount: updatedAssignmentFromResponse.attachments?.length || 0
      });
      setSelectedAssignment(updatedAssignmentFromResponse);
    } else if (selectedAssignment && clubId) {
      // Fallback: fetch if not provided in response
      try {
        // Wait a bit for backend to process the file upload
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Fetching updated assignment after edit...', selectedAssignment.id);
        // Add cache-busting parameter to ensure we get fresh data
        const updatedAssignment = await assignmentApi.getAssignment(clubId, selectedAssignment.id, true);
        console.log('Updated assignment data:', {
          id: updatedAssignment.id,
          attachmentPath: updatedAssignment.attachmentPath,
          attachmentName: updatedAssignment.attachmentName,
          attachmentMimeType: updatedAssignment.attachmentMimeType,
          attachments: updatedAssignment.attachments,
          attachmentsCount: updatedAssignment.attachments?.length || 0
        });
        setSelectedAssignment(updatedAssignment);
      } catch (error) {
        console.error('Error fetching updated assignment:', error);
        // Keep the selected assignment but it might be stale
      }
    }
    // Note: Don't clear selectedAssignment here - keep it so user can edit again
    toast.success('Assignment updated successfully!');
  };

  const handleDeleteAssignment = async (assignmentId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    
    if (!clubId) return;

    // Find the assignment to show its title in the dialog
    const assignment = [
      ...assignments.current,
      ...assignments.upcoming,
      ...assignments.overdue,
      ...assignments.past
    ].find(a => a.id === assignmentId && a.type === 'assignment');

    if (assignment) {
      setAssignmentToDelete({ id: assignmentId, title: assignment.title });
      setIsDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!clubId || !assignmentToDelete) return;

    try {
      setIsDeleting(true);
      await assignmentApi.deleteAssignment(clubId, assignmentToDelete.id);
      toast.success('Assignment deleted successfully');
      setIsDeleteDialogOpen(false);
      setAssignmentToDelete(null);
      fetchAssignments();
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to delete assignment');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    // MySQL DATETIME format: "2025-11-12 17:46:00" (stored as UTC)
    // We need to parse it as UTC, then toLocaleDateString will convert to local for display
    let date: Date;
    if (dateString.includes(' ')) {
      // MySQL DATETIME format: "YYYY-MM-DD HH:MM:SS"
      // Parse as UTC since we stored it as UTC
      const [datePart, timePart] = dateString.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
      // Create as UTC - this will then convert to local time when displayed
      date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
    } else {
      // ISO format or other - let JavaScript parse it
      date = new Date(dateString);
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filterAssignments = (assignmentList: UnifiedAssignment[]) => {
    return assignmentList.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Get status for smart documents
  const getSmartDocumentStatus = (document: SmartDocument) => {
    const submissionStatus = document.assignedMembers?.[0]?.submissionStatus || 'Not Submitted';
    
    const statusLabels: Record<string, string> = {
      'Not Submitted': 'ยังไม่ส่ง',
      'Submitted': 'ส่งงาน',
      'Approved': 'สำเร็จ',
      'Needs Revision': 'แก้ไข',
    };
    
    const statusColors: Record<string, string> = {
      'Not Submitted': 'bg-gray-100 text-gray-700 hover:bg-gray-100',
      'Submitted': 'bg-blue-100 text-blue-700 hover:bg-blue-100',
      'Approved': 'bg-green-100 text-green-700 hover:bg-green-100',
      'Needs Revision': 'bg-red-100 text-red-700 hover:bg-red-100',
    };
    
    return {
      label: statusLabels[submissionStatus] || submissionStatus,
      color: statusColors[submissionStatus] || 'bg-gray-100 text-gray-700 hover:bg-gray-100',
    };
  };

  const getAssignmentStatus = (assignment: Assignment) => {
    const now = new Date();
    
    // Parse dates using UTC to match backend format
    let availableDate: Date;
    let dueDate: Date;
    
    if (assignment.availableDate.includes(' ')) {
      const [datePart, timePart] = assignment.availableDate.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
      availableDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
    } else {
      availableDate = new Date(assignment.availableDate);
    }
    
    if (assignment.dueDate.includes(' ')) {
      const [datePart, timePart] = assignment.dueDate.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
      dueDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
    } else {
      dueDate = new Date(assignment.dueDate);
    }

    // For leaders, show only Past, Current, or Upcoming
    if (isLeader) {
      if (dueDate < now) {
        return { label: 'Past', color: 'bg-red-100 text-red-700 hover:bg-red-100' };
      } else if (availableDate <= now) {
        return { label: 'Current', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' };
      } else {
        return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700 hover:bg-blue-100' };
      }
    }

    // For members, show detailed status
    const hasSubmission = assignment.userSubmission !== null && assignment.userSubmission !== undefined;
    const isGraded = hasSubmission && assignment.userSubmission?.gradedAt !== null;
    
    // Check if submission was late
    let isLate = false;
    if (hasSubmission && assignment.userSubmission?.submittedAt) {
      let submittedDate: Date;
      if (assignment.userSubmission.submittedAt.includes(' ')) {
        const [datePart, timePart] = assignment.userSubmission.submittedAt.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
        submittedDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
      } else {
        submittedDate = new Date(assignment.userSubmission.submittedAt);
      }
      isLate = submittedDate > dueDate;
    }

    if (availableDate > now) {
      return { label: 'Upcoming', color: 'bg-purple-100 text-purple-700 hover:bg-purple-100' };
    } else if (dueDate < now) {
      // Past due date
      if (isGraded) {
        return { label: 'Graded', color: 'bg-green-100 text-green-700 hover:bg-green-100' };
      } else if (hasSubmission) {
        if (isLate) {
          return { label: 'Late', color: 'bg-orange-100 text-orange-700 hover:bg-orange-100' };
        } else {
          return { label: 'Submitted', color: 'bg-blue-100 text-blue-700 hover:bg-blue-100' };
        }
      } else {
        return { label: 'Overdue', color: 'bg-red-100 text-red-700 hover:bg-red-100' };
      }
    } else {
      // Current (not past due)
      if (isGraded) {
        return { label: 'Graded', color: 'bg-green-100 text-green-700 hover:bg-green-100' };
      } else if (hasSubmission) {
        return { label: 'Submitted', color: 'bg-blue-100 text-blue-700 hover:bg-blue-100' };
      } else {
        return { label: 'Current', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' };
      }
    }
  };

  const renderAssignmentCard = (item: UnifiedAssignment) => {
    const isSmartDocument = item.type === 'smartDocument';
    
    // Get status based on type
    const status = isSmartDocument 
      ? getSmartDocumentStatus(item)
      : getAssignmentStatus(item);
    
    // Get submission info
    const hasSubmission = isSmartDocument
      ? (item.assignedMembers?.[0]?.submissionStatus && item.assignedMembers[0].submissionStatus !== 'Not Submitted')
      : (item.userSubmission !== null && item.userSubmission !== undefined);

    // Format due date
    const dueDateStr = isSmartDocument 
      ? new Date(item.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : formatDate(item.dueDate);

    // Navigation handler
    const handleClick = () => {
      if (isSmartDocument) {
        navigate(`/club/${clubId}/smartdoc/${item.id}`);
      } else {
        navigate(`/club/${clubId}/assignment/${item.id}`);
      }
    };

    // Visual styling for smart documents
    const cardClassName = isSmartDocument
      ? "hover:shadow-md transition-shadow cursor-pointer border-2 border-purple-300 bg-white dark:bg-gray-900"
      : "hover:shadow-md transition-shadow cursor-pointer";

    return (
      <Card 
        key={item.id} 
        className={cardClassName}
        onClick={handleClick}
      >
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center' }}>
              {isSmartDocument && (
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              )}
              <CardTitle className="text-base truncate" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                {item.title}
              </CardTitle>
              {!isSmartDocument && isLeader && (
                <span className="flex-shrink-0" data-slot="card" style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
                  {item.isVisible !== false ? (
                    <Eye className="h-4 w-4 text-muted-foreground" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isSmartDocument && (
                <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 dark:text-purple-400">
                  เอกสารอัจฉริยะ
                </Badge>
              )}
              <Badge className={status.color}>
                {status.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
          )}
          
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Due: {dueDateStr}</span>
            </div>
          </div>

          {!isSmartDocument && item.maxScore !== null && item.maxScore !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              <span>Max Score: {item.maxScore} points</span>
              {hasSubmission && item.userSubmission?.score !== undefined && item.userSubmission.score !== null && (
                <Badge variant="secondary" className="ml-2">
                  Score: {item.userSubmission.score}/{item.maxScore}
                </Badge>
              )}
            </div>
          )}

          {isSmartDocument && hasSubmission && item.assignedMembers?.[0]?.fileName && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              <span className="truncate">ไฟล์: {item.assignedMembers[0].fileName}</span>
            </div>
          )}

          {isSmartDocument && item.assignedMembers?.[0]?.adminComment && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">ความคิดเห็น:</p>
              <p className="text-sm text-muted-foreground mt-1">{item.assignedMembers[0].adminComment}</p>
            </div>
          )}

          {!isSmartDocument && hasSubmission && item.userSubmission?.comment && (
            <div className="mt-2 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Feedback:</p>
              <p className="text-sm text-muted-foreground mt-1">{item.userSubmission.comment}</p>
            </div>
          )}

          {!isSmartDocument && isLeader && (
            <div className="flex flex-row gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleEditAssignment(item, e)}
                className="flex-1 h-8 sm:h-9"
              >
                <Edit className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleDeleteAssignment(item.id, e)}
                className="text-destructive hover:text-destructive flex-1 h-8 sm:h-9 sm:flex-initial"
              >
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderAssignmentList = (assignmentList: UnifiedAssignment[], emptyMessage: string) => {
    const filtered = filterAssignments(assignmentList);

    if (filtered.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">{emptyMessage}</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4">
        {filtered.map((assignment) => renderAssignmentCard(assignment))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading assignments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h1 className="mb-2 text-xl md:text-2xl font-bold">Assignments</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {club?.name} - {isLeader ? 'Manage assignments and submissions' : 'View and submit your assignments'}
          </p>
        </div>
        {isLeader && (
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="w-auto touch-manipulation sm:h-8 sm:rounded-md sm:px-3 sm:gap-1.5"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        )}
      </div>

      {/* Search, Filters, and Sort */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <FilterDropdown
            label="Status"
            options={[
              { value: 'current', label: 'Current' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'past', label: 'Past' },
              ...(isLeader ? [] : [
                { value: 'submitted', label: 'Submitted' },
                { value: 'graded', label: 'Graded' },
              ]),
            ]}
            selectedValues={statusFilters}
            onSelectionChange={setStatusFilters}
          />

          {!isLeader && (
            <FilterDropdown
              label="Graded"
              options={[
                { value: 'graded', label: 'Graded' },
                { value: 'ungraded', label: 'Ungraded' },
                { value: 'not-submitted', label: 'Not Submitted' },
              ]}
              selectedValues={gradedFilter}
              onSelectionChange={setGradedFilter}
            />
          )}

          <SortDropdown
            label="Sort"
            options={[
              { value: 'dueDate', label: 'Due Date ↑' },
              { value: 'dueDateDesc', label: 'Due Date ↓' },
              { value: 'title', label: 'Title A-Z' },
              { value: 'titleDesc', label: 'Title Z-A' },
              { value: 'createdAt', label: 'Created ↑' },
              { value: 'createdAtDesc', label: 'Created ↓' },
              { value: 'submissionCount', label: 'Submissions ↑' },
              { value: 'submissionCountDesc', label: 'Submissions ↓' },
            ]}
            value={sortBy}
            onValueChange={setSortBy}
          />

          {(statusFilters.length > 0 || gradedFilter.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilters([]);
                setGradedFilter([]);
              }}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Clear Filters</span>
            </Button>
          )}
        </div>
      </div>

      {/* Progress Overview - Leader View */}
      {isLeader && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(() => {
            const allAssignments = [
              ...displayAssignments.current,
              ...displayAssignments.upcoming,
              ...displayAssignments.overdue,
              ...displayAssignments.past,
            ];
            
            const totalAssignments = allAssignments.length;
            const assignmentsWithSubmissions = allAssignments.filter(a => (a.submissionCount || 0) > 0);
            const totalSubmissions = allAssignments.reduce((sum, a) => sum + (a.submissionCount || 0), 0);
            
            return (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Assignments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{totalAssignments}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {assignmentsWithSubmissions.length} with submissions
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{totalSubmissions}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Across all assignments
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Assignments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{displayAssignments.current.length + displayAssignments.upcoming.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current + Upcoming
                    </p>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </div>
      )}

      {/* All Categories Display */}
      <div className="space-y-8">
        {/* Current Assignments */}
        {displayAssignments.current.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Current ({displayAssignments.current.length})</h2>
            </div>
            {renderAssignmentList(displayAssignments.current, 'No current assignments')}
          </div>
        )}

        {/* Upcoming Assignments */}
        {displayAssignments.upcoming.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold">Upcoming ({displayAssignments.upcoming.length})</h2>
            </div>
            {renderAssignmentList(displayAssignments.upcoming, 'No upcoming assignments')}
          </div>
        )}

        {/* Overdue Assignments - Only show for members */}
        {!isLeader && displayAssignments.overdue.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold">Overdue ({displayAssignments.overdue.length})</h2>
            </div>
            {renderAssignmentList(displayAssignments.overdue, 'No overdue assignments')}
          </div>
        )}

        {/* Past Assignments */}
        {displayAssignments.past.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Past ({displayAssignments.past.length})</h2>
            </div>
            {renderAssignmentList(displayAssignments.past, 'No past assignments')}
          </div>
        )}

        {/* Empty State - Show only if all categories are empty */}
        {displayAssignments.current.length === 0 && 
         displayAssignments.upcoming.length === 0 && 
         (isLeader || displayAssignments.overdue.length === 0) && 
         displayAssignments.past.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mt-6 mb-2 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">No assignments found</p>
          </CardContent>
        </Card>
                  )}
                </div>

      {/* Dialogs */}
      {isLeader && (
        <>
          <CreateAssignmentDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            onSuccess={handleCreateAssignment}
          />
          <EditAssignmentDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            assignment={selectedAssignment}
            onSuccess={handleEditSuccess}
          />
        </>
      )}

          {selectedAssignment && (
            <>
          <SubmitAssignmentDialog
            open={isSubmitDialogOpen}
            onOpenChange={setIsSubmitDialogOpen}
            assignment={selectedAssignment}
            onSuccess={handleSubmitAssignment}
          />

          {isLeader && (
            <AssignmentSubmissionsView
              open={isSubmissionsViewOpen}
              onOpenChange={setIsSubmissionsViewOpen}
              assignment={selectedAssignment}
            />
          )}
            </>
          )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-left">Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Are you sure you want to delete "{assignmentToDelete?.title}"? This action cannot be undone and will permanently delete the assignment and all associated submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:gap-2">
            <AlertDialogCancel 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setAssignmentToDelete(null);
              }}
              disabled={isDeleting}
              className="flex-1 h-10 sm:h-9"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90 flex-1 h-10 sm:h-9"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Assignment
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
