import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Plus, Search, FileText, Clock, CheckCircle2, AlertCircle, XCircle, Upload, Eye, Send, Settings, Download, Mail } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";

interface BudgetManagementViewProps {
  user: User;
}

type DocumentStatus =
  | "Draft"
  | "Sent"
  | "Delivered"
  | "Read"
  | "Needs Revision";

type DocumentType = "Report" | "Form" | "Application" | "Contract" | "Letter" | "Other";

interface Document {
  id: number;
  title: string;
  type: DocumentType;
  recipient: string;
  dueDate: string;
  status: DocumentStatus;
  sentBy?: string;
  sentDate?: string;
  notes?: string;
  attachments?: string[];
}

interface NewDocumentFormState {
  title: string;
  type: DocumentType | "";
  recipient: string;
  dueDate: string;
  notes: string;
}

export function BudgetManagementView({ user }: BudgetManagementViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"date-asc" | "date-desc" | "title-asc" | "title-desc">("date-asc");
  const [isNewDocumentOpen, setIsNewDocumentOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [newDocumentForm, setNewDocumentForm] = useState<NewDocumentFormState>({
    title: "",
    type: "",
    recipient: "",
    dueDate: "",
    notes: "",
  });
  const [newDocumentAttachmentName, setNewDocumentAttachmentName] = useState<string | null>(null);

  const [documents, setDocuments] = useState<Document[]>([
    {
      id: 1,
      title: "Monthly Activity Report",
      type: "Report",
      recipient: "Student Affairs Office",
      dueDate: "2025-11-15",
      status: "Draft",
      notes: "Need to include event photos and attendance records.",
    },
    {
      id: 2,
      title: "Request Form",
      type: "Form",
      recipient: "Finance Department",
      dueDate: "2025-11-10",
      status: "Sent",
      sentBy: `${user.firstName} ${user.lastName}`,
      sentDate: "2025-11-05T09:30:00+07:00",
      notes: "Requesting approval for upcoming event expenses.",
    },
    {
      id: 3,
      title: "Event Permission Application",
      type: "Application",
      recipient: "Campus Security",
      dueDate: "2025-11-12",
      status: "Delivered",
      sentBy: `${user.firstName} ${user.lastName}`,
      sentDate: "2025-11-03T14:15:00+07:00",
      attachments: ["permission-form.pdf"],
      notes: "Application submitted. Waiting for approval.",
    },
    {
      id: 4,
      title: "Equipment Rental Contract",
      type: "Contract",
      recipient: "AV Equipment Supplier",
      dueDate: "2025-11-08",
      status: "Read",
      sentBy: `${user.firstName} ${user.lastName}`,
      sentDate: "2025-10-30T11:45:00+07:00",
      attachments: ["contract-draft.pdf"],
      notes: "Contract reviewed and signed by both parties.",
    },
    {
      id: 5,
      title: "Member Registration Letter",
      type: "Letter",
      recipient: "New Member Committee",
      dueDate: "2025-11-18",
      status: "Needs Revision",
      notes: "Missing required signatures. Please resubmit.",
    },
  ]);

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("th-TH");
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case "Draft":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 whitespace-nowrap flex-shrink-0 text-xs">
            <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">ร่าง</span>
            <span className="sm:hidden">ร่าง</span>
          </Badge>
        );
      case "Sent":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 whitespace-nowrap flex-shrink-0 text-xs">
            <Send className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">ส่งแล้ว</span>
            <span className="sm:hidden">ส่ง</span>
          </Badge>
        );
      case "Delivered":
        return (
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 whitespace-nowrap flex-shrink-0 text-xs">
            <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">ส่งถึงแล้ว</span>
            <span className="sm:hidden">ถึงแล้ว</span>
          </Badge>
        );
      case "Read":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 whitespace-nowrap flex-shrink-0 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">อ่านแล้ว</span>
            <span className="sm:hidden">อ่าน</span>
          </Badge>
        );
      case "Needs Revision":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 whitespace-nowrap flex-shrink-0 text-xs">
            <XCircle className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">ต้องแก้ไข</span>
            <span className="sm:hidden">แก้ไข</span>
          </Badge>
        );
      default:
        return <Badge className="whitespace-nowrap flex-shrink-0 text-xs">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: DocumentType) => (
    <Badge variant="outline">{type}</Badge>
  );

  const filteredDocuments = documents
    .filter((doc) => {
      const normalizedQuery = searchQuery.toLowerCase();
      const matchesSearch =
        doc.title.toLowerCase().includes(normalizedQuery) ||
        doc.recipient.toLowerCase().includes(normalizedQuery) ||
        (doc.notes?.toLowerCase().includes(normalizedQuery) ?? false);
      const matchesFilter = filterStatus === "all" || doc.status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === "date-asc") {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortBy === "date-desc") {
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      } else if (sortBy === "title-asc") {
        return a.title.localeCompare(b.title);
      } else if (sortBy === "title-desc") {
        return b.title.localeCompare(a.title);
      }
      return 0;
    });

  const resetNewDocumentForm = () => {
    setNewDocumentForm({
      title: "",
      type: "",
      recipient: "",
      dueDate: "",
      notes: "",
    });
    setNewDocumentAttachmentName(null);
  };

  const handleSubmitDocument = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newDocumentForm.type) {
      toast.error("กรุณาเลือกประเภทเอกสาร");
      return;
    }

    const newDocument: Document = {
      id: Date.now(),
      title: newDocumentForm.title,
      type: newDocumentForm.type,
      recipient: newDocumentForm.recipient,
      dueDate: newDocumentForm.dueDate,
      status: "Draft",
      notes: newDocumentForm.notes,
      attachments: newDocumentAttachmentName ? [newDocumentAttachmentName] : undefined,
    };

    setDocuments((prev) => [newDocument, ...prev]);
    toast.success("สร้างเอกสารใหม่แล้ว");
    resetNewDocumentForm();
    setIsNewDocumentOpen(false);
  };

  const updateDocument = (docId: number, updates: Partial<Document>, successMessage?: string) => {
    let updatedDocument: Document | null = null;
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          updatedDocument = { ...doc, ...updates };
          return updatedDocument;
        }
        return doc;
      })
    );
    if (updatedDocument) {
      setSelectedDocument(updatedDocument);
      if (successMessage) {
        toast.success(successMessage);
      }
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="mb-2 text-xl md:text-2xl">Smart document</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            สร้างและส่งเอกสารไปยังผู้รับพร้อมการติดตามและการยืนยันการส่ง
          </p>
        </div>
        <Dialog open={isNewDocumentOpen} onOpenChange={(open) => {
          setIsNewDocumentOpen(open);
          if (!open) {
            resetNewDocumentForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              เอกสารใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>สร้างเอกสารใหม่</DialogTitle>
              <DialogDescription>
                สร้างเอกสารใหม่เพื่อส่งไปยังผู้รับพร้อมการติดตามและการยืนยันการส่ง
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitDocument} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="doc-title">หัวข้อเอกสาร</Label>
                <Input
                  id="doc-title"
                  placeholder="เช่น รายงานกิจกรรมประจำเดือน"
                  value={newDocumentForm.title}
                  onChange={(e) => setNewDocumentForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-type">ประเภทเอกสาร</Label>
                  <Select
                    value={newDocumentForm.type || undefined}
                    onValueChange={(value: DocumentType) =>
                      setNewDocumentForm((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger id="doc-type">
                      <SelectValue placeholder="เลือกประเภท" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Report">รายงาน</SelectItem>
                      <SelectItem value="Form">แบบฟอร์ม</SelectItem>
                      <SelectItem value="Application">คำขอ</SelectItem>
                      <SelectItem value="Contract">สัญญา</SelectItem>
                      <SelectItem value="Letter">จดหมาย</SelectItem>
                      <SelectItem value="Other">อื่นๆ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-recipient">ผู้รับ</Label>
                  <Input
                    id="doc-recipient"
                    placeholder="เช่น สำนักงานกิจการนักศึกษา"
                    value={newDocumentForm.recipient}
                    onChange={(e) => setNewDocumentForm((prev) => ({ ...prev, recipient: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-due-date">กำหนดส่ง</Label>
                  <Input
                    id="doc-due-date"
                    type="date"
                    value={newDocumentForm.dueDate}
                    onChange={(e) => setNewDocumentForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-notes">คำอธิบาย / ข้อความ</Label>
                <Textarea
                  id="doc-notes"
                  placeholder="เพิ่มคำอธิบาย คำแนะนำ หรือข้อความสำหรับผู้รับ"
                  rows={4}
                  value={newDocumentForm.notes}
                  onChange={(e) => setNewDocumentForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-attachments">อัปโหลดเอกสาร (ไม่บังคับ)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    คลิกเพื่ออัปโหลดหรือลากและวาง
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, DOCX, JPG, PNG สูงสุด 30MB
                  </p>
                  <Input
                    id="doc-attachments"
                    type="file"
                    className="mt-2"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setNewDocumentAttachmentName(file ? file.name : null);
                    }}
                  />
                  {newDocumentAttachmentName && (
                    <p className="text-xs mt-2 text-muted-foreground">เลือกแล้ว: {newDocumentAttachmentName}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button type="submit" className="flex-1">สร้างเอกสาร</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsNewDocumentOpen(false);
                    resetNewDocumentForm();
                  }}
                  className="flex-1 sm:flex-none"
                >
                  ยกเลิก
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาตามหัวข้อ ผู้รับ หรือบันทึก..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filterStatus} onValueChange={(value: DocumentStatus | "all") => setFilterStatus(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="สถานะทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                  <SelectItem value="Draft">ร่าง</SelectItem>
                  <SelectItem value="Sent">ส่งแล้ว</SelectItem>
                  <SelectItem value="Delivered">ส่งถึงแล้ว</SelectItem>
                  <SelectItem value="Read">อ่านแล้ว</SelectItem>
                  <SelectItem value="Needs Revision">ต้องแก้ไข</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: "date-asc" | "date-desc" | "title-asc" | "title-desc") => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="เรียงตาม" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-asc">วันที่ (เก่าที่สุดก่อน)</SelectItem>
                  <SelectItem value="date-desc">วันที่ (ใหม่ที่สุดก่อน)</SelectItem>
                  <SelectItem value="title-asc">ชื่อ (A-Z)</SelectItem>
                  <SelectItem value="title-desc">ชื่อ (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการเอกสาร</CardTitle>
          <CardDescription>
            พบ {filteredDocuments.length} เอกสารที่ตรงกับตัวกรองของคุณ
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-visible">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>หัวข้อ</TableHead>
                  <TableHead>ผู้รับ</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[200px]">{doc.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="truncate max-w-[150px]">{doc.recipient}</TableCell>
                    <TableCell>{getTypeBadge(doc.type)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(doc.dueDate)}</TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell className="relative">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDocument(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" type="button">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="bottom" className="z-[9999] min-w-[150px] bg-white border shadow-lg" onCloseAutoFocus={(e) => e.preventDefault()}>
                            {doc.status === "Draft" && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  updateDocument(
                                    doc.id,
                                    {
                                      status: "Sent",
                                      sentBy: `${user.firstName} ${user.lastName}`,
                                      sentDate: new Date().toISOString(),
                                    },
                                    "ส่งเอกสารแล้ว"
                                  );
                                  setSelectedDocument({ ...doc, status: "Sent", sentBy: `${user.firstName} ${user.lastName}`, sentDate: new Date().toISOString() });
                                }}
                              >
                                ส่งเอกสาร
                              </DropdownMenuItem>
                            )}
                            {doc.status === "Sent" && (
                              <>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    updateDocument(
                                      doc.id,
                                      { status: "Delivered" },
                                      "เอกสารส่งถึงผู้รับแล้ว"
                                    );
                                    setSelectedDocument({ ...doc, status: "Delivered" });
                                  }}
                                >
                                  ทำเครื่องหมายว่าส่งถึงแล้ว
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    updateDocument(
                                      doc.id,
                                      { status: "Needs Revision" },
                                      "ส่งกลับเพื่อแก้ไข"
                                    );
                                    setSelectedDocument({ ...doc, status: "Needs Revision" });
                                  }}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  ขอให้แก้ไข
                                </DropdownMenuItem>
                              </>
                            )}
                            {doc.status === "Delivered" && (
                              <>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    updateDocument(
                                      doc.id,
                                      { status: "Read" },
                                      "ทำเครื่องหมายว่าอ่านแล้ว"
                                    );
                                    setSelectedDocument({ ...doc, status: "Read" });
                                  }}
                                >
                                  ทำเครื่องหมายว่าอ่านแล้ว
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    updateDocument(
                                      doc.id,
                                      { status: "Needs Revision" },
                                      "ขอข้อมูลเพิ่มเติม"
                                    );
                                    setSelectedDocument({ ...doc, status: "Needs Revision" });
                                  }}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  ขอให้แก้ไข
                                </DropdownMenuItem>
                              </>
                            )}
                            {doc.status === "Needs Revision" && (
                              <>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    updateDocument(
                                      doc.id,
                                      { status: "Draft", sentBy: undefined, sentDate: undefined },
                                      "ย้ายเอกสารกลับไปยังร่าง"
                                    );
                                    setSelectedDocument({ ...doc, status: "Draft", sentBy: undefined, sentDate: undefined });
                                  }}
                                >
                                  กลับไปร่าง
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    updateDocument(
                                      doc.id,
                                      { status: "Sent", sentBy: `${user.firstName} ${user.lastName}`, sentDate: new Date().toISOString() },
                                      "ส่งเอกสารอีกครั้ง"
                                    );
                                    setSelectedDocument({ ...doc, status: "Sent", sentBy: `${user.firstName} ${user.lastName}`, sentDate: new Date().toISOString() });
                                  }}
                                >
                                  ส่งอีกครั้ง
                                </DropdownMenuItem>
                              </>
                            )}
                            {doc.status === "Read" && (
                              <DropdownMenuItem disabled>
                                ไม่มีรายการที่ใช้ได้
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Summary */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-sm font-medium">เอกสารที่รอดำเนินการ</p>
                <p className="text-xl md:text-2xl font-bold">
                  {filteredDocuments
                    .filter((d) => d.status === "Draft" || d.status === "Sent" || d.status === "Delivered")
                    .length}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">เอกสารทั้งหมด</p>
                <p className="text-lg font-semibold">{filteredDocuments.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Detail Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedDocument && (
            <>
              <DialogHeader>
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <DialogTitle className="truncate">{selectedDocument.title}</DialogTitle>
                    <DialogDescription className="truncate">
                      ครบกำหนด {formatDate(selectedDocument.dueDate)} • ผู้รับ: {selectedDocument.recipient}
                    </DialogDescription>
                  </div>
                  <div className="flex flex-col gap-2 items-end sm:items-start">
                    {getTypeBadge(selectedDocument.type)}
                    {getStatusBadge(selectedDocument.status)}
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label>ประเภทเอกสาร</Label>
                    <p className="mt-1">{selectedDocument.type}</p>
                  </div>
                  <div>
                    <Label>ผู้รับ</Label>
                    <p className="mt-1 truncate">{selectedDocument.recipient}</p>
                  </div>
                  <div>
                    <Label>วันครบกำหนด</Label>
                    <p className="mt-1">{formatDate(selectedDocument.dueDate)}</p>
                  </div>
                  <div>
                    <Label>ส่งโดย</Label>
                    <p className="mt-1 truncate">{selectedDocument.sentBy ?? "ยังไม่ได้ส่ง"}</p>
                    {selectedDocument.sentDate && (
                      <p className="text-xs text-muted-foreground">
                        ส่งเมื่อ {formatDate(selectedDocument.sentDate)}
                      </p>
                    )}
                  </div>
                </div>
                {selectedDocument.notes && (
                  <div>
                    <Label>คำอธิบาย / ข้อความ</Label>
                    <p className="mt-2 text-sm text-muted-foreground">{selectedDocument.notes}</p>
                  </div>
                )}
                {selectedDocument.attachments && selectedDocument.attachments.length > 0 && (
                  <div>
                    <Label>ไฟล์แนบ</Label>
                    <div className="mt-2 space-y-2">
                      {selectedDocument.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 p-2 border rounded">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{file}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Mock download functionality
                              toast.success(`กำลังดาวน์โหลด ${file}`);
                            }}
                            className="shrink-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {selectedDocument.status === "Draft" && (
                    <Button
                      onClick={() => {
                        updateDocument(
                          selectedDocument.id,
                          {
                            status: "Sent",
                            sentBy: `${user.firstName} ${user.lastName}`,
                            sentDate: new Date().toISOString(),
                          },
                          "ส่งเอกสารแล้ว"
                        );
                      }}
                      className="flex-1 sm:flex-none"
                    >
                      ส่งเอกสาร
                    </Button>
                  )}
                  {selectedDocument.status === "Sent" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          updateDocument(
                            selectedDocument.id,
                            { status: "Delivered" },
                            "เอกสารส่งถึงผู้รับแล้ว"
                          );
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        ทำเครื่องหมายว่าส่งถึงแล้ว
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() =>
                          updateDocument(
                            selectedDocument.id,
                            { status: "Needs Revision" },
                            "ส่งกลับเพื่อแก้ไข"
                          )
                        }
                        className="flex-1 sm:flex-none"
                      >
                        ขอให้แก้ไข
                      </Button>
                    </>
                  )}
                  {selectedDocument.status === "Delivered" && (
                    <>
                      <Button
                        onClick={() =>
                          updateDocument(
                            selectedDocument.id,
                            { status: "Read" },
                            "ทำเครื่องหมายว่าอ่านแล้ว"
                          )
                        }
                        className="flex-1 sm:flex-none"
                      >
                        ทำเครื่องหมายว่าอ่านแล้ว
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() =>
                          updateDocument(
                            selectedDocument.id,
                            { status: "Needs Revision" },
                            "ขอข้อมูลเพิ่มเติม"
                          )
                        }
                        className="flex-1 sm:flex-none"
                      >
                        ขอให้แก้ไข
                      </Button>
                    </>
                  )}
                  {selectedDocument.status === "Needs Revision" && (
                    <Button
                      onClick={() =>
                        updateDocument(
                          selectedDocument.id,
                          { status: "Draft", sentBy: undefined, sentDate: undefined },
                          "ย้ายเอกสารกลับไปยังร่าง"
                        )
                      }
                      className="flex-1 sm:flex-none"
                    >
                      กลับไปร่าง
                    </Button>
                  )}
                  {selectedDocument.status === "Read" && (
                    <p className="text-sm text-muted-foreground">เอกสารนี้เสร็จสมบูรณ์แล้ว</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
