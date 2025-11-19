import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage, getDiceBearAvatar } from "../ui/avatar";
import { Calendar, Users, AlertCircle, FileText, Building2, CheckCircle2, XCircle, Loader2, ArrowLeft, Upload, Download, Eye, MessageSquare, Edit, Clock } from "lucide-react";
import { format } from "date-fns";
import type { SmartDocument, Priority } from "./types";
import { documentApi } from "../../features/smart-document/api/documentApi";
import { useUser } from "../../App";
import { toast } from "sonner";
import { cn } from "../ui/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { EditDocumentDialog } from "./EditDocumentDialog";

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

export function DocumentDetailView() {
  const { clubId, smartDocId } = useParams<{ clubId: string; smartDocId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [document, setDocument] = useState<SmartDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewingMemberId, setReviewingMemberId] = useState<number | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!clubId || !smartDocId) {
        setError("Missing club ID or document ID");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const doc = await documentApi.getDocumentById(parseInt(clubId, 10), parseInt(smartDocId, 10));
        setDocument(doc);
      } catch (err: any) {
        console.error("Error fetching document:", err);
        setError(err.response?.data?.message || "ไม่สามารถโหลดเอกสารได้");
        toast.error("ไม่สามารถโหลดเอกสารได้");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [clubId, smartDocId]);

  const handleUpdateMemberStatus = async (memberUserId: number, newStatus: 'Approved' | 'Needs Revision') => {
    if (!document || !clubId || !smartDocId) return;
    
    try {
      setIsUpdating(true);
      const updatedDoc = await documentApi.updateMemberSubmissionStatus(
        parseInt(clubId, 10), 
        parseInt(smartDocId, 10), 
        {
          userId: memberUserId,
          submissionStatus: newStatus,
        }
      );
      
      setDocument(updatedDoc);
      toast.success("อัปเดตสถานะสมาชิกแล้ว");
    } catch (error: any) {
      console.error("Error updating member status:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถอัปเดตสถานะได้");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validate file type (PDF or images only)
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("กรุณาเลือกไฟล์ PDF หรือรูปภาพเท่านั้น");
        return;
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("ขนาดไฟล์ต้องไม่เกิน 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmitFile = async () => {
    if (!selectedFile || !clubId || !smartDocId) return;
    
    try {
      setIsSubmitting(true);
      const updatedDoc = await documentApi.submitDocumentFile(
        parseInt(clubId, 10),
        parseInt(smartDocId, 10),
        selectedFile
      );
      
      setDocument(updatedDoc);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success("ส่งเอกสารสำเร็จ");
    } catch (error: any) {
      console.error("Error submitting file:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถส่งเอกสารได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReviewDialog = (memberUserId: number) => {
    setReviewingMemberId(memberUserId);
    setReviewComment("");
    setIsReviewDialogOpen(true);
  };

  const handleReviewSubmission = async (status: 'Approved' | 'Needs Revision') => {
    if (!reviewingMemberId || !clubId || !smartDocId) return;
    
    try {
      setIsUpdating(true);
      const updatedDoc = await documentApi.reviewSubmission(
        parseInt(clubId, 10),
        parseInt(smartDocId, 10),
        {
          userId: reviewingMemberId,
          submissionStatus: status,
          comment: reviewComment || undefined,
        }
      );
      
      setDocument(updatedDoc);
      setIsReviewDialogOpen(false);
      setReviewingMemberId(null);
      setReviewComment("");
      toast.success(status === 'Approved' ? "อนุมัติเอกสารแล้ว" : "ส่งกลับให้แก้ไขแล้ว");
    } catch (error: any) {
      console.error("Error reviewing submission:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถตรวจสอบเอกสารได้");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (!document.templatePath) return;
    const templateUrl = documentApi.getFileUrl(document.templatePath);
    window.open(templateUrl, '_blank');
  };

  const handleDownloadFile = (filePath: string) => {
    const fileUrl = documentApi.getFileUrl(filePath);
    window.open(fileUrl, '_blank');
  };

  const handlePreviewFile = (filePath: string, mimeType?: string) => {
    const fileUrl = documentApi.getFileUrl(filePath);
    if (mimeType?.startsWith('image/')) {
      window.open(fileUrl, '_blank');
    } else {
      window.open(fileUrl, '_blank');
    }
  };

  const handleBack = () => {
    // For admins: navigate to global smart document kanban board
    if (user?.role === 'admin') {
      navigate('/smartdoc');
      return;
    }
    
    // For leaders/members: navigate back to assignments page
    if (clubId) {
      navigate(`/club/${clubId}/assignments`);
    } else {
      // Fallback: go back in history or to assignments
      navigate('/assignments');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">{error || "ไม่พบเอกสาร"}</p>
        <Button onClick={handleBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          กลับ
        </Button>
      </div>
    );
  }

  const dueDate = new Date(document.dueDate);
  const createdAt = new Date(document.createdAt);
  const updatedAt = new Date(document.updatedAt);
  const isOverdue = document.isOverdue || (dueDate < new Date() && document.status !== "Completed");
  
  // Check if current user is admin (only admins can review/approve)
  const currentUserId = user?.id ? parseInt(String(user.id), 10) : null;
  const isLeader = document.assignedMembers?.some(m => m.userId === currentUserId && m.role === 'leader') || false;
  const isAdmin = user?.role === 'admin';
  // Admins can review any submitted documents, regardless of document status
  const canReview = isAdmin; // Only admins can review
  
  // Check if current user is assigned to this document (including leaders)
  const currentMemberSubmission = document.assignedMembers?.find(m => m.userId === currentUserId);
  const isAssigned = !!currentMemberSubmission;

  return (
    <div className="p-4 md:p-8 space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 has-[>svg]:px-3 w-auto touch-manipulation sm:h-8 sm:rounded-md sm:px-3 sm:gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </button>
        {isAdmin && (
          <button
            onClick={() => setIsEditDialogOpen(true)}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-background border-2 border-gray-300 dark:border-gray-600 text-foreground hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 has-[>svg]:px-3 w-auto touch-manipulation sm:h-8 sm:rounded-md sm:px-3 sm:gap-1.5 ml-auto"
          >
            <Edit className="h-4 w-4" />
            แก้ไขเอกสาร
          </button>
        )}
      </div>

      {/* Two Column Layout: Single column on mobile, two columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-full min-w-0">
        {/* Left Column - Main Content (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-6 min-w-0 w-full max-w-full">
          {/* Document Info Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <CardTitle className="text-xl sm:text-2xl font-bold truncate">{document.title}</CardTitle>
                </div>
                <Badge className={cn(getStatusColor(document.status), "flex-shrink-0")} variant="outline">
                  {getStatusLabel(document.status)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={getPriorityColor(document.priority)} variant="outline">
                  {getPriorityLabel(document.priority)}
                </Badge>
                <Badge variant="outline">{getTypeLabel(document.type)}</Badge>
                {isOverdue && (
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100" variant="outline">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    เกินกำหนด
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6">
              {/* Key Information */}
              <div className="flex items-center gap-2 text-base font-bold">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-semibold">ชมรม:</span>
                <span className="text-sm font-semibold">{document.clubName}</span>
              </div>
              <div className="flex items-center gap-2 text-base font-bold">
                <Calendar className={cn("h-5 w-5", isOverdue && "text-red-600")} />
                <span className="text-sm font-semibold">วันที่ครบกำหนด:</span>
                <span className={cn("text-sm font-semibold", isOverdue && "text-red-600")}>
                  {format(dueDate, "d MMMM yyyy")}
                </span>
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs ml-2">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    เกินกำหนด
                  </Badge>
                )}
              </div>
              
              {/* Description */}
              {document.description && (
                <div className="pt-4 border-t">
                  <h3 className="text-base font-bold mb-2">คำอธิบาย</h3>
                  <p className="text-sm sm:text-base font-semibold text-muted-foreground whitespace-pre-wrap">
                    {document.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned Members */}
          {document.assignedMembers && document.assignedMembers.length > 0 && (
            <Card className="hover:shadow-md transition-shadow w-full max-w-full min-w-0">
              <CardHeader className="w-full max-w-full min-w-0">
                <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  สมาชิกที่มอบหมาย ({document.assignedMembers.length} คน)
                </CardTitle>
              </CardHeader>
              <CardContent className="w-full max-w-full min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-full min-w-0">
                  {document.assignedMembers.map((member) => {
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
                          "relative transition-all hover:shadow-md w-full max-w-full min-w-0",
                          submissionStatus === 'Needs Revision' && "border-red-300 bg-red-50/30 dark:bg-red-950/20",
                          submissionStatus === 'Approved' && "border-green-300 bg-green-50/30 dark:bg-green-950/20",
                          submissionStatus === 'Submitted' && "border-blue-300 bg-blue-50/30 dark:bg-blue-950/20"
                        )}
                      >
                        <CardContent className="p-3 sm:p-4 w-full max-w-full min-w-0">
                          <div className="space-y-3 w-full max-w-full min-w-0">
                            {/* Header: Avatar, Name, Status, Role */}
                            <div className="flex items-start gap-3 w-full max-w-full min-w-0">
                              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback>
                                  {getDiceBearAvatar(`${member.firstName} ${member.lastName}`)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 w-full max-w-full">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 mb-1.5">
                                  <p className="text-sm sm:text-base font-semibold break-words">
                                    {member.firstName} {member.lastName}
                                  </p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {member.role && (
                                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                                        {member.role === "leader" || member.role?.toLowerCase() === "leader" ? "หัวหน้า" : "สมาชิก"}
                                      </Badge>
                                    )}
                                    <Badge 
                                      className={cn(
                                        getSubmissionStatusColor(submissionStatus), 
                                        "text-xs whitespace-nowrap"
                                      )} 
                                      variant="outline"
                                    >
                                      {getSubmissionStatusLabel(submissionStatus)}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* File Information */}
                            {member.filePath && (
                              <div className="space-y-1.5 w-full max-w-full min-w-0">
                                <div className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-md hover:bg-muted/70 transition-colors w-full max-w-full min-w-0">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                    <span className="text-xs sm:text-sm break-words flex-1 min-w-0" title={member.fileName}>
                                      {member.fileName || "ไฟล์"}
                                    </span>
                                  </div>
                                  {(isLeader || isAdmin) && (
                                    <div className="flex gap-1 flex-shrink-0">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 hover:bg-accent flex-shrink-0"
                                        onClick={() => handleDownloadFile(member.filePath!)}
                                        title="ดาวน์โหลด"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Admin Comment */}
                            {member.adminComment && (
                              <div className="p-2.5 sm:p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800 w-full max-w-full min-w-0">
                                <p className="text-xs sm:text-sm font-semibold mb-1.5 flex items-center gap-1.5 text-blue-900 dark:text-blue-100">
                                  <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                                  ความคิดเห็น:
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed break-words">
                                  {member.adminComment}
                                </p>
                              </div>
                            )}

                            {/* Review Buttons (Admin only) - Admins can review everyone, including leaders */}
                            {canReview && isMember && (submissionStatus === 'Submitted' || submissionStatus === 'Needs Revision') && (
                              <div className="flex gap-2 pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs sm:text-sm w-full sm:w-auto"
                                  onClick={() => handleOpenReviewDialog(member.userId)}
                                  disabled={isUpdating}
                                >
                                  <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                                  ตรวจสอบ
                                </Button>
                              </div>
                            )}
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
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                ข้อมูลเอกสาร
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">สร้างเมื่อ:</span>
                  <span className="font-medium">{format(createdAt, "d MMM yyyy, HH:mm")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">อัปเดตล่าสุด:</span>
                  <span className="font-medium">{format(updatedAt, "d MMM yyyy, HH:mm")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Template and Submission (1/3 width on desktop) */}
        <div className="lg:col-span-1 space-y-6 min-w-0 w-full max-w-full">
          {/* Template Download (if exists) */}
          {document.templatePath && (
            <Card className="w-full max-w-full min-w-0 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  เทมเพลตเอกสาร
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg overflow-hidden bg-muted/20">
                  <div className="flex justify-center p-2 bg-muted/30">
                    <iframe
                      src={documentApi.getFileUrl(document.templatePath)}
                      className="w-full border-0 rounded shadow-sm"
                      style={{ height: 'clamp(300px, 40vh, 600px)', minHeight: '300px' }}
                      title="Template Preview"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const fileUrl = documentApi.getFileUrl(document.templatePath);
                      window.open(fileUrl, '_blank');
                    }}
                    className="flex-1 text-xs sm:text-sm"
                  >
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">เปิดในแท็บใหม่</span>
                    <span className="sm:hidden">เปิด</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="flex-1 text-xs sm:text-sm"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    ดาวน์โหลด
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Member File Upload Section */}
          {isAssigned && currentMemberSubmission && (
        <Card className={cn(
          "border-primary/20 hover:shadow-md transition-shadow",
          currentMemberSubmission.submissionStatus === 'Approved' && "border-green-300 bg-green-50/30",
          currentMemberSubmission.submissionStatus === 'Needs Revision' && "border-red-300 bg-red-50/30"
        )}>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg sm:text-xl font-bold">ส่งเอกสารของคุณ</CardTitle>
              <Badge 
                className={cn(
                  getSubmissionStatusColor(currentMemberSubmission.submissionStatus || 'Not Submitted')
                )} 
                variant="outline"
              >
                {getSubmissionStatusLabel(currentMemberSubmission.submissionStatus || 'Not Submitted')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentMemberSubmission.filePath ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-md hover:bg-muted/70 transition-colors w-full max-w-full min-w-0">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="text-xs sm:text-sm break-words flex-1 min-w-0" title={currentMemberSubmission.fileName}>
                      {currentMemberSubmission.fileName || "ไฟล์"}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-accent flex-shrink-0"
                      onClick={() => handlePreviewFile(currentMemberSubmission.filePath!, currentMemberSubmission.fileMimeType)}
                      title="ดูไฟล์"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-accent flex-shrink-0"
                      onClick={() => handleDownloadFile(currentMemberSubmission.filePath!)}
                      title="ดาวน์โหลด"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {currentMemberSubmission.adminComment && (
                  <div className="p-3 sm:p-4 bg-muted rounded-md">
                    <p className="text-xs sm:text-sm font-semibold mb-1 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                      ความคิดเห็นจากผู้ตรวจสอบ:
                    </p>
                    <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-wrap">
                      {currentMemberSubmission.adminComment}
                    </p>
                  </div>
                )}
                {currentMemberSubmission.submissionStatus !== 'Approved' && (
                  <div className="pt-4 border-t">
                    <p className="text-sm sm:text-base font-medium mb-2">อัปเดตไฟล์:</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,image/*"
                      className="hidden"
                    />
                    <div className="space-y-2">
                      {selectedFile ? (
                        <div className="flex items-center gap-2 p-2 sm:p-3 bg-muted rounded-md border">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs sm:text-sm flex-1 min-w-0 truncate" title={selectedFile.name}>{selectedFile.name}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                            ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedFile(null)}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0"
                          >
                            <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full sm:w-auto"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          เลือกไฟล์ใหม่
                        </Button>
                      )}
                      {selectedFile && (
                        <Button
                          type="button"
                          onClick={handleSubmitFile}
                          disabled={isSubmitting}
                          className="w-full sm:w-auto"
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
                  accept=".pdf,image/*"
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 sm:p-3 bg-muted rounded-md border">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs sm:text-sm flex-1 min-w-0 truncate" title={selectedFile.name}>{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedFile(null)}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0"
                      >
                        <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      onClick={handleSubmitFile}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto"
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
                    className="text-center border-2 border-dashed rounded-md bg-muted/30 cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors p-6 sm:p-8"
                  >
                    <Upload className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-sm sm:text-base font-medium mb-2">คลิกเพื่อเลือกไฟล์</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">รองรับไฟล์ PDF และรูปภาพ (สูงสุด 10MB)</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ตรวจสอบเอกสาร</DialogTitle>
            <DialogDescription>
              {reviewingMemberId && document.assignedMembers?.find(m => m.userId === reviewingMemberId) && (
                <p>
                  เอกสารจาก: {document.assignedMembers.find(m => m.userId === reviewingMemberId)?.firstName}{' '}
                  {document.assignedMembers.find(m => m.userId === reviewingMemberId)?.lastName}
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">ความคิดเห็น (ไม่บังคับ)</label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="กรอกความคิดเห็นหรือข้อเสนอแนะ..."
                className="min-h-[100px]"
              />
            </div>
            <div className="flex gap-2 justify-between">
              <Button
                variant="outline"
                onClick={() => setIsReviewDialogOpen(false)}
                disabled={isUpdating}
              >
                ยกเลิก
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => handleReviewSubmission('Needs Revision')}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      ส่งกลับแก้ไข
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleReviewSubmission('Approved')}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      อนุมัติ
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      {isAdmin && (
        <EditDocumentDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          document={document}
          onSuccess={(updatedDoc) => {
            setDocument(updatedDoc);
            setIsEditDialogOpen(false);
          }}
          onDelete={() => {
            // Navigate back after deletion
            handleBack();
          }}
        />
      )}
    </div>
  );
}

