import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { 
  ClipboardList, 
  Search, 
  Plus,
  Calendar,
  Clock, 
  AlertCircle,
  FileText,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useClub } from "../../contexts/ClubContext";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { assignmentApi, Assignment, CategorizedAssignments } from "../../features/assignment/api/assignmentApi";
import { CreateAssignmentDialog } from "./CreateAssignmentDialog";
import { SubmitAssignmentDialog } from "./SubmitAssignmentDialog";
import { AssignmentSubmissionsView } from "./AssignmentSubmissionsView";

export function ClubAssignmentsView() {
  const { club, clubId } = useClub();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [assignments, setAssignments] = useState<CategorizedAssignments>({
    current: [],
    upcoming: [],
    overdue: [],
    past: [],
  });
  const [displayAssignments, setDisplayAssignments] = useState<CategorizedAssignments>({
    current: [],
    upcoming: [],
    overdue: [],
    past: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isSubmissionsViewOpen, setIsSubmissionsViewOpen] = useState(false);

  const isLeader = user?.role === 'leader' || user?.role === 'admin';

  useEffect(() => {
    fetchAssignments();
  }, [clubId, isLeader]);

  const fetchAssignments = async () => {
    if (!clubId) return;
    
    try {
      setIsLoading(true);
      const data = await assignmentApi.getClubAssignments(clubId);
      setAssignments(data);
      
      // For leaders, recategorize assignments based on dates only (ignore submission status)
      if (isLeader) {
        const now = new Date();
        const recategorized: CategorizedAssignments = {
          current: [],
          upcoming: [],
          overdue: [],
          past: [],
        };
        
        // Combine all assignments from all categories
        const allAssignments = [
          ...data.current,
          ...data.upcoming,
          ...data.overdue,
          ...data.past,
        ];
        
        allAssignments.forEach((assignment) => {
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
          
          if (dueDate < now) {
            recategorized.past.push(assignment);
          } else if (availableDate <= now) {
            recategorized.current.push(assignment);
          } else {
            recategorized.upcoming.push(assignment);
          }
        });
        
        setDisplayAssignments(recategorized);
      } else {
        setDisplayAssignments(data);
      }
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch assignments');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!clubId) return;

    if (!confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }

    try {
      await assignmentApi.deleteAssignment(clubId, assignmentId);
      toast.success('Assignment deleted successfully');
      fetchAssignments();
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to delete assignment');
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

  const filterAssignments = (assignmentList: Assignment[]) => {
    return assignmentList.filter((assignment) =>
      assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
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

  const renderAssignmentCard = (assignment: Assignment) => {
    const status = getAssignmentStatus(assignment);
    const hasSubmission = assignment.userSubmission !== null && assignment.userSubmission !== undefined;

    return (
      <Card 
        key={assignment.id} 
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => navigate(`/club/${clubId}/assignment/${assignment.id}`)}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{assignment.title}</CardTitle>
            </div>
            <Badge className={status.color}>
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignment.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{assignment.description}</p>
          )}
          
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Due: {formatDate(assignment.dueDate)}</span>
            </div>
          </div>

          {assignment.maxScore !== null && assignment.maxScore !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              <span>Max Score: {assignment.maxScore} points</span>
              {hasSubmission && assignment.userSubmission?.score !== undefined && assignment.userSubmission.score !== null && (
                <Badge variant="secondary" className="ml-2">
                  Score: {assignment.userSubmission.score}/{assignment.maxScore}
                </Badge>
              )}
            </div>
          )}

          {hasSubmission && assignment.userSubmission?.comment && (
            <div className="mt-2 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Feedback:</p>
              <p className="text-sm text-muted-foreground mt-1">{assignment.userSubmission.comment}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderAssignmentList = (assignmentList: Assignment[], emptyMessage: string) => {
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
      <div>
        <h1 className="mb-2 text-xl md:text-2xl">Assignments</h1>
        <p className="text-sm md:text-base text-muted-foreground">
            {club?.name} - {isLeader ? 'Manage assignments and submissions' : 'View and submit your assignments'}
          </p>
        </div>
        {isLeader && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search assignments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '2.5rem' }}
        />
      </div>

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
            <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">No assignments found</p>
          </CardContent>
        </Card>
                  )}
                </div>

      {/* Dialogs */}
      {isLeader && (
        <CreateAssignmentDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSuccess={handleCreateAssignment}
        />
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
    </div>
  );
}
