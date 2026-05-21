import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { MessageSquare, Plus, ThumbsUp, ThumbsDown, Lightbulb, AlertCircle, Check, Settings, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { toast } from "sonner";
import axios from "axios";
import type { User } from "../App";
import { reportApi } from "../features/report/api/reportApi";
import type { Report, ReportType } from "../features/report/types/report";

/** Types shown on the Feedback page (excludes inbox-only `issue`). */
const FEEDBACK_SURFACE_TYPES = new Set<ReportType>([
  "feedback",
  "suggestion",
  "complaint",
  "question",
  "appreciation",
]);

const CATEGORY_LABELS: Record<string, string> = {
  equipment: "อุปกรณ์",
  event: "กิจกรรม",
  facility: "สถานที่",
  schedule: "ตารางเวลา",
  activity: "ชมรม / กิจกรรมประจำ",
  other: "อื่นๆ",
};

interface FeedbackViewProps {
  user: User;
}

interface FeedbackClubOption {
  value: string;
  label: string;
}

export function FeedbackView({ user }: FeedbackViewProps) {
  const [isNewFeedbackOpen, setIsNewFeedbackOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Report | null>(null);
  const [feedbacks, setFeedbacks] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackKind, setFeedbackKind] = useState<string>("");
  const [feedbackCategory, setFeedbackCategory] = useState<string>("");
  const [feedbackClub, setFeedbackClub] = useState<string>("");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [responseDraft, setResponseDraft] = useState("");
  const [isSavingResponse, setIsSavingResponse] = useState(false);

  const feedbackClubOptions = useMemo<FeedbackClubOption[]>(() => {
    const fromMemberships =
      user.memberships
        ?.filter((m) => m.status === "approved")
        .map((m) => ({
          value: m.clubPublicId ?? String(m.clubId),
          label: m.clubName?.trim() || `ชมรม #${m.clubId}`,
        }))
        .filter((o) => o.value.length > 0) ?? [];

    if (fromMemberships.length > 0) {
      const deduped = new Map<string, FeedbackClubOption>();
      fromMemberships.forEach((o) => {
        if (!deduped.has(o.value)) deduped.set(o.value, o);
      });
      return Array.from(deduped.values());
    }

    if (user.clubId || user.clubName) {
      return [
        {
          value: user.clubId || "legacy-club",
          label: user.clubName?.trim() || "ชมรมของฉัน",
        },
      ];
    }

    return [];
  }, [user.memberships, user.clubId, user.clubName]);

  const loadFeedbacks = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await reportApi.getReports();
      setFeedbacks(
        data.filter((r) => FEEDBACK_SURFACE_TYPES.has(String(r.type).toLowerCase() as ReportType)),
      );
    } catch (error: unknown) {
      console.error("Error fetching feedbacks:", error);
      toast.error("ไม่สามารถโหลดข้อมูลข้อเสนอแนะได้ กรุณาลองอีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  useEffect(() => {
    setResponseDraft(selectedFeedback?.response ?? "");
  }, [selectedFeedback?.id, selectedFeedback?.response]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "suggestion":
        return <Lightbulb className="h-4 w-4" />;
      case "complaint":
        return <AlertCircle className="h-4 w-4" />;
      case "appreciation":
        return <ThumbsUp className="h-4 w-4" />;
      case "question":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "suggestion":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            <Lightbulb className="h-3 w-3 mr-1" />
            Suggestion
          </Badge>
        );
      case "complaint":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            Complaint
          </Badge>
        );
      case "appreciation":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <ThumbsUp className="h-3 w-3 mr-1" />
            Appreciation
          </Badge>
        );
      case "question":
        return (
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
            <MessageSquare className="h-3 w-3 mr-1" />
            Question
          </Badge>
        );
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="outline">ใหม่</Badge>;
      case "in-review":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            ตรวจสอบแล้ว
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <Check className="h-3 w-3 mr-1" />
            แก้ไขแล้ว
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const resetFeedbackForm = () => {
    setFeedbackKind("");
    setFeedbackCategory("");
    setFeedbackClub("");
    setFeedbackSubject("");
    setFeedbackMessage("");
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackKind.trim() || !feedbackCategory.trim() || !feedbackClub.trim()) {
      toast.error("กรุณาเลือกประเภท หมวดหมู่ และชมรม");
      return;
    }
    const subjectTrim = feedbackSubject.trim();
    const bodyTrim = feedbackMessage.trim();
    if (!subjectTrim || !bodyTrim) {
      toast.error("กรุณากรอกหัวข้อและข้อความ");
      return;
    }

    const catLabel = CATEGORY_LABELS[feedbackCategory] ?? feedbackCategory;
    const selectedClubLabel =
      feedbackClubOptions.find((c) => c.value === feedbackClub)?.label || feedbackClub;
    const composedMessage = `[ชมรม: ${selectedClubLabel}]\n[หมวดหมู่: ${catLabel}]\n\n${bodyTrim}`;

    setIsSubmittingFeedback(true);
    try {
      await reportApi.createReport({
        type: feedbackKind as ReportType,
        subject: subjectTrim,
        message: composedMessage,
        targetClubPublicId: feedbackClub,
      });
      toast.success(
        "ส่งข้อเสนอแนะสำเร็จแล้ว — หัวหน้าชมรมจะตรวจสอบในเร็วๆ นี้",
        { duration: 5000 },
      );
      resetFeedbackForm();
      setIsNewFeedbackOpen(false);
      await loadFeedbacks();
    } catch (error: unknown) {
      console.error("createReport:", error);
      let msg: string | undefined;
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as
          | { message?: unknown; error?: { message?: unknown } }
          | undefined;
        if (typeof data?.message === "string") msg = data.message;
        if (msg === undefined && typeof data?.error?.message === "string") {
          msg = data.error.message;
        }
      }
      const safe =
        typeof msg === "string" && msg.trim().length > 0
          ? msg.trim()
          : "ส่งข้อเสนอแนะไม่สำเร็จ กรุณาลองใหม่";
      toast.error(safe, { duration: 6000 });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const stats = {
    total: feedbacks.length,
    new: feedbacks.filter((f) => f.status === "new").length,
    reviewed: feedbacks.filter((f) => f.status === "in-review").length,
    resolved: feedbacks.filter((f) => f.status === "resolved").length,
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="mb-2">Feedback & Suggestions</h1>
          <p className="text-muted-foreground">
            {user.role === "member" 
              ? "แบ่งปันความคิดเห็น ข้อเสนอแนะ และข้อกังวลของคุณกับหัวหน้าชมรม"
              : "ตรวจสอบและตอบกลับข้อเสนอแนะจากสมาชิกชมรม"
            }
          </p>
        </div>
        <Dialog
          open={isNewFeedbackOpen}
          onOpenChange={(open) => {
            setIsNewFeedbackOpen(open);
            if (!open) resetFeedbackForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              ส่งข้อเสนอแนะ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>ส่งข้อเสนอแนะ</DialogTitle>
              <DialogDescription>
                ข้อเสนอแนะของคุณช่วยให้เราปรับปรุงประสบการณ์ชมรมได้ดีขึ้น
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback-type">ประเภทข้อเสนอแนะ</Label>
                <Select value={feedbackKind} onValueChange={setFeedbackKind} required>
                  <SelectTrigger id="feedback-type">
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggestion">ข้อเสนอแนะ</SelectItem>
                    <SelectItem value="complaint">ข้อร้องเรียน</SelectItem>
                    <SelectItem value="appreciation">คำชม</SelectItem>
                    <SelectItem value="question">คำถาม</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-category">หมวดหมู่</Label>
                <Select value={feedbackCategory} onValueChange={setFeedbackCategory} required>
                  <SelectTrigger id="feedback-category">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipment">อุปกรณ์</SelectItem>
                    <SelectItem value="event">กิจกรรม</SelectItem>
                    <SelectItem value="facility">สถานที่</SelectItem>
                    <SelectItem value="schedule">ตารางเวลา</SelectItem>
                    <SelectItem value="activity">ชมรม / กิจกรรมประจำ</SelectItem>
                    <SelectItem value="other">อื่นๆ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-club">ชมรมที่ต้องการส่งข้อเสนอแนะ</Label>
                <Select
                  value={feedbackClub}
                  onValueChange={setFeedbackClub}
                  required
                  disabled={feedbackClubOptions.length === 0}
                >
                  <SelectTrigger id="feedback-club">
                    <SelectValue
                      placeholder={
                        feedbackClubOptions.length === 0
                          ? "ไม่พบชมรมที่สังกัด"
                          : "เลือกชมรม"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {feedbackClubOptions.map((club) => (
                      <SelectItem key={club.value} value={club.value}>
                        {club.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-subject">หัวข้อ</Label>
                <Input
                  id="feedback-subject"
                  placeholder="สรุปข้อเสนอแนะของคุณอย่างย่อ"
                  required
                  value={feedbackSubject}
                  onChange={(e) => setFeedbackSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-message">ข้อความ</Label>
                <Textarea
                  id="feedback-message"
                  placeholder="ให้ข้อเสนอแนะโดยละเอียด..."
                  rows={5}
                  required
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={isSubmittingFeedback}>
                  {isSubmittingFeedback ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      กำลังส่ง...
                    </>
                  ) : (
                    "ส่งข้อเสนอแนะ"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsNewFeedbackOpen(false);
                  }}
                  disabled={isSubmittingFeedback}
                >
                  ยกเลิก
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats - Only for leaders and admins */}
      {(user.role === "leader" || user.role === "admin") && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">ข้อเสนอแนะทั้งหมด</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">ตลอดเวลา</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">ใหม่</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-blue-600">{stats.new}</div>
              <p className="text-xs text-muted-foreground mt-1">รอการตรวจสอบ</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">ตรวจสอบแล้ว</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-yellow-600">{stats.reviewed}</div>
              <p className="text-xs text-muted-foreground mt-1">กำลังดำเนินการ</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">แก้ไขแล้ว</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-green-600">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground mt-1">เสร็จสมบูรณ์</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feedback List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-6 w-6 mt-6 mx-auto text-muted-foreground opacity-70 animate-spin" aria-hidden />
            </CardContent>
          </Card>
        ) : feedbacks.length === 0 ? (
          <Card>
            <CardContent className="py-12 mt-6 text-center text-muted-foreground">
              ไม่พบข้อเสนอแนะ
            </CardContent>
          </Card>
        ) : (
          feedbacks.map((feedback) => (
          <Card
            key={feedback.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedFeedback(feedback)}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getTypeBadge(feedback.type)}
                    {getStatusBadge(feedback.status)}
                  </div>
                  <CardTitle className="text-base mb-1">{feedback.subject}</CardTitle>
                  <CardDescription>
                    โดย {feedback.sender?.name || 'ไม่ระบุชื่อ'} • {new Date(feedback.createdAt).toLocaleDateString('th-TH')}
                  </CardDescription>
                </div>
                {/* Status Change Dropdown - Only for leaders */}
                {(user.role === "leader" || user.role === "admin") && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[9999]">
                      <DropdownMenuItem
                        onSelect={(e: Event) => {
                          e.preventDefault();
                          void (async () => {
                            try {
                              const updated = await reportApi.updateReportStatus(feedback.id, {
                                status: "new",
                              });
                              setFeedbacks((prev) =>
                                prev.map((f) => (f.id === feedback.id ? updated : f)),
                              );
                              setSelectedFeedback((cur) =>
                                cur?.id === feedback.id ? updated : cur,
                              );
                              toast.success("เปลี่ยนสถานะเป็นใหม่แล้ว");
                            } catch {
                              toast.error("อัปเดตสถานะไม่สำเร็จ");
                            }
                          })();
                        }}
                      >
                        ใหม่
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e: Event) => {
                          e.preventDefault();
                          void (async () => {
                            try {
                              const updated = await reportApi.updateReportStatus(feedback.id, {
                                status: "in-review",
                              });
                              setFeedbacks((prev) =>
                                prev.map((f) => (f.id === feedback.id ? updated : f)),
                              );
                              setSelectedFeedback((cur) =>
                                cur?.id === feedback.id ? updated : cur,
                              );
                              toast.success("เปลี่ยนสถานะเป็นตรวจสอบแล้ว");
                            } catch {
                              toast.error("อัปเดตสถานะไม่สำเร็จ");
                            }
                          })();
                        }}
                      >
                        ตรวจสอบแล้ว
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e: Event) => {
                          e.preventDefault();
                          void (async () => {
                            try {
                              const updated = await reportApi.updateReportStatus(feedback.id, {
                                status: "resolved",
                              });
                              setFeedbacks((prev) =>
                                prev.map((f) => (f.id === feedback.id ? updated : f)),
                              );
                              setSelectedFeedback((cur) =>
                                cur?.id === feedback.id ? updated : cur,
                              );
                              toast.success("เปลี่ยนสถานะเป็นแก้ไขแล้ว");
                            } catch {
                              toast.error("อัปเดตสถานะไม่สำเร็จ");
                            }
                          })();
                        }}
                      >
                        แก้ไขแล้ว
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {feedback.message}
              </p>
              {feedback.response && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 mb-1">คำตอบ:</p>
                  <p className="text-sm text-slate-700">{feedback.response}</p>
                </div>
              )}
            </CardContent>
          </Card>
          ))
        )}
      </div>

      {/* Feedback Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedFeedback.subject}</DialogTitle>
                <DialogDescription>
                  ส่งเมื่อ {new Date(selectedFeedback.createdAt).toLocaleDateString('th-TH')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  {getTypeBadge(selectedFeedback.type)}
                  {getStatusBadge(selectedFeedback.status)}
                </div>
                <div>
                  <Label>จาก</Label>
                  <p className="mt-1">{selectedFeedback.sender?.name || 'ไม่ระบุชื่อ'}</p>
                  {selectedFeedback.sender?.email && (
                    <p className="text-xs text-muted-foreground mt-1">{selectedFeedback.sender.email}</p>
                  )}
                </div>
                <div>
                  <Label>ข้อความ</Label>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedFeedback.message}
                  </p>
                </div>
                {selectedFeedback.response && (
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <Label>คำตอบจากหัวหน้าชมรม</Label>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selectedFeedback.response}
                    </p>
                  </div>
                )}
                {(user.role === "leader" || user.role === "admin") && !selectedFeedback.response && (
                  <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="response">เพิ่มคำตอบ</Label>
                    <p className="text-xs text-muted-foreground">
                      ถ้ามีคำตอบให้ระบุ หากไม่ต้องการพิมพ์กดปุ่มด้านล่างเพื่อปิดได้ทันที
                    </p>
                    <Textarea
                      id="response"
                      placeholder="พิมพ์คำตอบของคุณ (ไม่บังคับ)..."
                      rows={3}
                      value={responseDraft}
                      onChange={(e) => setResponseDraft(e.target.value)}
                    />
                    <Button
                      disabled={isSavingResponse}
                      onClick={() => {
                        void (async () => {
                          if (!selectedFeedback) return;
                          const text = responseDraft.trim();
                          if (text.length === 0) {
                            setSelectedFeedback(null);
                            return;
                          }
                          setIsSavingResponse(true);
                          try {
                            const updated = await reportApi.updateReportResponse(
                              selectedFeedback.id,
                              { response: text },
                            );
                            setFeedbacks((prev) =>
                              prev.map((f) => (f.id === updated.id ? updated : f)),
                            );
                            setSelectedFeedback(updated);
                            setResponseDraft("");
                            toast.success("บันทึกคำตอบแล้ว", { duration: 4000 });
                          } catch {
                            toast.error("ส่งคำตอบไม่สำเร็จ");
                          } finally {
                            setIsSavingResponse(false);
                          }
                        })();
                      }}
                    >
                      {isSavingResponse ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          กำลังบันทึก...
                        </>
                      ) : (
                        "บันทึกคำตอบหรือปิด"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
