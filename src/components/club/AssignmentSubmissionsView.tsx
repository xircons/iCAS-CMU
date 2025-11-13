import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { useClub } from "../../contexts/ClubContext";
import { assignmentApi, Assignment, AssignmentSubmission } from "../../features/assignment/api/assignmentApi";
import { GradeSubmissionDialog } from "./GradeSubmissionDialog";
import { BulkGradeDialog } from "./BulkGradeDialog";
import { FilePreview } from "./FilePreview";
import { 
  Users, 
  Search, 
  FileText, 
  CheckCircle, 
  Clock,
  Award,
  Download,
  Eye,
  CheckSquare,
  Square
} from "lucide-react";
import { Checkbox } from "../ui/checkbox";

// Helper function to truncate file names
const truncateFileName = (fileName: string, maxLength: number = 30): string => {
  if (fileName.length <= maxLength) return fileName;
  const extension = fileName.substring(fileName.lastIndexOf('.'));
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3);
  return `${truncatedName}...${extension}`;
};

interface AssignmentSubmissionsViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment;
}

export function AssignmentSubmissionsView({ 
  open, 
  onOpenChange, 
  assignment 
}: AssignmentSubmissionsViewProps) {
  const { clubId } = useClub();
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<Set<number>>(new Set());
  const [isBulkGradeDialogOpen, setIsBulkGradeDialogOpen] = useState(false);

  useEffect(() => {
    if (open && assignment) {
      fetchSubmissions();
    }
  }, [open, assignment]);

  const fetchSubmissions = async () => {
    if (!clubId) return;

    try {
      setIsLoading(true);
      const data = await assignmentApi.getAssignmentSubmissions(clubId, assignment.id);
      setSubmissions(data);
    } catch (error: any) {
      console.error('Error fetching submissions:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradeSuccess = () => {
    setIsGradeDialogOpen(false);
    setSelectedSubmission(null);
    setSelectedSubmissionIds(new Set());
    fetchSubmissions();
  };

  const handleBulkGradeSuccess = () => {
    setIsBulkGradeDialogOpen(false);
    setSelectedSubmissionIds(new Set());
    fetchSubmissions();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredSubmissions = submissions.filter((submission) =>
    submission.userFirstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    submission.userLastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    submission.userEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const gradedCount = submissions.filter(s => s.gradedAt).length;
  const avgScore = submissions.length > 0 && assignment.maxScore
    ? (submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length).toFixed(1)
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Submissions for: {assignment.title}</DialogTitle>
            <DialogDescription>
              View and grade student submissions
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading submissions...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Submissions</CardDescription>
                    <CardTitle className="text-3xl">{submissions.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Graded</CardDescription>
                    <CardTitle className="text-3xl">{gradedCount}</CardTitle>
                  </CardHeader>
                </Card>
                {assignment.maxScore && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>Average Score</CardDescription>
                      <CardTitle className="text-3xl">{avgScore || '0'}</CardTitle>
                    </CardHeader>
                  </Card>
                )}
              </div>

              {/* Search and Bulk Actions */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>

                {/* Bulk Actions Toolbar */}
                {selectedSubmissionIds.size > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-md border">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {selectedSubmissionIds.size} selected
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSubmissionIds(new Set());
                        }}
                      >
                        Clear Selection
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setIsBulkGradeDialogOpen(true)}
                      >
                        Bulk Grade
                      </Button>
                    </div>
                  </div>
                )}

                {/* Select All */}
                {filteredSubmissions.length > 0 && (
                  <div className="flex items-center gap-2 p-2 border rounded-md">
                    <Checkbox
                      checked={selectedSubmissionIds.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSubmissionIds(new Set(filteredSubmissions.map(s => s.id)));
                        } else {
                          setSelectedSubmissionIds(new Set());
                        }
                      }}
                    />
                    <label className="text-sm font-medium cursor-pointer">
                      Select All ({filteredSubmissions.length})
                    </label>
                  </div>
                )}
              </div>

              {/* Submissions List */}
              {filteredSubmissions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {submissions.length === 0 ? 'No submissions yet' : 'No matching submissions'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredSubmissions.map((submission) => (
                    <Card key={submission.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Checkbox
                              checked={selectedSubmissionIds.has(submission.id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedSubmissionIds);
                                if (checked) {
                                  newSet.add(submission.id);
                                } else {
                                  newSet.delete(submission.id);
                                }
                                setSelectedSubmissionIds(newSet);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base">
                                {submission.userFirstName} {submission.userLastName}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {submission.userEmail}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {submission.gradedAt ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Graded
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            <Badge variant="outline">
                              {submission.submissionType === 'text' ? 'Text' : 'File'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Submitted: {formatDate(submission.submittedAt)}</span>
                          </div>
                          {submission.gradedAt && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              <span>Graded: {formatDate(submission.gradedAt)}</span>
                            </div>
                          )}
                        </div>

                        {submission.submissionType === 'text' && submission.textContent && (
                          <div className="p-3 bg-muted rounded-md">
                            <div 
                              className="text-sm prose prose-sm max-w-none line-clamp-3"
                              dangerouslySetInnerHTML={{ __html: submission.textContent }}
                            />
                          </div>
                        )}

                        {submission.submissionType === 'file' && submission.fileName && (
                          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm flex-1 truncate" title={submission.fileName}>{truncateFileName(submission.fileName)}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (submission.filePath) {
                                  window.open(assignmentApi.getFileUrl(submission.filePath), '_blank');
                                }
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        )}

                        {submission.score !== undefined && submission.score !== null && assignment.maxScore && (
                          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-md">
                            <Award className="h-5 w-5 text-primary" />
                            <span className="font-medium">
                              Score: {submission.score}/{assignment.maxScore}
                            </span>
                          </div>
                        )}

                        {submission.comment && (
                          <div className="p-3 bg-muted rounded-md">
                            <p className="text-sm font-medium">Feedback:</p>
                            <p className="text-sm text-muted-foreground mt-1">{submission.comment}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {submission.submissionType === 'text' && submission.textContent && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setIsPreviewOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Full Text
                            </Button>
                          )}
                          {submission.submissionType === 'file' && submission.filePath && 
                           submission.fileMimeType?.includes('pdf') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setIsPreviewOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview PDF
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setIsGradeDialogOpen(true);
                            }}
                          >
                            {submission.gradedAt ? 'Update Grade' : 'Grade Submission'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Grade Dialogs */}
      {selectedSubmission && (
        <>
          <GradeSubmissionDialog
            open={isGradeDialogOpen}
            onOpenChange={setIsGradeDialogOpen}
            assignment={assignment}
            submission={selectedSubmission}
            onSuccess={handleGradeSuccess}
          />

          {/* File/Text Preview Dialog */}
          <FilePreview
            open={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
            submission={selectedSubmission}
          />
        </>
      )}

      {/* Bulk Grade Dialog */}
      {selectedSubmissionIds.size > 0 && (
        <BulkGradeDialog
          open={isBulkGradeDialogOpen}
          onOpenChange={setIsBulkGradeDialogOpen}
          assignment={assignment}
          submissionIds={Array.from(selectedSubmissionIds)}
          onSuccess={handleBulkGradeSuccess}
        />
      )}
    </>
  );
}

