import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { RichTextEditor } from "../ui/rich-text-editor";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { toast } from "sonner";
import { useClub } from "../../contexts/ClubContext";
import { assignmentApi, Assignment, AssignmentSubmission } from "../../features/assignment/api/assignmentApi";
import { FileText, Upload, Check, Clock, Award, Info } from "lucide-react";

// Helper function to truncate file names
const truncateFileName = (fileName: string, maxLength: number = 30): string => {
  if (fileName.length <= maxLength) return fileName;
  const extension = fileName.substring(fileName.lastIndexOf('.'));
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3);
  return `${truncatedName}...${extension}`;
};

interface SubmitAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment;
  onSuccess: () => void;
}

export function SubmitAssignmentDialog({ 
  open, 
  onOpenChange, 
  assignment, 
  onSuccess 
}: SubmitAssignmentDialogProps) {
  const { clubId } = useClub();
  const [isLoading, setIsLoading] = useState(false);
  const [submissionType, setSubmissionType] = useState<'text' | 'file'>('text');
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<AssignmentSubmission | null>(null);
  const [isLoadingSubmission, setIsLoadingSubmission] = useState(true);

  useEffect(() => {
    if (open && assignment) {
      fetchExistingSubmission();
    }
  }, [open, assignment]);

  const fetchExistingSubmission = async () => {
    if (!clubId) return;

    try {
      setIsLoadingSubmission(true);
      const submission = await assignmentApi.getUserSubmission(clubId, assignment.id);
      setExistingSubmission(submission);
      
      if (submission) {
        setSubmissionType(submission.submissionType);
        if (submission.submissionType === 'text' && submission.textContent) {
          setTextContent(submission.textContent);
        }
      }
    } catch (error: any) {
      console.error('Error fetching submission:', error);
    } finally {
      setIsLoadingSubmission(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clubId) {
      toast.error("Club not found");
      return;
    }

    // Check if assignment is graded (can't update if graded)
    if (existingSubmission?.gradedAt) {
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
      if (!selectedFile && !existingSubmission?.filePath) {
        toast.error("Please select a file to upload");
        return;
      }
    }

    try {
      setIsLoading(true);

      if (submissionType === 'text') {
        await assignmentApi.submitAssignmentText(clubId, assignment.id, textContent);
      } else {
        if (selectedFile) {
          await assignmentApi.submitAssignmentFile(clubId, assignment.id, selectedFile);
        } else {
          toast.error("No file selected");
          return;
        }
      }

      toast.success(existingSubmission ? "Submission updated successfully!" : "Submission submitted successfully!");
      
      // Reset form
      setTextContent("");
      setSelectedFile(null);
      
      onSuccess();
    } catch (error: any) {
      console.error("Error submitting assignment:", error);
      toast.error(error.response?.data?.message || "Failed to submit assignment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setTextContent("");
    setSelectedFile(null);
    onOpenChange(false);
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

  const canSubmit = new Date(assignment.availableDate) <= new Date() && !existingSubmission?.gradedAt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{assignment.title}</DialogTitle>
          <DialogDescription>
            {existingSubmission ? "View or update your submission" : "Submit your assignment"}
          </DialogDescription>
        </DialogHeader>

        {isLoadingSubmission ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Assignment Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assignment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignment.description && (
                  <p className="text-sm text-muted-foreground">{assignment.description}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
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
                </div>
              </CardContent>
            </Card>

            {/* Existing Submission Info */}
            {existingSubmission && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Your Submission</CardTitle>
                    <Badge variant="secondary">
                      <Check className="h-3 w-3 mr-1" />
                      Submitted
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Submitted:</span>
                      <p className="font-medium mt-0.5">{formatDate(existingSubmission.submittedAt)}</p>
                    </div>
                    {existingSubmission.gradedAt && (
                      <div>
                        <span className="text-muted-foreground">Graded:</span>
                        <p className="font-medium text-green-600 mt-0.5 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          {formatDate(existingSubmission.gradedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {existingSubmission.gradedAt && (
                    <>
                      {existingSubmission.score !== undefined && existingSubmission.score !== null && (
                        <div className="p-3 bg-primary/5 rounded-md border border-primary/20">
                          <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Score</p>
                              <p className="text-lg font-semibold">
                                {existingSubmission.score}/{assignment.maxScore} points
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {existingSubmission.comment && (
                        <div className="p-3 bg-muted rounded-md border">
                          <p className="font-medium text-sm mb-1.5">Feedback</p>
                          <p className="text-sm text-muted-foreground">{existingSubmission.comment}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Show current submission content */}
                  {existingSubmission.submissionType === 'text' && existingSubmission.textContent && (
                    <div className="p-3 bg-muted rounded-md border">
                      <p className="font-medium text-sm mb-2">Your Text Submission</p>
                      <div 
                        className="text-sm prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: existingSubmission.textContent }}
                      />
                    </div>
                  )}
                  
                  {existingSubmission.submissionType === 'file' && existingSubmission.fileName && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm flex-1 truncate" title={existingSubmission.fileName}>{truncateFileName(existingSubmission.fileName)}</span>
                      {existingSubmission.filePath && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(assignmentApi.getFileUrl(existingSubmission.filePath!), '_blank')}
                        >
                          Download
                        </Button>
                      )}
                    </div>
                  )}

                  {existingSubmission.gradedAt && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-800 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        This submission has been graded and cannot be updated.
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
                  <CardTitle className="text-base">
                    {existingSubmission ? "Update Submission" : "New Submission"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label className="mb-3 block">Choose how you want to submit your work</Label>
                      
                      <Tabs value={submissionType} onValueChange={(value: any) => setSubmissionType(value)}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="text">
                            <FileText className="h-4 w-4 mr-2" />
                            Text Submission
                          </TabsTrigger>
                          <TabsTrigger value="file">
                            <Upload className="h-4 w-4 mr-2" />
                            File Upload
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="text" className="mt-4">
                          <RichTextEditor
                            content={textContent}
                            onChange={setTextContent}
                            placeholder="Write your submission here..."
                          />
                        </TabsContent>

                        <TabsContent value="file" className="mt-4 space-y-4">
                          <div>
                            <input
                              type="file"
                              onChange={handleFileChange}
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,image/*"
                              className="block w-full text-sm text-muted-foreground
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-medium
                                file:bg-primary file:text-primary-foreground
                                hover:file:bg-primary/90
                                cursor-pointer"
                            />
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              Supported: PDF, Word, Excel, PowerPoint, Text, Images, ZIP, RAR (Max 10MB)
                            </p>
                          </div>
                          
                          {selectedFile && (
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm flex-1 truncate" title={selectedFile.name}>{truncateFileName(selectedFile.name)}</span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-end pt-4 border-t">
                      <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Submitting..." : existingSubmission ? "Update Submission" : "Submit Assignment"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {!canSubmit && !existingSubmission && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">This assignment is not yet available for submission.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

