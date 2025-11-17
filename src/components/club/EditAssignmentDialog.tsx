import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Alert, AlertDescription } from "../ui/alert";
import { toast } from "sonner";
import { useClub } from "../../contexts/ClubContext";
import { assignmentApi, Assignment, UpdateAssignmentRequest } from "../../features/assignment/api/assignmentApi";
import { Calendar, FileText, Award, AlertTriangle, Upload, X, Info, Eye, EyeOff } from "lucide-react";
import { useRef } from "react";

interface EditAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment | null;
  onSuccess: (updatedAssignment?: Assignment) => void;
}

// Helper function to truncate file names
const truncateFileName = (fileName: string, maxLength: number = 30): string => {
  if (fileName.length <= maxLength) return fileName;
  const extension = fileName.substring(fileName.lastIndexOf('.'));
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3);
  return `${truncatedName}...${extension}`;
};

export function EditAssignmentDialog({ open, onOpenChange, assignment, onSuccess }: EditAssignmentDialogProps) {
  const { clubId } = useClub();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UpdateAssignmentRequest>({
    title: "",
    description: "",
    maxScore: undefined,
    availableDate: "",
    dueDate: "",
    isVisible: true,
  });
  const [titleError, setTitleError] = useState(false);
  const [availableDateError, setAvailableDateError] = useState(false);
  const [dueDateError, setDueDateError] = useState(false);
  const [maxScoreError, setMaxScoreError] = useState(false);
  const [hasSubmissions, setHasSubmissions] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDateChangeWarning, setShowDateChangeWarning] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // Load assignment data when dialog opens
  useEffect(() => {
    if (open && assignment) {
      console.log('EditAssignmentDialog: Loading assignment data', {
        id: assignment.id,
        attachmentPath: assignment.attachmentPath,
        attachmentName: assignment.attachmentName,
        attachmentMimeType: assignment.attachmentMimeType,
        attachments: assignment.attachments,
        attachmentsCount: assignment.attachments?.length || 0
      });
      
      // Convert MySQL DATETIME to datetime-local format
      // MySQL DATETIME is stored as UTC, so we need to parse it as UTC and convert to local
      const convertToLocalDateTime = (dateString: string): string => {
        if (!dateString) return "";
        
        // Parse MySQL DATETIME format: "YYYY-MM-DD HH:MM:SS" (stored as UTC)
        let date: Date;
        if (dateString.includes(' ')) {
          const [datePart, timePart] = dateString.split(' ');
          const [year, month, day] = datePart.split('-').map(Number);
          const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
          // Parse as UTC (since that's how it's stored in the database)
          date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
        } else {
          date = new Date(dateString);
        }
        
        // Convert UTC date to local time for datetime-local input
        // datetime-local expects local time, not UTC
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setFormData({
        title: assignment.title || "",
        description: assignment.description || "",
        maxScore: assignment.maxScore ?? undefined,
        availableDate: convertToLocalDateTime(assignment.availableDate),
        dueDate: convertToLocalDateTime(assignment.dueDate),
        isVisible: assignment.isVisible !== undefined ? assignment.isVisible : true,
      });

      // Check if assignment has submissions
      setHasSubmissions((assignment.submissionCount ?? 0) > 0);
      
      // Reset file selection when dialog opens
      setSelectedFiles([]);
    }
  }, [open, assignment]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        title: "",
        description: "",
        maxScore: undefined,
        availableDate: "",
        dueDate: "",
        isVisible: true,
      });
      setTitleError(false);
      setAvailableDateError(false);
      setDueDateError(false);
      setMaxScoreError(false);
      setHasSubmissions(false);
      setSelectedFiles([]);
    }
  }, [open]);

  const validateForm = () => {
    setTitleError(false);
    setAvailableDateError(false);
    setDueDateError(false);
    setMaxScoreError(false);

    let hasErrors = false;
    const now = new Date();

    // Validate title
    if (!formData.title?.trim()) {
      setTitleError(true);
      hasErrors = true;
      toast.error("Title is required");
      return false;
    }

    // Note: Allow dates in the past when editing (for flexibility)
    // Only validate date relationship, not that dates are in the past

    // Validate dates relationship
    if (formData.availableDate && formData.dueDate) {
      const available = new Date(formData.availableDate);
      const due = new Date(formData.dueDate);

      if (due <= available) {
        setDueDateError(true);
        hasErrors = true;
        toast.error("Due date must be after available date");
        return false;
      }
    }

    // Validate max score if provided
    if (formData.maxScore !== undefined && formData.maxScore !== null) {
      const score = Number(formData.maxScore);
      if (isNaN(score) || score < 0) {
        setMaxScoreError(true);
        hasErrors = true;
        toast.error("Max score must be a positive number");
        return false;
      }
    }

    return !hasErrors;
  };


  const submitUpdate = async () => {
    if (!clubId || !assignment) {
      toast.error("Club or assignment not found");
      return;
    }

    try {
      setIsLoading(true);

      // Convert datetime-local format to MySQL DATETIME format
      const convertToMySQLDateTime = (dateTimeLocal: string | undefined): string | undefined => {
        if (!dateTimeLocal) return undefined;
        
        const localDate = new Date(dateTimeLocal);
        const year = localDate.getUTCFullYear();
        const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(localDate.getUTCDate()).padStart(2, '0');
        const hours = String(localDate.getUTCHours()).padStart(2, '0');
        const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
        const seconds = String(localDate.getUTCSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      // Prepare update data - include all fields that have values
      const updateData: UpdateAssignmentRequest = {};
      
      // Title - always include if not empty (required field)
      if (formData.title !== undefined && formData.title.trim() !== '') {
        updateData.title = formData.title.trim();
      }
      // Description - include if provided (can be empty string, but send it)
      if (formData.description !== undefined) {
        updateData.description = formData.description.trim();
      }
      // MaxScore - include if provided and valid
      if (formData.maxScore !== undefined && formData.maxScore !== null && formData.maxScore !== '') {
        const maxScoreNum = Number(formData.maxScore);
        if (!isNaN(maxScoreNum) && maxScoreNum > 0) {
          updateData.maxScore = maxScoreNum;
        }
      }
      // Dates - always include if present (required fields)
      if (formData.availableDate && formData.availableDate.trim() !== '') {
        updateData.availableDate = convertToMySQLDateTime(formData.availableDate);
      }
      if (formData.dueDate && formData.dueDate.trim() !== '') {
        updateData.dueDate = convertToMySQLDateTime(formData.dueDate);
      }
      // isVisible - include if provided
      if (formData.isVisible !== undefined) {
        updateData.isVisible = formData.isVisible;
      }

      console.log('Frontend updateData:', updateData);
      console.log('Frontend selectedFiles:', selectedFiles);

      // Handle file upload - add new attachments
      const updatedAssignment = await assignmentApi.updateAssignment(
        clubId, 
        assignment.id, 
        updateData,
        selectedFiles.length > 0 ? selectedFiles : undefined
      );

      console.log('Update response assignment:', {
        id: updatedAssignment.id,
        attachmentPath: updatedAssignment.attachmentPath,
        attachmentName: updatedAssignment.attachmentName,
        attachmentMimeType: updatedAssignment.attachmentMimeType,
        attachments: updatedAssignment.attachments,
        attachmentsCount: updatedAssignment.attachments?.length || 0
      });

      toast.success("Assignment updated successfully!");
      setShowDateChangeWarning(false);
      setPendingSubmit(false);
      // Reset form state
      setSelectedFiles([]);
      // Close dialog first
      onOpenChange(false);
      // Pass the updated assignment to onSuccess so parent can use it directly
      onSuccess(updatedAssignment);
    } catch (error: any) {
      console.error("Error updating assignment:", error);
      toast.error(error.response?.data?.message || "Failed to update assignment");
      setPendingSubmit(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clubId || !assignment) {
      toast.error("Club or assignment not found");
      return;
    }

    if (!validateForm()) {
      return;
    }

    // Warn if editing dates with existing submissions
    if (hasSubmissions && (formData.availableDate || formData.dueDate)) {
      setPendingSubmit(true);
      setShowDateChangeWarning(true);
      return;
    }

    // Proceed with submission
    await submitUpdate();
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  if (!assignment) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[calc(100vw-1rem)] sm:max-w-3xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Assignment</DialogTitle>
          <DialogDescription>
            Update assignment details. Changes will be reflected immediately.
          </DialogDescription>
        </DialogHeader>

        {hasSubmissions && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This assignment has existing submissions. Changing dates may affect submission statuses.
            </AlertDescription>
          </Alert>
        )}

        <form id="edit-assignment-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="edit-title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-title"
                  placeholder="Assignment title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    setTitleError(false);
                  }}
                  required
                  aria-invalid={titleError}
                  className={`mt-1 ${
                    titleError
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500"
                      : ""
                  }`}
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Assignment description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="mt-1 resize-y"
                  style={{ minHeight: '150px', height: '150px' }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Existing Attachments Card */}
          {assignment.attachments && assignment.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Current Attachments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {assignment.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 p-2 sm:p-3 bg-muted rounded-md">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm flex-1 truncate min-w-0" title={attachment.fileName}>{truncateFileName(attachment.fileName)}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!clubId || !assignment.id) return;
                        try {
                          setDeletingAttachmentId(attachment.id);
                          await assignmentApi.deleteAttachment(clubId, assignment.id, attachment.id);
                          toast.success('Attachment deleted successfully');
                          // Refresh assignment data
                          const updated = await assignmentApi.getAssignment(clubId, assignment.id);
                          onSuccess(updated);
                        } catch (error: any) {
                          console.error('Error deleting attachment:', error);
                          toast.error(error.response?.data?.message || 'Failed to delete attachment');
                        } finally {
                          setDeletingAttachmentId(null);
                        }
                      }}
                      disabled={deletingAttachmentId === attachment.id}
                      className="flex-shrink-0 p-2 sm:px-3 sm:py-2"
                    >
                      <X className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">{deletingAttachmentId === attachment.id ? 'Deleting...' : 'Remove'}</span>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Legacy single attachment support (for backward compatibility) */}
          {(!assignment.attachments || assignment.attachments.length === 0) && assignment.attachmentPath && assignment.attachmentName && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Current Attachment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm flex-1 truncate" title={assignment.attachmentName}>{truncateFileName(assignment.attachmentName)}</span>
                  <span className="text-xs text-muted-foreground">(Legacy attachment)</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* New Attachment Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4" />
                New Attachment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    const validFiles: File[] = [];
                    for (const file of files) {
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error(`${file.name} is larger than 10MB`);
                        continue;
                      }
                      validFiles.push(file);
                    }
                    if (validFiles.length > 0) {
                      setSelectedFiles([...selectedFiles, ...validFiles]);
                    }
                  }
                  // Reset input to allow selecting the same file again
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,image/*"
                className="hidden"
              />
              
              {selectedFiles.length > 0 ? (
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-md border">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm flex-1 truncate" title={file.name}>{truncateFileName(file.name)}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const newFiles = [...selectedFiles];
                          newFiles.splice(index, 1);
                          setSelectedFiles(newFiles);
                        }}
                        className="h-6 w-6 p-0 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="text-center border-2 border-dashed rounded-md bg-muted/30 cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
                  style={{ paddingTop: '3rem', paddingBottom: '3rem', paddingLeft: '2rem', paddingRight: '2rem' }}
                >
                  <Upload className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">Click to select files</p>
                  <p className="text-xs text-muted-foreground">or drag and drop (multiple files supported)</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  .pdf, .docx, .xlsx, .pptx, .txt, .jpg, .jpeg, .png, .zip, .rar (Max 10 MB per file)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Scoring & Dates Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4" />
                Scoring & Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Max Score */}
              <div>
                <Label htmlFor="edit-maxScore">Max Score (optional)</Label>
                <Input
                  id="edit-maxScore"
                  type="number"
                  min="0"
                  placeholder="e.g., 100"
                  value={formData.maxScore ?? ""}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : undefined;
                    setFormData({ ...formData, maxScore: value });
                    setMaxScoreError(false);
                  }}
                  aria-invalid={maxScoreError}
                  className={`mt-1 ${
                    maxScoreError
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500"
                      : ""
                  }`}
                />
              </div>

              {/* Date Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Available Date */}
                <div>
                  <Label htmlFor="edit-availableDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Available Date {hasSubmissions && <span className="text-amber-500">⚠</span>}
                  </Label>
              <Input
                id="edit-availableDate"
                type="datetime-local"
                value={formData.availableDate}
                onChange={(e) => {
                  setFormData({ ...formData, availableDate: e.target.value });
                  setAvailableDateError(false);
                }}
                aria-invalid={availableDateError}
                className={`mt-1 ${
                  availableDateError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500"
                    : ""
                }`}
              />
                </div>

                {/* Due Date */}
                <div>
                  <Label htmlFor="edit-dueDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Due Date {hasSubmissions && <span className="text-amber-500">⚠</span>}
                  </Label>
              <Input
                id="edit-dueDate"
                type="datetime-local"
                min={formData.availableDate}
                value={formData.dueDate}
                onChange={(e) => {
                  setFormData({ ...formData, dueDate: e.target.value });
                  setDueDateError(false);
                }}
                aria-invalid={dueDateError}
                className={`mt-1 ${
                  dueDateError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500"
                    : ""
                }`}
              />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visibility Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {formData.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                Assignment Visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <Checkbox
                    id="edit-isVisible"
                    checked={formData.isVisible}
                    onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked === true })}
                  />
                </div>
                <Label htmlFor="edit-isVisible" className="cursor-pointer text-sm font-medium mb-0">
                  Make this assignment visible to members
                </Label>
              </div>
            </CardContent>
          </Card>

        </form>
        
        {/* Actions */}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="edit-assignment-form" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Date Change Warning Dialog */}
      <AlertDialog open={showDateChangeWarning} onOpenChange={setShowDateChangeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Warning: Date Change</AlertDialogTitle>
            <AlertDialogDescription>
              This assignment has existing submissions. Changing dates may affect submission statuses. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSubmit(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitUpdate} disabled={isLoading}>
              {isLoading ? "Updating..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

