import React, { useState, useEffect, useMemo } from "react";
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
  Search, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  MessageSquare,
  Lightbulb,
  ThumbsUp,
  FileText,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";
import { reportApi } from "../features/report/api/reportApi";
import type { Report, ReportType, ReportStatus, ReportStats } from "../features/report/types/report";
import { adminApi } from "../features/admin/api/adminApi";
import { AsyncBoundary, PageChrome, StatsCard } from "./shared";

interface ReportInboxViewProps {
  user: User;
}

function csvEscape(value: string): string {
  const t = String(value ?? "");
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

export function ReportInboxView({ user: _user }: ReportInboxViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ReportStatus | "all">("all");
  const [filterType, setFilterType] = useState<ReportType | "all">("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [responseText, setResponseText] = useState("");
  const [assignedReviewer, setAssignedReviewer] = useState("");
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewerOptions, setReviewerOptions] = useState<{ value: string; label: string }[]>([]);
  const [serverStats, setServerStats] = useState<ReportStats | null>(null);

  useEffect(() => {
    adminApi
      .listUsers({ role: "admin", limit: 500 })
      .then((users) =>
        setReviewerOptions(
          users.map((u) => {
            const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
            const value = `${name} (${u.email})`.trim();
            const label = name ? `${name} — ${u.email}` : u.email;
            return { value, label };
          })
        )
      )
      .catch(() =>
        toast.error("ไม่สามารถโหลดรายชื่อผู้ดูแลระบบสำหรับมอบหมายได้")
      );
  }, []);

  useEffect(() => {
    let cancel = false;
    if (filterType !== "all" || filterStatus !== "all") {
      setServerStats(null);
      return undefined;
    }
    reportApi
      .getReportStats()
      .then((s) => {
        if (!cancel) setServerStats(s);
      })
      .catch(() => {
        if (!cancel) setServerStats(null);
      });
    return () => {
      cancel = true;
    };
  }, [filterType, filterStatus]);

  // Fetch reports from API
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true);
        const filters: { type?: string; status?: string } = {};
        if (filterType !== "all") filters.type = filterType;
        if (filterStatus !== "all") filters.status = filterStatus;
        
        const data = await reportApi.getReports(filters);
        setReports(data);
      } catch (error: any) {
        console.error('Error fetching reports:', error);
        toast.error('ไม่สามารถโหลดรายงานได้ กรุณาลองอีกครั้ง');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [filterType, filterStatus]);

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.sender?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      `RPT-${String(report.id).padStart(3, '0')}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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

  const reportTypeLabelTh: Record<ReportType, string> = {
    suggestion: "ข้อเสนอแนะ",
    complaint: "ข้อร้องเรียน",
    issue: "ปัญหา",
    question: "คำถาม",
    appreciation: "คำชม",
    feedback: "ข้อเสนอแนะ",
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
      <Badge
        className={`${colors[type]} whitespace-normal flex-shrink-0 text-left gap-1 py-1 items-start justify-start min-w-0`}
      >
        <span className="shrink-0">{getTypeIcon(type)}</span>
        <span>{reportTypeLabelTh[type]}</span>
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

  const handleAssignReviewer = async () => {
    if (!selectedReport || !assignedReviewer) {
      toast.error("กรุณาเลือกผู้ตรวจสอบ");
      return;
    }

    try {
      const updatedReport = await reportApi.updateReportStatus(selectedReport.id, {
        status: "in-review",
        assignedTo: assignedReviewer,
      });
      setReports((prev) =>
        prev.map((r) => (r.id === selectedReport.id ? updatedReport : r))
      );
      setSelectedReport(updatedReport);
      toast.success(`มอบหมายรายงานให้ ${assignedReviewer} แล้ว`);
      setAssignedReviewer("");
    } catch (error: any) {
      console.error('Error assigning reviewer:', error);
      toast.error('ไม่สามารถมอบหมายผู้ตรวจสอบได้ กรุณาลองอีกครั้ง');
    }
  };

  const handleMarkResolved = async () => {
    if (!selectedReport) return;

    try {
      const updatedReport = await reportApi.updateReportStatus(selectedReport.id, {
        status: "resolved",
      });
      setReports((prev) =>
        prev.map((r) => (r.id === selectedReport.id ? updatedReport : r))
      );
      setSelectedReport(updatedReport);
      toast.success("ทำเครื่องหมายรายงานว่าแก้ไขแล้ว");
    } catch (error: any) {
      console.error('Error marking resolved:', error);
      toast.error('ไม่สามารถอัปเดตสถานะได้ กรุณาลองอีกครั้ง');
    }
  };

  const handleSendResponse = async () => {
    if (!selectedReport || !responseText.trim()) {
      toast.error("กรุณากรอกคำตอบ");
      return;
    }

    try {
      const updatedReport = await reportApi.updateReportResponse(selectedReport.id, {
        response: responseText,
      });
      setReports((prev) =>
        prev.map((r) => (r.id === selectedReport.id ? updatedReport : r))
      );
      setSelectedReport(updatedReport);
      toast.success("ส่งคำตอบสำเร็จแล้ว");
      setResponseText("");
      setIsResponseDialogOpen(false);
    } catch (error: any) {
      console.error('Error sending response:', error);
      toast.error('ไม่สามารถส่งคำตอบได้ กรุณาลองอีกครั้ง');
    }
  };

  const handleExportCSV = () => {
    const header = [
      "id",
      "type",
      "subject",
      "sender",
      "club",
      "status",
      "assignedTo",
      "createdAt",
      "updatedAt",
    ];
    const lines = [
      header.join(","),
      ...filteredReports.map((r) =>
        [
          String(r.id),
          csvEscape(String(r.type)),
          csvEscape(r.subject ?? ""),
          csvEscape(r.sender?.name ?? ""),
          csvEscape(r.sender?.club ?? ""),
          csvEscape(String(r.status)),
          csvEscape(r.assignedTo ?? ""),
          csvEscape(String(r.createdAt ?? "")),
          csvEscape(String(r.updatedAt ?? "")),
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports-${Date.now()}.csv`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("ส่งออก CSV แล้ว");
  };

  const stats = useMemo(() => {
    if (
      serverStats &&
      filterType === "all" &&
      filterStatus === "all"
    ) {
      const by = serverStats.byStatus;
      return {
        total: serverStats.total,
        new: Number(by.new ?? 0),
        inReview: Number(by["in-review"] ?? 0),
        resolved: Number(by.resolved ?? 0),
      };
    }
    return {
      total: reports.length,
      new: reports.filter((r) => r.status === "new").length,
      inReview: reports.filter((r) => r.status === "in-review").length,
      resolved: reports.filter((r) => r.status === "resolved").length,
    };
  }, [serverStats, reports, filterType, filterStatus]);

  return (
    <PageChrome
      title="Report Inbox"
      description="กล่องข้อความรวมศูนย์สำหรับรายงาน ปัญหา และข้อเสนอแนะทั้งหมด"
      actions={
        <Button onClick={handleExportCSV} className="w-full sm:w-auto shrink-0">
          <Download className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">ส่งออก CSV</span>
          <span className="sm:hidden">ส่งออก</span>
        </Button>
      }
    >
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatsCard title="รายงานทั้งหมด" value={stats.total} />
        <StatsCard title="ใหม่" value={stats.new} valueClassName="text-blue-600" />
        <StatsCard title="กำลังตรวจสอบ" value={stats.inReview} valueClassName="text-yellow-600" />
        <StatsCard title="แก้ไขแล้ว" value={stats.resolved} valueClassName="text-green-600" />
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

      {/* Reports table */}
      <Card>
        <CardHeader>
          <CardTitle>รายงาน</CardTitle>
          <CardDescription>
            พบ {filteredReports.length} รายงาน — แตะแถวเพื่อเปิดรายละเอียด
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AsyncBoundary loading={isLoading}>
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
                  {filteredReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        ไม่พบรายงาน
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReports.map((report) => (
                      <TableRow
                        key={report.id}
                        tabIndex={0}
                        role="button"
                        className="cursor-pointer hover:bg-muted/60 focus-visible:bg-muted/60 outline-none"
                        onClick={() => {
                          setSelectedReport(report);
                          setIsDetailDialogOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedReport(report);
                            setIsDetailDialogOpen(true);
                          }
                        }}
                      >
                      <TableCell>
                        <code className="text-xs">RPT-{String(report.id).padStart(3, '0')}</code>
                      </TableCell>
                      <TableCell>{getTypeBadge(report.type)}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm truncate max-w-[200px]">{report.subject}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm truncate max-w-[150px]">{report.sender?.name || 'Unknown'}</p>
                          {report.sender?.club && (
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">{report.sender.club}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(report.createdAt).toLocaleDateString("th-TH")}
                        </span>
                      </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </AsyncBoundary>
        </CardContent>
      </Card>

      {selectedReport && (
        <Dialog
          open={isDetailDialogOpen}
          onOpenChange={(open) => {
            setIsDetailDialogOpen(open);
            if (!open) {
              setSelectedReport(null);
              setAssignedReviewer("");
            }
          }}
        >
          <DialogContent
            className="flex max-w-lg flex-col gap-0 overflow-hidden sm:max-w-lg"
            style={{ maxHeight: "min(90vh, 800px)", maxWidth: "min(42rem, calc(100vw - 2rem))" }}
          >
            <DialogHeader className="shrink-0 space-y-1 pb-4 pr-8">
              <DialogTitle>รายละเอียดรายงาน</DialogTitle>
              <DialogDescription className="font-mono text-foreground">
                RPT-{String(selectedReport.id).padStart(3, "0")}
              </DialogDescription>
            </DialogHeader>
            <div
              className="custom-scrollbar space-y-4 overflow-y-auto pb-4"
              style={{ paddingRight: "0.5rem", WebkitOverflowScrolling: "touch" }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>ประเภท</Label>
                  <div className="mt-1">{getTypeBadge(selectedReport.type)}</div>
                </div>
                <div>
                  <Label>สถานะ</Label>
                  <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                </div>
              </div>
              <div>
                <Label>หัวข้อ</Label>
                <p className="text-sm font-medium mt-1">{selectedReport.subject}</p>
              </div>
              <div>
                <Label>ผู้ส่ง</Label>
                <div className="mt-1 space-y-1">
                  <p className="text-sm">{selectedReport.sender?.name || "Unknown"}</p>
                  {selectedReport.sender?.email ? (
                    <p className="text-xs text-muted-foreground">{selectedReport.sender.email}</p>
                  ) : null}
                  {selectedReport.sender?.club ? (
                    <p className="text-xs text-muted-foreground">{selectedReport.sender.club}</p>
                  ) : null}
                </div>
              </div>
              <div>
                <Label>ข้อความ</Label>
                <div
                  className="mt-2 rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground whitespace-pre-wrap overflow-y-auto custom-scrollbar"
                  style={{ maxHeight: "min(240px, 40vh)" }}
                >
                  {selectedReport.message}
                </div>
              </div>
              <div className="grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <Label>วันที่ส่ง</Label>
                  <p className="mt-1">{new Date(selectedReport.createdAt).toLocaleString("th-TH")}</p>
                </div>
                <div>
                  <Label>อัปเดตล่าสุด</Label>
                  <p className="mt-1">{new Date(selectedReport.updatedAt).toLocaleString("th-TH")}</p>
                </div>
              </div>
              {selectedReport.assignedTo ? (
                <div>
                  <Label>มอบหมายให้</Label>
                  <p className="text-sm mt-1">{selectedReport.assignedTo}</p>
                </div>
              ) : null}
              {selectedReport.response ? (
                <div>
                  <Label>คำตอบจากผู้ดูแล</Label>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {selectedReport.response}
                  </p>
                  {selectedReport.responseDate ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(selectedReport.responseDate).toLocaleString("th-TH")}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="border-t pt-4 space-y-3">
                {selectedReport.status === "new" && (
                  <div className="space-y-2">
                    <Label>มอบหมายผู้ตรวจสอบ</Label>
                    <Select
                      value={assignedReviewer}
                      onValueChange={setAssignedReviewer}
                      disabled={reviewerOptions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            reviewerOptions.length === 0 ? "โหลดรายการผู้ดูแลระบบ…" : "เลือกผู้ตรวจสอบ..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {reviewerOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleAssignReviewer}
                      className="w-full"
                      size="sm"
                      disabled={reviewerOptions.length === 0 || !assignedReviewer}
                    >
                      มอบหมายผู้ตรวจสอบ
                    </Button>
                  </div>
                )}
                {selectedReport.status === "in-review" && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={handleMarkResolved} className="flex-1" size="sm" variant="outline">
                      ทำเครื่องหมายว่าแก้ไขแล้ว
                    </Button>
                    <Button onClick={() => setIsResponseDialogOpen(true)} className="flex-1" size="sm">
                      <Send className="h-4 w-4 mr-2" />
                      ส่งคำตอบ
                    </Button>
                  </div>
                )}
                {selectedReport.status === "new" && (
                  <Button
                    onClick={() => setIsResponseDialogOpen(true)}
                    className="w-full"
                    size="sm"
                    variant="outline"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    ส่งคำตอบ
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Send Response Dialog */}
      {selectedReport && (
        <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ส่งคำตอบติดตาม</DialogTitle>
              <DialogDescription>
                ตอบกลับ {selectedReport.sender?.name || 'Unknown'}
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
    </PageChrome>
  );
}
