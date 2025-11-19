import React, { useState, useRef } from "react";
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
import { format } from "date-fns";
import type { SmartDocument, Priority } from "./types";
import { documentApi } from "../../features/smart-document/api/documentApi";
import { useUser } from "../../App";
import { toast } from "sonner";
import { cn } from "../ui/utils";

interface DocumentDetailDialogProps {
  document: SmartDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentUpdate?: (document: SmartDocument) => void;
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

export function DocumentDetailDialog({
  document,
  open,
  onOpenChange,
  onDocumentUpdate,
}: DocumentDetailDialogProps) {
  const { user } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);
  const [localDocument, setLocalDocument] = useState<SmartDocument | null>(document);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLocalDocument(document);
    setSelectedFile(null);
  }, [document]);

  if (!localDocument) return null;

  const dueDate = new Date(localDocument.dueDate);
  const createdAt = new Date(localDocument.createdAt);
  const updatedAt = new Date(localDocument.updatedAt);
  const isOverdue = localDocument.isOverdue || (dueDate < new Date() && localDocument.status !== "Completed");
  
  // Check if current user is assigned to this document
  const currentUserId = user?.id ? parseInt(String(user.id), 10) : null;
  const currentMemberSubmission = localDocument.assignedMembers?.find(m => m.userId === currentUserId);
  const isAssigned = !!currentMemberSubmission;
  
  // Check if current user is admin (only admins can review/approve)
  const isLeader = localDocument.assignedMembers?.some(m => m.userId === currentUserId && m.role === 'leader') || false;
  const isAdmin = user?.role === 'admin';
  // Admins can review any submitted documents, regardless of document status
  const canReview = isAdmin; // Only admins can review

  const handleUpdateMemberStatus = async (memberUserId: number, newStatus: 'Approved' | 'Needs Revision') => {
    if (!localDocument) return;
    
    try {
      setIsUpdating(true);
      const updatedDoc = await documentApi.updateMemberSubmissionStatus(localDocument.clubId, localDocument.id, {
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
    
    try {
      setIsSubmitting(true);
      const updatedDoc = await documentApi.submitDocumentFile(
        localDocument.clubId,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl md:text-2xl mb-3 pr-8">{localDocument.title}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Key Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Club Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  ชมรม
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{localDocument.clubName}</p>
              </CardContent>
            </Card>

            {/* Due Date */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className={cn("h-4 w-4", isOverdue && "text-red-600")} />
                  วันที่ครบกำหนด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn("text-sm font-medium", isOverdue && "text-red-600")}>
                  {format(dueDate, "d MMMM yyyy")}
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                คำอธิบาย
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {localDocument.description || "ไม่มีคำอธิบาย"}
              </p>
            </CardContent>
          </Card>

          {/* Template Download */}
          {localDocument.templatePath && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  เทมเพลตเอกสาร
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              "border-primary/20",
              currentMemberSubmission.submissionStatus === 'Approved' && "border-green-300 bg-green-50/30",
              currentMemberSubmission.submissionStatus === 'Needs Revision' && "border-red-300 bg-red-50/30"
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    การส่งงานของฉัน
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
              <CardContent className="space-y-4">
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
                            ส่งเมื่อ: {format(new Date(currentMemberSubmission.submittedAt), "d MMM yyyy, HH:mm")}
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  สมาชิกที่มอบหมาย ({localDocument.assignedMembers.length} คน)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {localDocument.assignedMembers.map((member) => {
                    const submissionStatus = member.submissionStatus || 'Not Submitted';
                    // Admins can review everyone (including leaders), others can only review regular members
                    const memberRole = member.role?.toLowerCase?.() || member.role || '';
                    const isMember = user?.role === 'admin' 
                      ? true // Admins can review everyone
                      : (memberRole === 'member' || memberRole === 'staff') && memberRole !== 'leader';
                    
                    return (
                      <Card
                        key={member.userId}
                        className={cn(
                          "relative transition-all",
                          submissionStatus === 'Needs Revision' && "border-red-300 bg-red-50/30 dark:bg-red-950/20",
                          submissionStatus === 'Approved' && "border-green-300 bg-green-50/30 dark:bg-green-950/20",
                          submissionStatus === 'Submitted' && "border-blue-300 bg-blue-50/30 dark:bg-blue-950/20"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback>
                                  {getDiceBearAvatar(`${member.firstName} ${member.lastName}`)}
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
                                  {member.firstName} {member.lastName}
                                </p>
                                {member.role && (
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    {member.role === "leader" ? "หัวหน้า" : "สมาชิก"}
                                  </Badge>
                                )}
                              </div>
                              
                              {/* File Information */}
                              {member.filePath && (
                                <div className="mt-2 space-y-1 w-full">
                                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs w-full max-w-[80%]">
                                    <FileText className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                                    <span className="truncate flex-1 min-w-0" title={member.fileName}>{member.fileName || "ไฟล์"}</span>
                                    {(isLeader || isAdmin) && (
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
                                    )}
                                  </div>
                                  {member.submittedAt && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      ส่งเมื่อ: {format(new Date(member.submittedAt), "d MMM yyyy, HH:mm")}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Admin Comment */}
                              {member.adminComment && (
                                <div className="mt-2 p-2 bg-blue-50/50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                  <p className="text-xs font-semibold mb-1 flex items-center gap-1 text-blue-900 dark:text-blue-100">
                                    <MessageSquare className="h-3 w-3" />
                                    ความคิดเห็น:
                                  </p>
                                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                ข้อมูลเอกสาร
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold mb-1 text-muted-foreground">สร้างเมื่อ</p>
                  <p className="text-sm flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {format(createdAt, "d MMM yyyy, HH:mm")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1 text-muted-foreground">อัปเดตล่าสุด</p>
                  <p className="text-sm flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {format(updatedAt, "d MMM yyyy, HH:mm")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

