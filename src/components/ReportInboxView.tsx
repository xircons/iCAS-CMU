import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { 
  Inbox, 
  Search, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  MessageSquare,
  Lightbulb,
  ThumbsUp,
  User,
  FileText,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";

interface ReportInboxViewProps {
  user: User;
}

type ReportType = "feedback" | "issue" | "suggestion" | "complaint" | "question" | "appreciation";
type ReportStatus = "new" | "in-review" | "resolved";

interface Report {
  id: string;
  type: ReportType;
  subject: string;
  message: string;
  sender: {
    name: string;
    email: string;
    club?: string;
  };
  date: string;
  status: ReportStatus;
  assignedTo?: string;
  response?: string;
  responseDate?: string;
}

export function ReportInboxView({ user }: ReportInboxViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ReportStatus | "all">("all");
  const [filterType, setFilterType] = useState<ReportType | "all">("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [responseText, setResponseText] = useState("");
  const [assignedReviewer, setAssignedReviewer] = useState("");
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);

  const [reports, setReports] = useState<Report[]>([
    {
      id: "RPT-001",
      type: "suggestion",
      subject: "Request for More Microphones",
      message: "ขอเสนอให้ซื้อไมโครโฟนเพิ่มเติม เพราะตอนนี้ไม่พอสำหรับการซ้อมของสมาชิกทุกคน",
      sender: {
        name: "นภา สว่างใจ",
        email: "napa@cmu.ac.th",
        club: "ชมรมดนตรีสากล",
      },
      date: "2025-11-06T10:30:00",
      status: "in-review",
      assignedTo: "Super Admin",
    },
    {
      id: "RPT-002",
      type: "complaint",
      subject: "Practice Room Too Noisy",
      message: "ห้องซ้อมมีเสียงรบกวนจากห้องข้างๆมากเกินไป ทำให้ซ้อมได้ไม่เต็มที่",
      sender: {
        name: "พิมพ์ใจ ดีงาม",
        email: "phimjai@cmu.ac.th",
        club: "ชมรมดนตรีสากล",
      },
      date: "2025-11-04T14:20:00",
      status: "new",
    },
    {
      id: "RPT-003",
      type: "appreciation",
      subject: "Great Workshop Last Week",
      message: "ขอบคุณสำหรับเวิร์คช็อปที่จัดเมื่อสัปดาห์ที่แล้ว ได้ความรู้เยอะมากครับ",
      sender: {
        name: "ธนพล แข็งแรง",
        email: "thanapol@cmu.ac.th",
        club: "ชมรมหุ่นยนต์",
      },
      date: "2025-11-05T09:15:00",
      status: "resolved",
      assignedTo: "Super Admin",
      response: "ขอบคุณสำหรับกำลังใจครับ จะพยายามจัดกิจกรรมดีๆแบบนี้ต่อไป",
      responseDate: "2025-11-05T15:30:00",
    },
    {
      id: "RPT-004",
      type: "question",
      subject: "Upcoming Concert Date Confirmation",
      message: "อยากขอยืนยันวันที่จัดคอนเสิร์ตหน่อยครับ เพราะไม่แน่ใจว่าวันที่ 15 หรือ 16",
      sender: {
        name: "วิชัย สุขใจ",
        email: "wichai@cmu.ac.th",
        club: "ชมรมภาพถ่าย",
      },
      date: "2025-11-03T11:00:00",
      status: "resolved",
      assignedTo: "Super Admin",
      response: "คอนเสิร์ตจะจัดในวันที่ 15 พฤศจิกายน เวลา 19:00 น. ครับ",
      responseDate: "2025-11-03T16:45:00",
    },
    {
      id: "RPT-005",
      type: "issue",
      subject: "Request Approval Needed",
      message: "ต้องการขออนุมัติสำหรับกิจกรรมพิเศษในเดือนหน้า",
      sender: {
        name: "สมหญิง หัวหน้า",
        email: "somying@cmu.ac.th",
        club: "ชมรมดนตรีสากล",
      },
      date: "2025-11-07T08:00:00",
      status: "new",
    },
  ]);

  const availableReviewers = [
    "Super Admin",
    "Finance Team",
    "Facilities Manager",
    "Event Coordinator",
  ];

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.sender.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || report.status === filterStatus;
    const matchesType = filterType === "all" || report.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getTypeIcon = (type: ReportType) => {
    switch (type) {
      case "suggestion":
        return <Lightbulb className="h-4 w-4" />;
      case "complaint":
      case "issue":
        return <AlertCircle className="h-4 w-4" />;
      case "appreciation":
        return <ThumbsUp className="h-4 w-4" />;
      case "question":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: ReportType) => {
    const colors: Record<ReportType, string> = {
      suggestion: "bg-blue-100 text-blue-700",
      complaint: "bg-red-100 text-red-700",
      issue: "bg-orange-100 text-orange-700",
      question: "bg-purple-100 text-purple-700",
      appreciation: "bg-green-100 text-green-700",
      feedback: "bg-gray-100 text-gray-700",
    };
    return (
      <Badge className={`${colors[type]} whitespace-nowrap flex-shrink-0`}>
        {getTypeIcon(type)}
        <span className="ml-1 capitalize hidden sm:inline">{type}</span>
        <span className="ml-1 capitalize sm:hidden">{type.substring(0, 3)}</span>
      </Badge>
    );
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case "new":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 whitespace-nowrap flex-shrink-0 text-xs">
            <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">New</span>
            <span className="sm:hidden">ใหม่</span>
          </Badge>
        );
      case "in-review":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 whitespace-nowrap flex-shrink-0 text-xs">
            <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">กำลังตรวจสอบ</span>
            <span className="sm:hidden">ตรวจสอบ</span>
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 whitespace-nowrap flex-shrink-0 text-xs">
            <CheckCircle className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">แก้ไขแล้ว</span>
            <span className="sm:hidden">แก้ไข</span>
          </Badge>
        );
      default:
        return <Badge className="whitespace-nowrap flex-shrink-0 text-xs">{status}</Badge>;
    }
  };

  const handleAssignReviewer = () => {
    if (!selectedReport || !assignedReviewer) {
      toast.error("กรุณาเลือกผู้ตรวจสอบ");
      return;
    }

    setReports((prev) =>
      prev.map((r) =>
        r.id === selectedReport.id
          ? { ...r, status: "in-review" as const, assignedTo: assignedReviewer }
          : r
      )
    );
    toast.success(`มอบหมายรายงานให้ ${assignedReviewer} แล้ว`);
    setAssignedReviewer("");
  };

  const handleMarkResolved = () => {
    if (!selectedReport) return;

    setReports((prev) =>
      prev.map((r) =>
        r.id === selectedReport.id
          ? { ...r, status: "resolved" as const }
          : r
      )
    );
    toast.success("ทำเครื่องหมายรายงานว่าแก้ไขแล้ว");
  };

  const handleSendResponse = () => {
    if (!selectedReport || !responseText.trim()) {
      toast.error("กรุณากรอกคำตอบ");
      return;
    }

    setReports((prev) =>
      prev.map((r) =>
        r.id === selectedReport.id
          ? {
              ...r,
              status: "resolved" as const,
              response: responseText,
              responseDate: new Date().toISOString(),
            }
          : r
      )
    );
    toast.success("ส่งคำตอบสำเร็จแล้ว");
    setResponseText("");
    setSelectedReport(null);
  };

  const handleExportCSV = () => {
    // Mock CSV export
    toast.success("กำลังส่งออกรายงานเป็น CSV...");
  };

  const stats = {
    total: reports.length,
    new: reports.filter((r) => r.status === "new").length,
    inReview: reports.filter((r) => r.status === "in-review").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="mb-2 text-xl md:text-2xl">Report Inbox</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            กล่องข้อความรวมศูนย์สำหรับรายงาน ปัญหา และข้อเสนอแนะทั้งหมด
          </p>
        </div>
        <Button onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">ส่งออก CSV</span>
          <span className="sm:hidden">ส่งออก</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm">รายงานทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm">ใหม่</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl text-blue-600">{stats.new}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm">กำลังตรวจสอบ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl text-yellow-600">{stats.inReview}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm">แก้ไขแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาตามหัวข้อ ผู้ส่ง หรือรหัส..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filterStatus} onValueChange={(value: ReportStatus | "all") => setFilterStatus(value)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                  <SelectItem value="new">ใหม่</SelectItem>
                  <SelectItem value="in-review">กำลังตรวจสอบ</SelectItem>
                  <SelectItem value="resolved">แก้ไขแล้ว</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={(value: ReportType | "all") => setFilterType(value)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="ประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ประเภททั้งหมด</SelectItem>
                  <SelectItem value="suggestion">ข้อเสนอแนะ</SelectItem>
                  <SelectItem value="complaint">ข้อร้องเรียน</SelectItem>
                  <SelectItem value="issue">ปัญหา</SelectItem>
                  <SelectItem value="question">คำถาม</SelectItem>
                  <SelectItem value="appreciation">คำชม</SelectItem>
                  <SelectItem value="feedback">ข้อเสนอแนะ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Reports Table - Desktop */}
        <Card className="hidden md:block">
          <CardHeader>
            <CardTitle>รายงาน</CardTitle>
            <CardDescription>
              พบ {filteredReports.length} รายงาน
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัส</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>หัวข้อ</TableHead>
                    <TableHead>ผู้ส่ง</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>วันที่</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setSelectedReport(report)}
                    >
                      <TableCell>
                        <code className="text-xs">{report.id}</code>
                      </TableCell>
                      <TableCell>{getTypeBadge(report.type)}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm truncate max-w-[200px]">{report.subject}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm truncate max-w-[150px]">{report.sender.name}</p>
                          {report.sender.club && (
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">{report.sender.club}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(report.date).toLocaleDateString("th-TH")}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Reports Cards - Mobile */}
        <div className="md:hidden w-full min-w-0 overflow-hidden">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>รายงาน</CardTitle>
              <CardDescription>
                พบ {filteredReports.length} รายงาน
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-3 px-4 pb-4">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors w-full overflow-hidden"
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                      <div className="flex-1 min-w-0 pr-2">
                        <code className="text-xs text-muted-foreground block truncate">{report.id}</code>
                        <p className="font-medium text-sm mt-1 truncate">{report.subject}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(report.status)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <div className="flex-shrink-0">
                        {getTypeBadge(report.type)}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(report.date).toLocaleDateString("th-TH")}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{report.sender.name}</p>
                      {report.sender.club && (
                        <p className="text-xs text-muted-foreground truncate">{report.sender.club}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail View */}
        <Card>
          <CardHeader>
            <CardTitle>รายละเอียดรายงาน</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedReport ? (
              <div className="space-y-4">
                <div>
                  <Label>รหัสรายงาน</Label>
                  <p className="text-sm font-mono">{selectedReport.id}</p>
                </div>
                <div>
                  <Label>ประเภท</Label>
                  <div className="mt-1">{getTypeBadge(selectedReport.type)}</div>
                </div>
                <div>
                  <Label>หัวข้อ</Label>
                  <p className="text-sm font-medium mt-1">{selectedReport.subject}</p>
                </div>
                <div>
                  <Label>ผู้ส่ง</Label>
                  <div className="mt-1">
                    <p className="text-sm">{selectedReport.sender.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedReport.sender.email}</p>
                    {selectedReport.sender.club && (
                      <p className="text-xs text-muted-foreground">{selectedReport.sender.club}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label>ข้อความ</Label>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {selectedReport.message}
                  </p>
                </div>
                <div>
                  <Label>สถานะ</Label>
                  <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                </div>
                {selectedReport.assignedTo && (
                  <div>
                    <Label>มอบหมายให้</Label>
                    <p className="text-sm mt-1">{selectedReport.assignedTo}</p>
                  </div>
                )}
                {selectedReport.response && (
                  <div>
                    <Label>คำตอบ</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {selectedReport.response}
                    </p>
                    {selectedReport.responseDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(selectedReport.responseDate).toLocaleString("th-TH")}
                      </p>
                    )}
                  </div>
                )}
                <div className="pt-4 border-t space-y-2">
                  {selectedReport.status === "new" && (
                    <div className="space-y-2">
                      <Label>มอบหมายผู้ตรวจสอบ</Label>
                      <Select value={assignedReviewer} onValueChange={setAssignedReviewer}>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกผู้ตรวจสอบ..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableReviewers.map((reviewer) => (
                            <SelectItem key={reviewer} value={reviewer}>
                              {reviewer}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleAssignReviewer} className="w-full" size="sm">
                        มอบหมายผู้ตรวจสอบ
                      </Button>
                    </div>
                  )}
                  {selectedReport.status === "in-review" && (
                    <>
                      <Button onClick={handleMarkResolved} className="w-full" size="sm" variant="outline">
                        ทำเครื่องหมายว่าแก้ไขแล้ว
                      </Button>
                      <Button 
                        onClick={() => setIsResponseDialogOpen(true)} className="w-full" size="sm"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        ส่งคำตอบ
                      </Button>
                    </>
                  )}
                  {selectedReport.status === "new" && (
                    <Button 
                      onClick={() => setIsResponseDialogOpen(true)} className="w-full" size="sm" variant="outline"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      ส่งคำตอบ
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Inbox className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">เลือกรายงานเพื่อดูรายละเอียด</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send Response Dialog */}
      {selectedReport && (
        <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ส่งคำตอบติดตาม</DialogTitle>
              <DialogDescription>
                ตอบกลับ {selectedReport.sender.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>ข้อความตอบกลับ</Label>
                <Textarea
                  rows={6}
                  placeholder="กรอกคำตอบของคุณ..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => {
                  handleSendResponse();
                  setIsResponseDialogOpen(false);
                }} className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  ส่งคำตอบ
                </Button>
                <Button variant="outline" onClick={() => {
                  setIsResponseDialogOpen(false);
                  setResponseText("");
                }}>
                  ยกเลิก
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

