import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { RichTextEditor } from "../ui/rich-text-editor";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage, getDiceBearAvatar } from "../ui/avatar";
import { 
  ArrowLeft, 
  Clock, 
  FileText, 
  Users, 
  Calendar,
  Upload,
  Award,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Edit
} from "lucide-react";
import { toast } from "sonner";
import { useClub } from "../../contexts/ClubContext";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { assignmentApi, Assignment, AssignmentSubmission } from "../../features/assignment/api/assignmentApi";
import { clubApi } from "../../features/club/api/clubApi";
import { FilePreview } from "./FilePreview";
import { EditAssignmentDialog } from "./EditAssignmentDialog";
import { AssignmentProgressCard } from "./AssignmentProgressCard";
import { AssignmentComments } from "./AssignmentComments";

// Helper function to truncate file names
const truncateFileName = (fileName: string, maxLength: number = 30): string => {
  if (fileName.length <= maxLength) return fileName;
  const extension = fileName.substring(fileName.lastIndexOf('.'));
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3);
  return `${truncatedName}...${extension}`;
};

interface ClubMember {
  id: number;
  userId: number;
  role: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
}

interface MemberWithSubmission extends ClubMember {
  submission?: AssignmentSubmission;
  isLate?: boolean;
}

export function AssignmentDetailView() {
  const { clubId, assignmentId } = useParams<{ clubId: string; assignmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Member view states
  const [submissionType, setSubmissionType] = useState<'text' | 'file'>('text');
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Leader view states
  const [members, setMembers] = useState<MemberWithSubmission[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const isLeader = user?.role === 'leader' || user?.role === 'admin';
  const hasSubmission = assignment?.userSubmission !== null && assignment?.userSubmission !== undefined;
  const isGraded = hasSubmission && assignment?.userSubmission?.gradedAt !== null;

  useEffect(() => {
    if (clubId && assignmentId) {
      fetchAssignment();
    }
  }, [clubId, assignmentId]);

  useEffect(() => {
    if (clubId && assignmentId && assignment) {
      if (isLeader) {
        fetchMembersWithSubmissions();
      } else {
        // For members, fetch their submission to populate form
        fetchUserSubmission();
      }
    }
  }, [clubId, assignmentId, assignment, isLeader]);

  const fetchAssignment = async () => {
    if (!clubId || !assignmentId) return;

    try {
      setIsLoading(true);
      const data = await assignmentApi.getAssignment(parseInt(clubId), parseInt(assignmentId));
      setAssignment(data);
    } catch (error: any) {
      console.error('Error fetching assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch assignment');
      navigate(`/club/${clubId}/assignments`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserSubmission = async () => {
    if (!clubId || !assignmentId) return;
    
    try {
      const submission = await assignmentApi.getUserSubmission(parseInt(clubId), parseInt(assignmentId));
      if (submission) {
        setSubmissionType(submission.submissionType);
        if (submission.submissionType === 'text' && submission.textContent) {
          setTextContent(submission.textContent);
        }
      }
    } catch (error: any) {
      // User may not have submitted yet, which is fine
      console.log('No submission found');
    }
  };

  const fetchMembersWithSubmissions = async () => {
    if (!clubId || !assignmentId) return;

    try {
      setIsLoadingMembers(true);
      // Fetch all members
      const membersData = await clubApi.getClubMembers(parseInt(clubId));
      // Filter out leaders
      const nonLeaderMembers = membersData.filter((m: ClubMember) => m.role !== 'leader');
      
      // Fetch all submissions
      const submissions = await assignmentApi.getAssignmentSubmissions(parseInt(clubId), parseInt(assignmentId));
      
      // Parse due date for late submission check
      let dueDate: Date;
      if (assignment?.dueDate) {
        if (assignment.dueDate.includes(' ')) {
          const [datePart, timePart] = assignment.dueDate.split(' ');
          const [year, month, day] = datePart.split('-').map(Number);
          const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
          dueDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
        } else {
          dueDate = new Date(assignment.dueDate);
        }
      } else {
        dueDate = new Date();
      }
      
      // Combine members with their submissions
      const membersWithSubmissions: MemberWithSubmission[] = nonLeaderMembers.map((member: ClubMember) => {
        const submission = submissions.find((s: AssignmentSubmission) => s.userId === member.userId);
        let isLate = false;
        if (submission) {
          const submittedDate = new Date(submission.submittedAt);
          isLate = submittedDate > dueDate;
        }
        return {
          ...member,
          submission,
          isLate
        };
      });
      
      setMembers(membersWithSubmissions);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDropAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clubId || !assignmentId) {
      toast.error("Club or assignment not found");
      return;
    }

    // Check if assignment is graded (can't update if graded)
    if (hasSubmission && assignment?.userSubmission?.gradedAt) {
      toast.error("Cannot update submission after it has been graded");
      return;
    }

    // Validate submission
    if (submissionType === 'text') {
      if (!textContent.trim() || textContent === '<p></p>') {
        toast.error("Please enter some text for your submission");
        return;
      }
    } else {
      if (!selectedFile && !assignment?.userSubmission?.filePath) {
        toast.error("Please select a file to upload");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      if (submissionType === 'text') {
        await assignmentApi.submitAssignmentText(parseInt(clubId), parseInt(assignmentId), textContent);
      } else {
        if (selectedFile) {
          await assignmentApi.submitAssignmentFile(parseInt(clubId), parseInt(assignmentId), selectedFile);
        } else {
          toast.error("No file selected");
          return;
        }
      }

      toast.success(hasSubmission ? "Submission updated successfully!" : "Submission submitted successfully!");
      
      // Reset form
      setTextContent("");
      setSelectedFile(null);
      
      // Refresh assignment data
      await fetchAssignment();
      if (!isLeader) {
        await fetchUserSubmission();
      }
    } catch (error: any) {
      console.error("Error submitting assignment:", error);
      toast.error(error.response?.data?.message || "Failed to submit assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    let date: Date;
    if (dateString.includes(' ')) {
      const [datePart, timePart] = dateString.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
      date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
    } else {
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

  const getStatusBadge = () => {
    if (!assignment) return null;
    
    const now = new Date();
    let dueDate: Date;
    if (assignment.dueDate.includes(' ')) {
      const [datePart, timePart] = assignment.dueDate.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
      dueDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
    } else {
      dueDate = new Date(assignment.dueDate);
    }
    
    if (isGraded) {
      return <Badge className="bg-green-100 text-green-700">Graded</Badge>;
    } else if (hasSubmission) {
      return <Badge className="bg-blue-100 text-blue-700">Submitted</Badge>;
    } else if (dueDate < now) {
      return <Badge className="bg-red-100 text-red-700">Overdue</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-700">Current</Badge>;
    }
  };

  const getAssignmentStatusBadge = () => {
    if (!assignment) return null;
    
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
    
    if (dueDate < now) {
      return <Badge className="bg-red-100 text-red-700">Past</Badge>;
    } else if (availableDate <= now) {
      return <Badge className="bg-yellow-100 text-yellow-700">Current</Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-700">Upcoming</Badge>;
    }
  };

  const canSubmit = assignment && new Date(assignment.availableDate) <= new Date() && !assignment.userSubmission?.gradedAt;

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading assignment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-4 md:p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl mb-2">Assignment not found</h2>
              <Button onClick={() => navigate(`/club/${clubId}/assignments`)} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Assignments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // MEMBER VIEW
  if (!isLeader) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/club/${clubId}/assignments`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Assignment Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-2xl font-bold">{assignment.title}</CardTitle>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Due:</span>
              <span className="font-medium">{formatDate(assignment.dueDate)}</span>
            </div>
            {assignment.maxScore !== null && assignment.maxScore !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Max Score:</span>
                <span className="font-medium">{assignment.maxScore} points</span>
              </div>
            )}
            {hasSubmission && assignment.userSubmission?.score !== undefined && assignment.userSubmission.score !== null && (
              <div className="flex items-center gap-2 text-sm">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Your Score:</span>
                <span className="font-medium text-primary">
                  {assignment.userSubmission.score}/{assignment.maxScore} points
                </span>
              </div>
            )}
            {assignment.attachmentPath && assignment.attachmentName && (
              <div className="pt-2">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm flex-1 truncate" title={assignment.attachmentName}>{truncateFileName(assignment.attachmentName)}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (assignment.attachmentPath) {
                        window.open(assignmentApi.getFileUrl(assignment.attachmentPath), '_blank');
                      }
                    }}
                    className="flex-shrink-0"
                  >
                    Download
                  </Button>
                </div>
              </div>
            )}
            {assignment.description && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assignment.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submission Details */}
        {hasSubmission && (
          <Card>
            <CardHeader>
              <CardTitle>Your Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignment.userSubmission?.textContent && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Text Submission</h3>
                  <div 
                    className="prose prose-sm max-w-none bg-muted p-4 rounded-md"
                    dangerouslySetInnerHTML={{ __html: assignment.userSubmission.textContent }}
                  />
                </div>
              )}
              {assignment.userSubmission?.filePath && (
                <div>
                  <h3 className="text-sm font-medium mb-2">File Submission</h3>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm flex-1 truncate" title={assignment.userSubmission.fileName || 'File'}>{truncateFileName(assignment.userSubmission.fileName || 'File')}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPreviewOpen(true)}
                      className="flex-shrink-0"
                    >
                      Preview
                    </Button>
                  </div>
                </div>
              )}
              {assignment.userSubmission?.comment && (
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-2">Feedback</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-md">
                    {assignment.userSubmission.comment}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submission Form */}
        {canSubmit && (
          <Card>
            <CardHeader>
              <CardTitle>Choose a submission type</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Submission Type Selection */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant={submissionType === 'text' ? 'default' : 'outline'}
                    className="flex-1 flex items-center justify-center gap-2"
                    onClick={() => setSubmissionType('text')}
                  >
                    <FileText className="h-4 w-4" />
                    Rich Text
                  </Button>
                  <Button
                    type="button"
                    variant={submissionType === 'file' ? 'default' : 'outline'}
                    className="flex-1 flex items-center justify-center gap-2"
                    onClick={() => setSubmissionType('file')}
                  >
                    <Upload className="h-4 w-4" />
                    Upload File
                  </Button>
                </div>

                {/* Rich Text Editor */}
                {submissionType === 'text' && (
                  <div className="mt-4">
                    <RichTextEditor
                      content={textContent}
                      onChange={setTextContent}
                      minHeight="300px"
                    />
                  </div>
                )}

                {/* File Upload */}
                {submissionType === 'file' && (
                  <div className="mt-4 space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,image/*"
                      className="hidden"
                    />
                    
                    {selectedFile ? (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm flex-1 truncate" title={selectedFile.name}>{truncateFileName(selectedFile.name)}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedFile(null)}
                          className="h-6 w-6 p-0"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={handleDropAreaClick}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="text-center border-2 border-dashed rounded-md bg-muted/30 cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
                        style={{ paddingTop: '5rem', paddingBottom: '5rem', paddingLeft: '3rem', paddingRight: '3rem' }}
                      >
                        <Upload className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                        <p className="text-base font-medium mb-2">Attach file here</p>
                        <p className="text-sm text-muted-foreground">Click to browse or drag and drop</p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        .pdf, .docx, .xlsx, .pptx, .txt, .jpg, .jpeg, .png, .zip, .rar (Max 10 MB)
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t flex justify-end">
                  <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting ? "Submitting..." : hasSubmission ? "Update Submission" : "Submit Assignment"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* File Preview Dialog */}
        {hasSubmission && assignment.userSubmission && (
          <FilePreview
            open={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
            submission={assignment.userSubmission}
          />
        )}

        {/* Comments Section */}
        <AssignmentComments assignmentId={assignment.id} />
      </div>
    );
  }

  // LEADER VIEW
  const submittedMembers = members.filter(m => m.submission && !m.isLate);
  const notSubmittedMembers = members.filter(m => !m.submission);
  const lateSubmissions = members.filter(m => m.submission && m.isLate);

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/club/${clubId}/assignments`)}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditDialogOpen(true)}
          className="w-full sm:w-auto"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Assignment
        </Button>
      </div>

      {/* Assignment Info */}
      <Card>
        <CardHeader className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">{assignment.title}</CardTitle>
            {getAssignmentStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-base font-bold">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-semibold">Due:</span>
            <span className="text-sm font-semibold">{formatDate(assignment.dueDate)}</span>
          </div>
          {assignment.maxScore !== null && assignment.maxScore !== undefined && (
            <div className="flex items-center gap-2 text-base font-bold">
              <Award className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground font-semibold">Max Score:</span>
              <span className="font-bold">{assignment.maxScore} points</span>
            </div>
          )}
          {assignment.description && (
            <div className="pt-4 border-t">
              <h3 className="text-base font-bold mb-2">Description</h3>
              <p className="text-base font-semibold text-muted-foreground whitespace-pre-wrap">{assignment.description}</p>
            </div>
          )}
          {assignment.attachmentPath && assignment.attachmentName && (
            <div className="pt-4 border-t">
              <h3 className="text-base font-bold mb-2">Attachment</h3>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <FileText className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm flex-1 truncate" title={assignment.attachmentName}>{assignment.attachmentName}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (assignment.attachmentPath) {
                      window.open(assignmentApi.getFileUrl(assignment.attachmentPath), '_blank');
                    }
                  }}
                  className="flex-shrink-0"
                >
                  Download
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Card - Leader View */}
      {isLeader && members.length > 0 && (
        <AssignmentProgressCard
          totalMembers={members.length}
          submittedCount={submittedMembers.length + lateSubmissions.length}
          gradedCount={members.filter(m => m.submission?.gradedAt).length}
          averageScore={
            assignment.maxScore && members.filter(m => m.submission?.score !== undefined && m.submission?.score !== null).length > 0
              ? members
                  .filter(m => m.submission?.score !== undefined && m.submission?.score !== null)
                  .reduce((sum, m) => sum + (m.submission?.score || 0), 0) /
                members.filter(m => m.submission?.score !== undefined && m.submission?.score !== null).length
              : undefined
          }
          maxScore={assignment.maxScore}
          lateCount={lateSubmissions.length}
        />
      )}

      {/* Member Submissions */}
      {isLoadingMembers ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading members...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Submitted On Time */}
          {submittedMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Submitted ({submittedMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {submittedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 hover:shadow-sm rounded-md cursor-pointer transition-all duration-200 border border-transparent hover:border-border"
                      onClick={() => navigate(`/club/${clubId}/assignment/${assignmentId}/submission/${member.submission?.id}`)}
                    >
                      <Avatar>
                        <AvatarImage 
                          src={member.user.avatar || getDiceBearAvatar(`${member.user.firstName} ${member.user.lastName}`)} 
                        />
                        <AvatarFallback>
                          {member.user.firstName.substring(0, 1)}{member.user.lastName.substring(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                      </div>
                      {member.submission?.gradedAt && (
                        <Badge variant="secondary" className="text-xs">
                          Graded
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Late Submissions */}
          {lateSubmissions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Submitted Late ({lateSubmissions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lateSubmissions.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 hover:shadow-sm rounded-md cursor-pointer transition-all duration-200 border border-transparent hover:border-border"
                      onClick={() => navigate(`/club/${clubId}/assignment/${assignmentId}/submission/${member.submission?.id}`)}
                    >
                      <Avatar>
                        <AvatarImage 
                          src={member.user.avatar || getDiceBearAvatar(`${member.user.firstName} ${member.user.lastName}`)} 
                        />
                        <AvatarFallback>
                          {member.user.firstName.substring(0, 1)}{member.user.lastName.substring(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        Late
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Not Submitted */}
          {notSubmittedMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  Not Submitted ({notSubmittedMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {notSubmittedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 hover:shadow-sm rounded-md transition-all duration-200 border border-transparent hover:border-border"
                    >
                      <Avatar>
                        <AvatarImage 
                          src={member.user.avatar || getDiceBearAvatar(`${member.user.firstName} ${member.user.lastName}`)} 
                        />
                        <AvatarFallback>
                          {member.user.firstName.substring(0, 1)}{member.user.lastName.substring(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        No Submission
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {members.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No members found</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <EditAssignmentDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        assignment={assignment}
        onSuccess={async () => {
          setIsEditDialogOpen(false);
          // Wait for dialog to close before fetching
          await fetchAssignment();
          fetchMembersWithSubmissions();
        }}
      />

      {/* Comments Section */}
      {assignment && <AssignmentComments assignmentId={assignment.id} />}
    </div>
  );
}
