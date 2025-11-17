import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage, getDiceBearAvatar } from "../ui/avatar";
import { 
  ArrowLeft, 
  Clock, 
  FileText, 
  Award,
  CheckCircle,
  Download,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useClub } from "../../contexts/ClubContext";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { assignmentApi, Assignment, AssignmentSubmission } from "../../features/assignment/api/assignmentApi";
import { GradeSubmissionDialog } from "./GradeSubmissionDialog";

// Helper function to truncate file names
const truncateFileName = (fileName: string, maxLength: number = 30): string => {
  if (fileName.length <= maxLength) return fileName;
  const extension = fileName.substring(fileName.lastIndexOf('.'));
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3);
  return `${truncatedName}...${extension}`;
};

export function MemberSubmissionDetailView() {
  const { clubId, assignmentId, submissionId } = useParams<{ 
    clubId: string; 
    assignmentId: string; 
    submissionId: string;
  }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);

  const isLeader = user?.role === 'leader' || user?.role === 'admin';

  useEffect(() => {
    if (clubId && assignmentId && submissionId) {
      fetchData();
    }
  }, [clubId, assignmentId, submissionId]);

  const fetchData = async () => {
    if (!clubId || !assignmentId || !submissionId) return;

    try {
      setIsLoading(true);
      // Fetch assignment
      const assignmentData = await assignmentApi.getAssignment(parseInt(clubId), parseInt(assignmentId));
      setAssignment(assignmentData);
      
      // Fetch submission
      const submissionData = await assignmentApi.getSubmission(
        parseInt(clubId),
        parseInt(assignmentId),
        parseInt(submissionId)
      );
      setSubmission(submissionData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch submission');
      navigate(`/club/${clubId}/assignment/${assignmentId}`);
    } finally {
      setIsLoading(false);
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

  const handleGradeSuccess = () => {
    setIsGradeDialogOpen(false);
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading submission...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!assignment || !submission) {
    return (
      <div className="p-4 md:p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl mb-2">Submission not found</h2>
              <Button onClick={() => navigate(`/club/${clubId}/assignment/${assignmentId}`)} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Assignment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if submission is late
  let dueDate: Date;
  if (assignment.dueDate.includes(' ')) {
    const [datePart, timePart] = assignment.dueDate.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
    dueDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  } else {
    dueDate = new Date(assignment.dueDate);
  }
  const submittedDate = new Date(submission.submittedAt);
  const isLate = submittedDate > dueDate;

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/club/${clubId}/assignment/${assignmentId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Member Info */}
      <Card>
        <CardHeader>
          <CardTitle>Member Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage 
                src={getDiceBearAvatar(`${submission.userFirstName || ''} ${submission.userLastName || ''}`)} 
              />
              <AvatarFallback>
                {(submission.userFirstName || '').substring(0, 1)}{(submission.userLastName || '').substring(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {submission.userFirstName} {submission.userLastName}
              </p>
              <p className="text-sm text-muted-foreground">{submission.userEmail}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submission Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Submission Details</CardTitle>
            <div className="flex gap-2">
              {isLate && (
                <Badge variant="destructive">Late Submission</Badge>
              )}
              {submission.gradedAt ? (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Graded
                </Badge>
              ) : (
                <Badge variant="secondary">Pending</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Submitted:</span>
              <span className="font-medium">{formatDate(submission.submittedAt)}</span>
            </div>
            {submission.gradedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Graded:</span>
                <span className="font-medium">{formatDate(submission.gradedAt)}</span>
              </div>
            )}
          </div>

          {/* Submission Content */}
          {submission.submissionType === 'text' && submission.textContent && (
            <div>
              <h3 className="text-sm font-medium mb-2">Text Submission</h3>
              <div 
                className="prose prose-sm max-w-none bg-muted p-4 rounded-md"
                dangerouslySetInnerHTML={{ __html: submission.textContent }}
              />
            </div>
          )}

          {submission.submissionType === 'file' && submission.filePath && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">File Submission</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = assignmentApi.getFileUrl(submission.filePath!);
                    link.download = submission.fileName || 'file';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="p-3 bg-muted rounded-md mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm flex-1 truncate" title={submission.fileName || 'File'}>{truncateFileName(submission.fileName || 'File')}</span>
                  {submission.fileSize && (
                    <span className="text-xs text-muted-foreground">
                      ({(submission.fileSize / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  )}
                </div>
              </div>

              {/* Inline Preview */}
              {(() => {
                const fileUrl = assignmentApi.getFileUrl(submission.filePath);
                const isPdf = submission.fileMimeType?.includes('pdf');
                const isImage = submission.fileMimeType?.startsWith('image/');

                if (isPdf && fileUrl) {
                  return (
                    <div className="border rounded-lg overflow-hidden" style={{ minHeight: '1200px' }}>
                      <iframe
                        src={fileUrl}
                        className="w-full h-full border-0"
                        style={{ minHeight: '1200px', height: '100%' }}
                        title="PDF Preview"
                      />
                    </div>
                  );
                }

                if (isImage && fileUrl) {
                  return (
                    <div className="flex items-center justify-center p-6 border rounded-lg bg-muted/30" style={{ minHeight: '400px' }}>
                      <img
                        src={fileUrl}
                        alt={submission.fileName || 'Image preview'}
                        className="max-w-full max-h-[70vh] object-contain rounded-lg"
                      />
                    </div>
                  );
                }

                return (
                  <div className="py-12 text-center border rounded-lg bg-muted/30" style={{ minHeight: '400px' }}>
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      Preview not available for this file type
                    </p>
                    {fileUrl && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(fileUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in New Tab
                      </Button>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Grade/Score */}
          {submission.gradedAt && (
            <div className="pt-4 border-t space-y-4">
              {submission.score !== undefined && submission.score !== null && assignment.maxScore && (
                <div className="p-3 bg-primary/5 rounded-md border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className="text-lg font-semibold">
                        {submission.score}/{assignment.maxScore} points
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {submission.comment && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Feedback</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-md">
                    {submission.comment}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade Button (for leaders) */}
      {isLeader && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={() => setIsGradeDialogOpen(true)}>
            {submission.gradedAt ? 'Update Grade' : 'Grade Submission'}
          </Button>
        </div>
      )}

      {/* Grade Dialog */}
      {isLeader && assignment && submission && (
        <GradeSubmissionDialog
          open={isGradeDialogOpen}
          onOpenChange={setIsGradeDialogOpen}
          assignment={assignment}
          submission={submission}
          onSuccess={handleGradeSuccess}
        />
      )}
    </div>
  );
}

