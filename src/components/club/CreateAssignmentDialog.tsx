import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { toast } from "sonner";
import { useClub } from "../../contexts/ClubContext";
import { assignmentApi, CreateAssignmentRequest } from "../../features/assignment/api/assignmentApi";
import { clubApi } from "../../features/club/api/clubApi";
import { Calendar, FileText, Award, Info, Upload, Users, Eye, EyeOff, ChevronLeft, ChevronRight, X } from "lucide-react";

interface CreateAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ClubMember {
  id: number;
  userId: number;
  role: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// Helper function to truncate file names
const truncateFileName = (fileName: string, maxLength: number = 30): string => {
  if (fileName.length <= maxLength) return fileName;
  const extension = fileName.substring(fileName.lastIndexOf('.'));
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3);
  return `${truncatedName}...${extension}`;
};

export function CreateAssignmentDialog({ open, onOpenChange, onSuccess }: CreateAssignmentDialogProps) {
  const { clubId } = useClub();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [formData, setFormData] = useState<CreateAssignmentRequest & {
    attachmentFiles?: File[];
    isVisible: boolean;
    assignedMemberIds: number[];
  }>({
    title: "",
    description: "",
    maxScore: undefined,
    availableDate: "",
    dueDate: "",
    isVisible: true,
    assignedMemberIds: [],
    attachmentFiles: [],
  });
  const [titleError, setTitleError] = useState(false);
  const [availableDateError, setAvailableDateError] = useState(false);
  const [dueDateError, setDueDateError] = useState(false);
  const [maxScoreError, setMaxScoreError] = useState(false);

  // Fetch members when moving to step 3
  useEffect(() => {
    if (open && clubId && currentStep === 3 && members.length === 0 && !isLoadingMembers) {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, open, clubId]);

  // Clear errors when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Reset form and errors when dialog closes
      setFormData({
        title: "",
        description: "",
        maxScore: undefined,
        availableDate: "",
        dueDate: "",
        isVisible: true,
        assignedMemberIds: [],
        attachmentFiles: [],
      });
      setTitleError(false);
      setAvailableDateError(false);
      setDueDateError(false);
      setMaxScoreError(false);
      setCurrentStep(1);
    }
  }, [open]);

  const fetchMembers = async () => {
    if (!clubId) return;
    try {
      setIsLoadingMembers(true);
      const membersData = await clubApi.getClubMembers(clubId);
      // Filter out leaders - only show regular members and staff
      const filteredMembers = membersData.filter((member: ClubMember) => member.role !== 'leader');
      setMembers(filteredMembers);
      
      // Select all members by default
      const allMemberIds = filteredMembers.map((member: ClubMember) => member.userId);
      setFormData(prev => ({
        ...prev,
        assignedMemberIds: allMemberIds
      }));
    } catch (error: any) {
      console.error("Error fetching members:", error);
      toast.error("Failed to load club members");
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const validateStep1 = () => {
    // Clear previous errors
    setTitleError(false);
    setAvailableDateError(false);
    setDueDateError(false);
    setMaxScoreError(false);

    let hasErrors = false;
    let errorMessages: string[] = [];
    // Add 1 minute buffer to account for timing precision issues
    const now = new Date(Date.now() - 60000);

    // Validate title
    if (!formData.title.trim()) {
      setTitleError(true);
      hasErrors = true;
      errorMessages.push("Title is required");
    }

    // Validate available date
    if (!formData.availableDate) {
      setAvailableDateError(true);
      hasErrors = true;
      errorMessages.push("Available date is required");
    } else {
      // Check if available date is in the past
      const available = new Date(formData.availableDate);
      if (available.getTime() < now.getTime()) {
        setAvailableDateError(true);
        hasErrors = true;
        errorMessages.push("Available date cannot be in the past");
      }
    }

    // Validate due date
    if (!formData.dueDate) {
      setDueDateError(true);
      hasErrors = true;
      errorMessages.push("Due date is required");
    } else {
      // Check if due date is in the past
      const due = new Date(formData.dueDate);
      if (due.getTime() < now.getTime()) {
        setDueDateError(true);
        hasErrors = true;
        errorMessages.push("Due date cannot be in the past");
      }
    }

    // Validate dates relationship
    if (formData.availableDate && formData.dueDate) {
      const available = new Date(formData.availableDate);
      const due = new Date(formData.dueDate);

      if (due <= available) {
        setDueDateError(true);
        hasErrors = true;
        errorMessages.push("Due date must be after available date");
      }
    }

    // Validate max score if provided
    if (formData.maxScore !== undefined && formData.maxScore !== null) {
      const score = Number(formData.maxScore);
      if (isNaN(score) || score < 0) {
        setMaxScoreError(true);
        hasErrors = true;
        errorMessages.push("Max score must be a positive number");
      }
    }

    if (hasErrors) {
      const firstError = errorMessages[0] || "Please fill in all required fields correctly";
      toast.error(firstError);
      return false;
    }

    return true;
  };

  const handleNext = (e?: React.MouseEvent) => {
    // Prevent form submission
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      // Step 2 is optional - can proceed without file
      setCurrentStep(3);
      // Fetch members when moving to step 3
      if (clubId && members.length === 0) {
        fetchMembers();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only submit if we're on step 3
    if (currentStep !== 3) {
      return;
    }

    if (!clubId) {
      toast.error("Club not found");
      return;
    }

    // Validate dates are not in the past before submitting (with 1 minute buffer)
    const now = new Date(Date.now() - 60000);
    let hasDateErrors = false;
    
    if (formData.availableDate) {
      const available = new Date(formData.availableDate);
      if (available.getTime() < now.getTime()) {
        setAvailableDateError(true);
        hasDateErrors = true;
        toast.error("Available date cannot be in the past");
      }
    }
    
    if (formData.dueDate) {
      const due = new Date(formData.dueDate);
      if (due.getTime() < now.getTime()) {
        setDueDateError(true);
        hasDateErrors = true;
        toast.error("Due date cannot be in the past");
      }
    }
    
    if (hasDateErrors) {
      return;
    }

    try {
      setIsLoading(true);

      // Convert datetime-local format to MySQL DATETIME format
      // datetime-local gives us local time (e.g., "2025-11-13T00:57" in UTC+7)
      // new Date(dateTimeLocal) interprets the string as local time
      // getTime() already returns the UTC timestamp, so we use it directly
      // User enters 00:57 local (UTC+7) → Store as 17:57 previous day UTC → Display as 00:57 local
      const convertToMySQLDateTime = (dateTimeLocal: string): string => {
        if (!dateTimeLocal) return "";
        
        // Parse the local datetime string (JavaScript interprets as local time)
        const localDate = new Date(dateTimeLocal);
        
        // getTime() already returns UTC timestamp, so we can use UTC methods directly
        // No need to add/subtract offset - the Date object already handles the conversion
        const year = localDate.getUTCFullYear();
        const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(localDate.getUTCDate()).padStart(2, '0');
        const hours = String(localDate.getUTCHours()).padStart(2, '0');
        const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
        const seconds = String(localDate.getUTCSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      // Prepare data
      const submitData: CreateAssignmentRequest = {
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        maxScore: formData.maxScore ? Number(formData.maxScore) : undefined,
        availableDate: convertToMySQLDateTime(formData.availableDate),
        dueDate: convertToMySQLDateTime(formData.dueDate),
      };

      // Create assignment with optional attachment
      await assignmentApi.createAssignment(clubId, submitData, formData.attachmentFiles && formData.attachmentFiles.length > 0 ? formData.attachmentFiles : undefined);

      // Reset form and errors
      setFormData({
        title: "",
        description: "",
        maxScore: undefined,
        availableDate: "",
        dueDate: "",
        isVisible: true,
        assignedMemberIds: [],
        attachmentFiles: [],
      });
      setTitleError(false);
      setAvailableDateError(false);
      setDueDateError(false);
      setMaxScoreError(false);
      setCurrentStep(1);

      onSuccess();
    } catch (error: any) {
      console.error("Error creating assignment:", error);
      toast.error(error.response?.data?.message || "Failed to create assignment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      title: "",
      description: "",
      maxScore: undefined,
      availableDate: "",
      dueDate: "",
      isVisible: true,
      assignedMemberIds: [],
      attachmentFiles: [],
    });
    setTitleError(false);
    setAvailableDateError(false);
    setDueDateError(false);
    setMaxScoreError(false);
    setCurrentStep(1);
    onOpenChange(false);
  };

  // Handle input changes to clear errors
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, title: e.target.value });
    if (titleError) {
      setTitleError(false);
    }
  };

  const handleAvailableDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, availableDate: value });
    
    // Validate if date is in the past (with 1 minute buffer)
    if (value) {
      const available = new Date(value);
      const now = new Date(Date.now() - 60000);
      if (available.getTime() < now.getTime()) {
        setAvailableDateError(true);
      } else {
        setAvailableDateError(false);
      }
    } else {
      setAvailableDateError(false);
    }
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, dueDate: value });
    
    // Validate if date is in the past (with 1 minute buffer)
    if (value) {
      const due = new Date(value);
      const now = new Date(Date.now() - 60000);
      if (due.getTime() < now.getTime()) {
        setDueDateError(true);
      } else {
        setDueDateError(false);
      }
    } else {
      setDueDateError(false);
    }
  };

  const handleMaxScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? Number(e.target.value) : undefined;
    setFormData({ ...formData, maxScore: value });
    if (maxScoreError) {
      setMaxScoreError(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed',
        'image/jpeg',
        'image/png',
        'image/gif',
      ];
      
      const validFiles: File[] = [];
      for (const file of files) {
        if (!(file instanceof File)) continue;
        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name}: Invalid file type. Please upload PDF, DOCX, images, or archive files.`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 10MB`);
          continue;
        }
        validFiles.push(file);
      }
      if (validFiles.length > 0) {
        setFormData({ 
          ...formData, 
          attachmentFiles: [...(formData.attachmentFiles || []), ...validFiles]
        });
      }
    }
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = [...(formData.attachmentFiles || [])];
    newFiles.splice(index, 1);
    setFormData({ ...formData, attachmentFiles: newFiles });
  };

  const handleSelectAllMembers = () => {
    if (formData.assignedMemberIds.length === members.length) {
      setFormData({ ...formData, assignedMemberIds: [] });
    } else {
      setFormData({ ...formData, assignedMemberIds: members.map(m => m.userId) });
    }
  };

  const handleToggleMember = (userId: number) => {
    const currentIds = formData.assignedMemberIds;
    if (currentIds.includes(userId)) {
      setFormData({ ...formData, assignedMemberIds: currentIds.filter(id => id !== userId) });
    } else {
      setFormData({ ...formData, assignedMemberIds: [...currentIds, userId] });
    }
  };

  // Get current datetime in the format required for datetime-local input
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const renderStep1 = () => (
    <div className="space-y-6">
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
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Assignment title"
              value={formData.title}
              onChange={handleTitleChange}
              required
              aria-invalid={titleError}
              className={`mt-1 ${
                titleError
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500"
                  : "border-input focus:border-ring focus:ring-2 focus:ring-ring"
              }`}
              style={titleError ? { border: "2px solid #ef4444", borderColor: "#ef4444" } : undefined}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Assignment description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="mt-1 resize-y"
              style={{ 
                minHeight: '150px',
                height: '150px'
              }}
            />
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
            <Label htmlFor="maxScore">Max Score (optional)</Label>
            <Input
              id="maxScore"
              type="number"
              min="0"
              placeholder="e.g., 100"
              value={formData.maxScore ?? ""}
              onChange={handleMaxScoreChange}
              aria-invalid={maxScoreError}
              className={`mt-1 ${
                maxScoreError
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500"
                  : "border-input focus:border-ring focus:ring-2 focus:ring-ring"
              }`}
              style={maxScoreError ? { border: "2px solid #ef4444", borderColor: "#ef4444" } : undefined}
            />
          </div>

          {/* Date Grid */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Available Date */}
            <div className="flex-1 min-w-0">
              <Label htmlFor="availableDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                Available Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="availableDate"
                type="datetime-local"
                min={getCurrentDateTime()}
                value={formData.availableDate}
                onChange={handleAvailableDateChange}
                required
                aria-invalid={availableDateError}
                className={`mt-1 w-full text-left ${
                  availableDateError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500"
                    : "border-input focus:border-ring focus:ring-2 focus:ring-ring"
                }`}
                style={availableDateError ? { border: "2px solid #ef4444", borderColor: "#ef4444" } : undefined}
              />
            </div>

            {/* Due Date */}
            <div className="flex-1 min-w-0">
              <Label htmlFor="dueDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                Due Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dueDate"
                type="datetime-local"
                min={formData.availableDate || getCurrentDateTime()}
                value={formData.dueDate}
                onChange={handleDueDateChange}
                required
                aria-invalid={dueDateError}
                className={`mt-1 w-full text-left ${
                  dueDateError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500"
                    : "border-input focus:border-ring focus:ring-2 focus:ring-ring"
                }`}
                style={dueDateError ? { border: "2px solid #ef4444", borderColor: "#ef4444" } : undefined}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderStep2 = () => {

    const handleDropAreaClick = () => {
      fileInputRef.current?.click();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const fakeEvent = {
          target: { files }
        } as React.ChangeEvent<HTMLInputElement>;
        handleFileChange(fakeEvent);
      }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Attach Files (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            id="attachment"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,image/*"
            multiple
            className="hidden"
          />

          {formData.attachmentFiles && formData.attachmentFiles.length > 0 ? (
            <div className="space-y-2">
              {formData.attachmentFiles.map((file, index) => (
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
                    onClick={() => handleRemoveFile(index)}
                    className="h-6 w-6 p-0 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
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
              <p className="text-base font-medium mb-2">Attach files here</p>
              <p className="text-sm text-muted-foreground">Click to browse or drag and drop (multiple files supported)</p>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              .pdf, .docx, .xlsx, .pptx, .txt, .jpg, .jpeg, .png, .zip, .rar (Max 10 MB)
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep3 = () => {
    return (
      <div className="space-y-6">
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
                  id="isVisible"
                  checked={formData.isVisible}
                  onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked === true })}
                />
              </div>
              <Label htmlFor="isVisible" className="cursor-pointer text-sm font-medium mb-0">
                Make this assignment visible to members
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Member Assignment Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <CardTitle className="text-base flex items-center gap-2 flex-1">
                <Users className="h-4 w-4" />
                Assign To Members
              </CardTitle>
              {members.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllMembers}
                  className="h-8 flex-shrink-0 whitespace-nowrap"
                >
                  {formData.assignedMemberIds.length === members.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">

            {isLoadingMembers ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading members...</p>
              </div>
            ) : members.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed rounded-md bg-muted/30">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">No members found</p>
                <p className="text-xs text-muted-foreground">The assignment will be available to all club members</p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto border rounded-md bg-muted/30">
                <div className="divide-y divide-border/50">
                  {members.map((member) => {
                    const isSelected = formData.assignedMemberIds.includes(member.userId);
                    return (
                      <div
                        key={member.id}
                        className={`flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 sm:py-3 transition-colors cursor-pointer hover:bg-muted/50 ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                        onClick={() => handleToggleMember(member.userId)}
                      >
                        <div className="flex items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            id={`member-${member.userId}`}
                            checked={isSelected}
                            onCheckedChange={() => handleToggleMember(member.userId)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div
                          className="cursor-pointer flex-1 text-sm mb-0 min-w-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleMember(member.userId);
                          }}
                        >
                          <div className="font-medium text-foreground truncate">
                            {member.user.firstName} {member.user.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {member.user.email}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[90vw] !max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
          <DialogDescription>
            Step {currentStep} of 3: {
              currentStep === 1 ? "Basic Information" :
              currentStep === 2 ? "Attach Files" :
              "Assign Members"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 flex-1">
              {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${
                      currentStep >= step
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-muted-foreground"
                    }`}
                  >
                    <span className="text-sm font-medium leading-none">{step}</span>
                  </div>
                  {step < 3 && (
                    <div className="flex-1 flex items-center">
                      <div
                        className={`flex-1 h-px transition-colors ${
                          currentStep > step ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Actions */}
          <div className="flex gap-2 justify-between pt-2">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={handleBack} disabled={isLoading}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {currentStep < 3 ? (
                <Button type="button" onClick={(e) => handleNext(e)} disabled={isLoading}>
                  Next Step
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Assignment"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
