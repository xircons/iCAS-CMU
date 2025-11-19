import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage, getDiceBearAvatar } from "../ui/avatar";
import { toast } from "sonner";
import { clubApi, type Club } from "../../features/club/api/clubApi";
import { useClubSafe } from "../../contexts/ClubContext";
import { useUser } from "../../App";
import { Search, Users, ChevronLeft, ChevronRight, Loader2, FileText, FolderOpen, X } from "lucide-react";
import type { CreateDocumentFormData, Priority, DocumentType, DocumentTemplate } from "./types";
import { documentApi } from "../../features/smart-document/api/documentApi";
import { TemplateLibrary } from "./TemplateLibrary";

interface CreateDocumentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateDocumentFormData) => void;
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
    avatar?: string;
  };
}

export function CreateDocumentWizard({ open, onOpenChange, onSubmit }: CreateDocumentWizardProps) {
  const { user } = useUser();
  const { clubId: currentClubId } = useClubSafe();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingClubs, setIsLoadingClubs] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<"all" | "leader" | "member">("all");
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState(false);
  
  const [formData, setFormData] = useState<CreateDocumentFormData>({
    title: "",
    description: "",
    clubId: 0,
    priority: "Medium",
    type: "Report",
    dueDate: "",
    assignedMemberIds: [],
    templatePath: undefined,
  });

  // Fetch clubs when dialog opens (all clubs for admin, leader clubs for leaders)
  useEffect(() => {
    if (open && clubs.length === 0) {
      fetchClubs();
    }
  }, [open]);

  // Fetch templates when dialog opens (admin only)
  useEffect(() => {
    if (open && user?.role === 'admin' && templates.length === 0) {
      fetchTemplates();
    }
  }, [open, user?.role]);

  // Auto-select club if in club context and only one club
  useEffect(() => {
    if (open && clubs.length === 1 && !formData.clubId) {
      setFormData(prev => ({ ...prev, clubId: clubs[0].id }));
    } else if (open && currentClubId && clubs.length > 0 && !formData.clubId) {
      // If in club context, try to select that club
      const currentClub = clubs.find(c => c.id === currentClubId);
      if (currentClub) {
        setFormData(prev => ({ ...prev, clubId: currentClubId }));
      }
    }
  }, [open, clubs, currentClubId]);

  // Fetch members when moving to step 2 and club is selected
  useEffect(() => {
    if (open && currentStep === 2 && formData.clubId > 0 && members.length === 0 && !isLoadingMembers) {
      fetchMembers();
    }
  }, [currentStep, open, formData.clubId]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setFormData({
        title: "",
        description: "",
        clubId: 0,
        priority: "Medium",
        type: "Report",
        dueDate: "",
        assignedMemberIds: [],
        templatePath: undefined,
      });
      setMembers([]);
      setMemberSearchQuery("");
      setMemberRoleFilter("all");
      setTemplates([]);
    }
  }, [open]);

  const fetchClubs = async () => {
    try {
      setIsLoadingClubs(true);
      let fetchedClubs: Club[] = [];
      
      // Admin can see all clubs, leaders see only their clubs
      if (user?.role === "admin") {
        fetchedClubs = await clubApi.getAllClubs();
      } else {
        fetchedClubs = await clubApi.getLeaderClubs();
      }
      
      setClubs(fetchedClubs);
    } catch (error: any) {
      console.error("Error fetching clubs:", error);
      toast.error("ไม่สามารถโหลดข้อมูลชมรมได้");
    } finally {
      setIsLoadingClubs(false);
    }
  };

  const fetchMembers = async () => {
    if (!formData.clubId) return;
    try {
      setIsLoadingMembers(true);
      const membersData = await clubApi.getClubMembers(formData.clubId);
      setMembers(membersData);
    } catch (error: any) {
      console.error("Error fetching members:", error);
      toast.error("ไม่สามารถโหลดข้อมูลสมาชิกได้");
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const templatesData = await documentApi.getTemplates();
      setTemplates(templatesData);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast.error("ไม่สามารถโหลดเทมเพลตได้");
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const validateStep1 = (): boolean => {
    if (!formData.title.trim()) {
      toast.error("กรุณากรอกหัวข้อเอกสาร");
      return false;
    }
    if (!formData.description.trim()) {
      toast.error("กรุณากรอกคำอธิบาย");
      return false;
    }
    if (!formData.clubId) {
      toast.error("กรุณาเลือกชมรม");
      return false;
    }
    if (!formData.dueDate) {
      toast.error("กรุณาเลือกวันครบกำหนด");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (formData.assignedMemberIds.length === 0) {
      toast.error("กรุณาเลือกสมาชิกอย่างน้อย 1 คน");
      return;
    }
    onSubmit(formData);
    onOpenChange(false);
  };

  const handleSelectAll = () => {
    const filteredMembers = getFilteredMembers();
    const allIds = filteredMembers.map(m => m.userId);
    setFormData(prev => ({ ...prev, assignedMemberIds: allIds }));
  };

  const handleDeselectAll = () => {
    setFormData(prev => ({ ...prev, assignedMemberIds: [] }));
  };

  const handleMemberToggle = (userId: number) => {
    setFormData(prev => {
      const isSelected = prev.assignedMemberIds.includes(userId);
      if (isSelected) {
        return {
          ...prev,
          assignedMemberIds: prev.assignedMemberIds.filter(id => id !== userId),
        };
      } else {
        return {
          ...prev,
          assignedMemberIds: [...prev.assignedMemberIds, userId],
        };
      }
    });
  };

  const getFilteredMembers = (): ClubMember[] => {
    let filtered = members;

    // Filter by search query
    if (memberSearchQuery.trim()) {
      const query = memberSearchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.user.firstName.toLowerCase().includes(query) ||
        m.user.lastName.toLowerCase().includes(query) ||
        `${m.user.firstName} ${m.user.lastName}`.toLowerCase().includes(query)
      );
    }

    // Filter by role
    if (memberRoleFilter !== "all") {
      filtered = filtered.filter(m => m.role === memberRoleFilter);
    }

    return filtered;
  };

  const filteredMembers = getFilteredMembers();
  const isSingleClub = clubs.length === 1;
  const selectedClub = clubs.find(c => c.id === formData.clubId);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>สร้างเอกสารใหม่</DialogTitle>
          <DialogDescription>
            {currentStep === 1 ? "ขั้นตอนที่ 1: ข้อมูลพื้นฐาน" : "ขั้นตอนที่ 2: มอบหมายสมาชิก"}
          </DialogDescription>
        </DialogHeader>

         {/* Step Indicator */}
         <div className="flex items-center justify-center gap-2 mb-6">
           <div className={`flex items-center ${currentStep >= 1 ? "text-primary" : "text-muted-foreground"}`}>
             <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
               {currentStep > 1 ? "1" : "1"}
             </div>
             <span className="ml-2 text-sm hidden sm:inline">ข้อมูลพื้นฐาน</span>
           </div>
           <div className="h-[1px] w-12 bg-border flex-shrink-0" />
           <div className={`flex items-center ${currentStep >= 2 ? "text-primary" : "text-muted-foreground"}`}>
             <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
               2
             </div>
             <span className="ml-2 text-sm hidden sm:inline">มอบหมายสมาชิก</span>
           </div>
         </div>

        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">หัวข้อเอกสาร *</Label>
              <Input
                id="title"
                placeholder="เช่น รายงานกิจกรรมประจำเดือน"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">คำอธิบาย *</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="กรอกคำอธิบายเอกสาร..."
                className="resize-y border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 w-full rounded-md border bg-input-background px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm min-h-[200px] md:min-h-[250px]"
                style={{ textAlign: 'left', height: '100px', minHeight: '100px' }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="club">ชมรม *</Label>
                {isLoadingClubs ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังโหลด...
                  </div>
                ) : isSingleClub ? (
                  <div className="p-2 border rounded-md bg-muted">
                    <span className="text-sm font-medium">{clubs[0].name}</span>
                    <span className="text-xs text-muted-foreground pl-2">(ล็อค)</span>
                  </div>
                ) : (
                  <Select
                    value={formData.clubId ? String(formData.clubId) : undefined}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, clubId: parseInt(value) }))}
                  >
                    <SelectTrigger id="club">
                      <SelectValue placeholder="เลือกชมรม" />
                    </SelectTrigger>
                    <SelectContent>
                      {clubs.map((club) => (
                        <SelectItem key={club.id} value={String(club.id)}>
                          {club.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">ระดับความสำคัญ</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: Priority) => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">ต่ำ</SelectItem>
                    <SelectItem value="Medium">ปานกลาง</SelectItem>
                    <SelectItem value="High">สูง</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">ประเภทเอกสาร</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: DocumentType) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Report">รายงาน</SelectItem>
                    <SelectItem value="Checklist">รายการตรวจสอบ</SelectItem>
                    <SelectItem value="Request Form">แบบฟอร์มคำขอ</SelectItem>
                    <SelectItem value="Contract">สัญญา</SelectItem>
                    <SelectItem value="Letter">จดหมาย</SelectItem>
                    <SelectItem value="Other">อื่นๆ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">วันครบกำหนด *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            {/* Template Selection (Admin only) */}
            {user?.role === 'admin' && (
              <div className="space-y-2">
                <Label>เทมเพลต (ไม่บังคับ)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={formData.templatePath ? templates.find(t => t.path === formData.templatePath || t.filePath === formData.templatePath)?.name || "เทมเพลตที่เลือก" : "ไม่มีเทมเพลต"}
                    placeholder="ยังไม่ได้เลือกเทมเพลต"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsTemplateLibraryOpen(true)}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    เลือกเทมเพลต
                  </Button>
                  {formData.templatePath && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, templatePath: undefined }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  เลือกเทมเพลตเอกสารเพื่อให้สมาชิกดาวน์โหลดและกรอกข้อมูล
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Member Assignment */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">กำลังโหลดสมาชิก...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">
                    ชมรม: <span className="font-medium">{selectedClub?.name || "ไม่พบชมรม"}</span>
                  </span>
                </div>

                <div className="flex flex-col sm:grid sm:grid-cols-10 gap-2 w-full">
                  <div className="sm:col-span-7 relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ค้นหาสมาชิก..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="pl-9 w-full"
                    />
                  </div>
                  <div className="sm:col-span-3 w-full sm:w-auto">
                    <Select value={memberRoleFilter} onValueChange={(value: "all" | "leader" | "member") => setMemberRoleFilter(value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="บทบาท" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        <SelectItem value="leader">หัวหน้า</SelectItem>
                        <SelectItem value="member">สมาชิก</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    เลือกแล้ว: <span className="font-medium text-foreground">{formData.assignedMemberIds.length}</span> คน
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      เลือกทั้งหมด
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                    >
                      ยกเลิกทั้งหมด
                    </Button>
                  </div>
                </div>

                <div className="border rounded-md max-h-[300px] overflow-y-auto">
                  {filteredMembers.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      {memberSearchQuery || memberRoleFilter !== "all" ? "ไม่พบสมาชิกที่ตรงกับตัวกรอง" : "ไม่มีสมาชิกในชมรมนี้"}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredMembers.map((member) => {
                        const isSelected = formData.assignedMemberIds.includes(member.userId);
                        return (
                          <div
                            key={member.userId}
                            className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleMemberToggle(member.userId)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleMemberToggle(member.userId)}
                            />
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.user.avatar} />
                              <AvatarFallback>
                                {getDiceBearAvatar(`${member.user.firstName} ${member.user.lastName}`)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {member.user.firstName} {member.user.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {member.role === "leader" ? "หัวหน้า" : "สมาชิก"}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                ย้อนกลับ
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            {currentStep === 1 ? (
              <Button type="button" onClick={handleNext}>
                ถัดไป
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit}>
                สร้างเอกสาร
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Template Library */}
    <TemplateLibrary
      open={isTemplateLibraryOpen}
      onOpenChange={setIsTemplateLibraryOpen}
      onSelectTemplate={(template) => {
        setFormData(prev => ({ ...prev, templatePath: template.filePath || template.path }));
      }}
      mode="select"
    />
    </>
  );
}

