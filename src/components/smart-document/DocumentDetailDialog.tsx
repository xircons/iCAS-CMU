import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage, getDiceBearAvatar } from "../ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Calendar, Users, AlertCircle, FileText, Building2, User, CheckCircle2, XCircle, Loader2, Upload, Eye, Download, Clock, MessageSquare } from "lucide-react";
import { format, isValid } from "date-fns";
import type { SmartDocument, Priority } from "./types";
import { documentApi } from "../../features/smart-document/api/documentApi";
import { useUser } from "../../App";
import { toast } from "sonner";
import { cn } from "../ui/utils";
import { clubPublicRouteSegment } from "../../utils/publicId";
import { EditDocumentDialog } from "./EditDocumentDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

interface DocumentDetailDialogProps {
  document: SmartDocument | null;
  clubPublicId?: string | number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentUpdate?: (document: SmartDocument) => void;
  onDocumentArchived?: (documentId: number) => void;
  onDocumentDeleted?: (documentId: number) => void;
}

const getSubmissionStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'Not Submitted': 'ยังไม่ส่ง',
    'Submitted': 'ส่งงาน',
    'Approved': 'สำเร็จ',
    'Needs Revision': 'แก้ไข',
  };
  return labels[status] || status;
};

const getSubmissionStatusColor = (status: string): string => {
  switch (status) {
    case 'Not Submitted':
      return 'bg-gray-100 text-gray-700';
    case 'Submitted':
      return 'bg-blue-100 text-blue-700';
    case 'Approved':
      return 'bg-green-100 text-green-700';
    case 'Needs Revision':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getPriorityColor = (priority: Priority): string => {
  switch (priority) {
    case "High":
      return "bg-red-100 text-red-700 hover:bg-red-100";
    case "Medium":
      return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
    case "Low":
      return "bg-green-100 text-green-700 hover:bg-green-100";
    default:
      return "bg-gray-100 text-gray-700 hover:bg-gray-100";
  }
};

const getPriorityLabel = (priority: Priority): string => {
  switch (priority) {
    case "High":
      return "สูง";
    case "Medium":
      return "ปานกลาง";
    case "Low":
      return "ต่ำ";
    default:
      return priority;
  }
};

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    Report: "รายงาน",
    Checklist: "รายการตรวจสอบ",
    "Request Form": "แบบฟอร์มคำขอ",
    Contract: "สัญญา",
    Letter: "จดหมาย",
    Other: "อื่นๆ",
  };
  return labels[type] || type;
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    Open: "เปิด",
    "In Progress": "กำลังดำเนินการ",
    Completed: "เสร็จสมบูรณ์",
  };
  return labels[status] || status;
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case "Open":
      return "bg-yellow-100 text-yellow-700";
    case "In Progress":
      return "bg-blue-100 text-blue-700";
    case "Completed":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const formatSafeDate = (value: string | Date | undefined | null, pattern: string, fallback: string): string => {
  if (!value) return fallback;
  const parsed = value instanceof Date ? value : new Date(value);
  if (!isValid(parsed)) return fallback;
  return format(parsed, pattern);
};

export function DocumentDetailDialog({
  document,
  clubPublicId,
  open,
  onOpenChange,
  onDocumentUpdate,
  onDocumentArchived,
  onDocumentDeleted,
}: DocumentDetailDialogProps) {
  const { user } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [localDocument, setLocalDocument] = useState<SmartDocument | null>(document);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalDocument(document);
    setSelectedFile(null);
  }, [document]);

  useEffect(() => {
    const fetchLatestDocument = async () => {
      if (!open || !document?.id) return;
      const routeClubId = clubPublicRouteSegment(clubPublicId, document);
      if (!routeClubId) return;
      try {
        setIsRefreshing(true);
        const freshDoc = await documentApi.getDocumentById(routeClubId, document.id);
        setLocalDocument(freshDoc);
        if (onDocumentUpdate) {
          onDocumentUpdate(freshDoc);
        }
      } catch (error) {
        console.error("Error refreshing document detail:", error);
      } finally {
        setIsRefreshing(false);
      }
    };
    fetchLatestDocument();
  }, [open, document?.id, clubPublicId, document?.clubPublicId]);

  if (!localDocument) return null;

  const dueDate = new Date(localDocument.dueDate);
  const dueDateIsValid = isValid(dueDate);
  const isOverdue =
    dueDateIsValid && (localDocument.isOverdue || (dueDate < new Date() && localDocument.status !== "Completed"));
  
  // Check if current user is assigned to this document
  const currentUserId = user?.id ? parseInt(String(user.id), 10) : null;
  const currentMemberSubmission = localDocument.assignedMembers?.find(m => m.userId === currentUserId);
  const isAssigned = !!currentMemberSubmission;
  
  // Check if current user is admin (only admins can review/approve)
  const isAdmin = user?.role === 'admin';
  // Admins can review any submitted documents, regardless of document status
  const canReview = isAdmin; // Only admins can review

  const handleArchive = async () => {
    if (!localDocument) return;
    const routeClubId = clubPublicRouteSegment(clubPublicId, localDocument);
    if (!routeClubId) {
      toast.error("ไม่พบรหัสชมรมสำหรับเรียก API");
      return;
    }
    try {
      setIsArchiving(true);
      await documentApi.archiveDocument(routeClubId, localDocument.id);
      toast.success("เก็บเอกสารเข้าคลังแล้ว");
      setIsArchiveDialogOpen(false);
      onOpenChange(false);
      onDocumentArchived?.(localDocument.id);
    } catch (error: any) {
      console.error("Error archiving document:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถเก็บเอกสารเข้าคลังได้");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUpdateMemberStatus = async (memberUserId: number, newStatus: 'Approved' | 'Needs Revision') => {
    if (!localDocument) return;
    const routeClubId = clubPublicRouteSegment(clubPublicId, localDocument);
    if (!routeClubId) {
      toast.error("ไม่พบรหัสชมรมสำหรับเรียก API");
      return;
    }

    try {
      setIsUpdating(true);
      const updatedDoc = await documentApi.updateMemberSubmissionStatus(routeClubId, localDocument.id, {
        userId: memberUserId,
        submissionStatus: newStatus,
      });
      
      setLocalDocument(updatedDoc);
      if (onDocumentUpdate) {
        onDocumentUpdate(updatedDoc);
      }
      toast.success("อัปเดตสถานะสมาชิกแล้ว");
    } catch (error: any) {
      console.error("Error updating member status:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถอัปเดตสถานะได้");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("ไฟล์มีขนาดใหญ่เกิน 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmitFile = async () => {
    if (!localDocument || !selectedFile) return;
    const routeClubId = clubPublicRouteSegment(clubPublicId, localDocument);
    if (!routeClubId) {
      toast.error("ไม่พบรหัสชมรมสำหรับเรียก API");
      return;
    }

    try {
      setIsSubmitting(true);
      const updatedDoc = await documentApi.submitDocumentFile(
        routeClubId,
        localDocument.id,
        selectedFile
      );
      
      setLocalDocument(updatedDoc);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (onDocumentUpdate) {
        onDocumentUpdate(updatedDoc);
      }
      toast.success("ส่งเอกสารสำเร็จ");
    } catch (error: any) {
      console.error("Error submitting file:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถส่งเอกสารได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadFile = (filePath: string) => {
    const fileUrl = documentApi.getFileUrl(filePath);
    window.open(fileUrl, '_blank');
  };

  const handlePreviewFile = (filePath: string) => {
    const fileUrl = documentApi.getFileUrl(filePath);
    window.open(fileUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] min-h-0 min-w-0 w-full max-w-[min(48rem,calc(100vw-2rem))] flex-col gap-4 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="min-w-0 shrink-0 space-y-0">
          <DialogDescription className="sr-only">
            รายละเอียดเอกสาร ชมรม วันครบกำหนด คำอธิบาย และสมาชิกที่ได้รับมอบหมาย
          </DialogDescription>
          <div className="flex min-w-0 flex-col gap-3">
            <div className="min-w-0 max-w-full pr-14 sm:pr-16">
              <DialogTitle className="mb-3 flex min-w-0 max-w-full flex-wrap items-baseline gap-2 text-xl md:text-2xl break-words">
                <span className="min-w-0 break-words">{localDocument.title}</span>
                {isRefreshing && (
                  <span
                    className="inline-flex shrink-0 text-muted-foreground"
                    role="status"
                    aria-live="polite"
                    aria-label="กำลังโหลดข้อมูลล่าสุด"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                )}
              </DialogTitle>
              <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
                <Badge className={getPriorityColor(localDocument.priority)} variant="outline">
                  {getPriorityLabel(localDocument.priority)}
                </Badge>
                <Badge variant="outline">{getTypeLabel(localDocument.type)}</Badge>
                <Badge className={getStatusColor(localDocument.status)} variant="outline">
                  {getStatusLabel(localDocument.status)}
                </Badge>
                {isOverdue && (
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100" variant="outline">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    เกินกำหนด
                  </Badge>
                )}
              </div>
            </div>
            {isAdmin && (
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                  แก้ไข
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsArchiveDialogOpen(true)}>
                  เก็บเข้าคลัง
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="min-w-0 max-w-full flex-1 space-y-4">
          {/* Key Information Grid */}
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            {/* Club Information */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex min-w-0 items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ชมรม
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                <p className="text-sm font-medium break-words">
                  {localDocument.clubName?.trim() || "—"}
                </p>
              </CardContent>
            </Card>

            {/* Due Date */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex min-w-0 items-center gap-2">
                  <Calendar className={cn("h-4 w-4 shrink-0", isOverdue && "text-red-600")} />
                  วันที่ครบกำหนด
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                <p className={cn("text-sm font-medium break-words", isOverdue && "text-red-600")}>
                  {formatSafeDate(localDocument.dueDate, "d MMMM yyyy", "ไม่ระบุวันครบกำหนด")}
                </p>
                {isOverdue && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    เอกสารนี้เกินกำหนดแล้ว
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                คำอธิบาย
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                {localDocument.description || "ไม่มีคำอธิบาย"}
              </p>
            </CardContent>
          </Card>

          {/* Template Download */}
          {localDocument.templatePath && (
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  เทมเพลตเอกสาร
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const templateUrl = documentApi.getFileUrl(localDocument.templatePath!);
                    window.open(templateUrl, '_blank');
                  }}
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  ดาวน์โหลดเทมเพลต
                </Button>
              </CardContent>
            </Card>
          )}

          {/* My Submission Section */}
          {isAssigned && currentMemberSubmission && (
            <Card className={cn(
              "min-w-0 overflow-hidden border-primary/20",
              currentMemberSubmission.submissionStatus === 'Approved' && "border-green-300 bg-green-50/30",
              currentMemberSubmission.submissionStatus === 'Needs Revision' && "border-red-300 bg-red-50/30"
            )}>
              <CardHeader className="min-w-0 pb-3">
                <CardTitle className="text-sm font-semibold flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0">การส่งงานของฉัน</span>
                  </div>
                  {currentMemberSubmission.submissionStatus && (
                    <Badge 
                      className={cn(
                        "inline-flex items-center justify-center rounded-md border px-2 py-0.5 font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden [a&]:hover:bg-accent [a&]:hover:text-accent-foreground text-xs",
                        getSubmissionStatusColor(currentMemberSubmission.submissionStatus)
                      )} 
                      variant="outline"
                    >
                      {getSubmissionStatusLabel(currentMemberSubmission.submissionStatus)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 space-y-4">
                {currentMemberSubmission.filePath ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
                      <div className="flex-shrink-0">
                        <FileText className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate mb-1">{currentMemberSubmission.fileName || "ไฟล์"}</p>
                        {currentMemberSubmission.fileSize && (
                          <p className="text-xs text-muted-foreground">
                            {(currentMemberSubmission.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                        {currentMemberSubmission.submittedAt && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            ส่งเมื่อ: {formatSafeDate(currentMemberSubmission.submittedAt, "d MMM yyyy, HH:mm", "-")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewFile(currentMemberSubmission.filePath!)}
                          title="ดูไฟล์"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadFile(currentMemberSubmission.filePath!)}
                          title="ดาวน์โหลด"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {currentMemberSubmission.adminComment && (
                      <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1 text-blue-900 dark:text-blue-100">
                          <MessageSquare className="h-3 w-3" />
                          ความคิดเห็นจากผู้ตรวจสอบ:
                        </p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {currentMemberSubmission.adminComment}
                        </p>
                      </div>
                    )}
                    {currentMemberSubmission.submissionStatus !== 'Approved' && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium mb-3">อัปเดตไฟล์:</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,image/*"
                          className="hidden"
                        />
                        <div className="space-y-3">
                          {selectedFile ? (
                            <>
                              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                                <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate" title={selectedFile.name}>{selectedFile.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedFile(null)}
                                  className="h-8 w-8 p-0 flex-shrink-0"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                              <Button
                                type="button"
                                onClick={handleSubmitFile}
                                disabled={isSubmitting}
                                className="w-full"
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    กำลังส่ง...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    อัปเดตไฟล์
                                  </>
                                )}
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              เลือกไฟล์ใหม่
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,image/*"
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
                          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" title={selectedFile.name}>{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedFile(null)}
                            className="h-8 w-8 p-0 flex-shrink-0"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          onClick={handleSubmitFile}
                          disabled={isSubmitting}
                          className="w-full"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              กำลังส่ง...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              ส่งเอกสาร
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="text-center border-2 border-dashed rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all p-8"
                      >
                        <Upload className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                        <p className="text-base font-semibold mb-2">คลิกเพื่อเลือกไฟล์</p>
                        <p className="text-sm text-muted-foreground">รองรับไฟล์ PDF, Word, Excel, PowerPoint, รูปภาพ, ZIP, RAR (สูงสุด 10MB)</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assigned Members */}
          {localDocument.assignedMembers && localDocument.assignedMembers.length > 0 && (
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex min-w-0 items-center gap-2">
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate">
                    สมาชิกที่มอบหมาย ({localDocument.assignedMembers.length} คน)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  {localDocument.assignedMembers.map((member, memberIndex) => {
                    const submissionStatus = member.submissionStatus || 'Not Submitted';
                    const displayName =
                      [member.firstName, member.lastName].filter((s) => s && String(s).trim()).join(" ").trim() ||
                      `สมาชิก #${Number.isFinite(member.userId) && member.userId > 0 ? member.userId : memberIndex + 1}`;
                    const avatarSeed =
                      displayName ||
                      (Number.isFinite(member.userId) && member.userId > 0 ? `user-${member.userId}` : `row-${memberIndex}`);
                    // Admins can review everyone (including leaders), others can only review regular members
                    const memberRole = member.role?.toLowerCase?.() || member.role || '';
                    const isMember = user?.role === 'admin' 
                      ? true // Admins can review everyone
                      : (memberRole === 'member' || memberRole === 'staff' || memberRole === '');
                    
                    return (
                      <Card
                        key={`member-${memberIndex}-${Number.isFinite(member.userId) ? member.userId : "na"}`}
                        className={cn(
                          "relative min-w-0 overflow-hidden transition-all",
                          submissionStatus === 'Needs Revision' && "border-red-300 bg-red-50/30 dark:bg-red-950/20",
                          submissionStatus === 'Approved' && "border-green-300 bg-green-50/30 dark:bg-green-950/20",
                          submissionStatus === 'Submitted' && "border-blue-300 bg-blue-50/30 dark:bg-blue-950/20"
                        )}
                      >
                        <CardContent className="min-w-0 p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback>
                                  {getDiceBearAvatar(avatarSeed)}
                                </AvatarFallback>
                              </Avatar>
                              <Badge 
                                className={cn(
                                  getSubmissionStatusColor(submissionStatus), 
                                  "text-xs flex-shrink-0"
                                )} 
                                variant="outline"
                              >
                                {getSubmissionStatusLabel(submissionStatus)}
                              </Badge>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <p className="text-sm font-semibold truncate">
                                  {displayName}
                                </p>
                                {member.role && (
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    {member.role === "leader" ? "หัวหน้า" : "สมาชิก"}
                                  </Badge>
                                )}
                              </div>
                              
                              {/* File information: admins only (members/leaders see status badge only) */}
                              {member.filePath && isAdmin && (
                                <div className="mt-2 min-w-0 max-w-full space-y-1">
                                  <div className="flex min-w-0 max-w-full items-center gap-2 rounded bg-muted/50 p-2 text-xs">
                                    <FileText className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                                    <span className="truncate flex-1 min-w-0" title={member.fileName}>{member.fileName || "ไฟล์"}</span>
                                    <div className="flex gap-1 flex-shrink-0">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handlePreviewFile(member.filePath!)}
                                        title="ดูไฟล์"
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleDownloadFile(member.filePath!)}
                                        title="ดาวน์โหลด"
                                      >
                                        <Download className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  {member.submittedAt && (
                                    <p className="text-xs text-muted-foreground flex min-w-0 flex-wrap items-center gap-1 break-words">
                                      <Clock className="h-3 w-3" />
                                      ส่งเมื่อ: {formatSafeDate(member.submittedAt, "d MMM yyyy, HH:mm", "-")}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Admin comment: admins see all; assignees see only their own row */}
                              {member.adminComment &&
                                (isAdmin || (currentUserId !== null && member.userId === currentUserId)) && (
                                <div className="mt-2 p-2 bg-blue-50/50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                  <p className="text-xs font-semibold mb-1 flex items-center gap-1 text-blue-900 dark:text-blue-100">
                                    <MessageSquare className="h-3 w-3" />
                                    ความคิดเห็น:
                                  </p>
                                  <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                                    {member.adminComment}
                                  </p>
                                </div>
                              )}

                              {/* Review Buttons (Admin only) - Admins can review everyone, including leaders */}
                              {canReview && isMember && (submissionStatus === 'Submitted' || submissionStatus === 'Needs Revision') && (
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs flex-1"
                                    onClick={() => handleUpdateMemberStatus(member.userId, 'Approved')}
                                    disabled={isUpdating}
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    อนุมัติ
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs flex-1 border-red-300 text-red-700 hover:bg-red-50"
                                    onClick={() => handleUpdateMemberStatus(member.userId, 'Needs Revision')}
                                    disabled={isUpdating}
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    แก้ไข
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 min-w-0">
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                ข้อมูลเอกสาร
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold mb-1 text-muted-foreground">สร้างเมื่อ</p>
                  <p className="text-sm flex min-w-0 flex-wrap items-center gap-1.5 break-words">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {formatSafeDate(localDocument.createdAt, "d MMM yyyy, HH:mm", "-")}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold mb-1 text-muted-foreground">อัปเดตล่าสุด</p>
                  <p className="text-sm flex min-w-0 flex-wrap items-center gap-1.5 break-words">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {formatSafeDate(localDocument.updatedAt, "d MMM yyyy, HH:mm", "-")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>

      <EditDocumentDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        document={localDocument}
        clubPublicId={clubPublicId}
        onSuccess={(updatedDoc) => {
          setLocalDocument(updatedDoc);
          onDocumentUpdate?.(updatedDoc);
        }}
        onDelete={() => {
          if (!localDocument) return;
          onDocumentDeleted?.(localDocument.id);
          onOpenChange(false);
        }}
      />

      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>เก็บเอกสารเข้าคลัง?</AlertDialogTitle>
            <AlertDialogDescription>
              เอกสารที่ถูกเก็บเข้าคลังจะไม่แสดงบนกระดานหลัก
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={isArchiving}>
              {isArchiving ? "กำลังดำเนินการ..." : "ยืนยัน"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

