import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { MessageSquare, Plus, ThumbsUp, ThumbsDown, Lightbulb, AlertCircle, Check, Settings } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { toast } from "sonner";
import type { User } from "../App";

interface FeedbackViewProps {
  user: User;
}

interface Feedback {
  id: number;
  type: "suggestion" | "complaint" | "appreciation" | "question";
  category: string;
  subject: string;
  message: string;
  submittedBy: string;
  date: string;
  status: "new" | "reviewed" | "resolved";
  response?: string;
}

export function FeedbackView({ user }: FeedbackViewProps) {
  const [isNewFeedbackOpen, setIsNewFeedbackOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([
    {
      id: 1,
      type: "suggestion",
      category: "Equipment",
      subject: "Request for More Microphones",
      message: "ขอเสนอให้ซื้อไมโครโฟนเพิ่มเติม เพราะตอนนี้ไม่พอสำหรับการซ้อมของสมาชิกทุกคน",
      submittedBy: "นภา สว่างใจ",
      date: "2025-11-06",
      status: "reviewed",
      response: "ขอบคุณสำหรับข้อเสนอแนะ ทางชมรมจะพิจารณาในการประชุมครั้งหน้า",
    },
    {
      id: 2,
      type: "appreciation",
      category: "Event",
      subject: "Great Workshop Last Week",
      message: "ขอบคุณสำหรับเวิร์คช็อปที่จัดเมื่อสัปดาห์ที่แล้ว ได้ความรู้เยอะมากครับ",
      submittedBy: "ธนพล แข็งแรง",
      date: "2025-11-05",
      status: "resolved",
      response: "ขอบคุณสำหรับกำลังใจครับ จะพยายามจัดกิจกรรมดีๆแบบนี้ต่อไป",
    },
    {
      id: 3,
      type: "complaint",
      category: "Facility",
      subject: "Practice Room Too Noisy",
      message: "ห้องซ้อมมีเสียงรบกวนจากห้องข้างๆมากเกินไป ทำให้ซ้อมได้ไม่เต็มที่",
      submittedBy: "พิมพ์ใจ ดีงาม",
      date: "2025-11-04",
      status: "new",
    },
    {
      id: 4,
      type: "question",
      category: "Schedule",
      subject: "Upcoming Concert Date Confirmation",
      message: "อยากขอยืนยันวันที่จัดคอนเสิร์ตหน่อยครับ เพราะไม่แน่ใจว่าวันที่ 15 หรือ 16",
      submittedBy: "วิชัย สุขใจ",
      date: "2025-11-03",
      status: "resolved",
      response: "คอนเสิร์ตจะจัดในวันที่ 15 พฤศจิกายน เวลา 19:00 น. ครับ",
    },
    {
      id: 5,
      type: "suggestion",
      category: "Activity",
      subject: "Collaboration with Other Clubs",
      message: "เสนอให้มีการทำกิจกรรมร่วมกับชมรมอื่นๆ เพื่อเพิ่มความหลากหลาย",
      submittedBy: "ศิริพร รุ่งเรือง",
      date: "2025-11-01",
      status: "reviewed",
      response: "ความคิดเห็นที่ดีมาก ทางชมรมกำลังติดต่อกับชมรมศิลปะอยู่ค่ะ",
    },
  ]);

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
      case "reviewed":
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

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("ส่งข้อเสนอแนะสำเร็จแล้ว! หัวหน้าชมรมจะตรวจสอบในเร็วๆ นี้");
    setIsNewFeedbackOpen(false);
  };

  const stats = {
    total: feedbacks.length,
    new: feedbacks.filter(f => f.status === "new").length,
    reviewed: feedbacks.filter(f => f.status === "reviewed").length,
    resolved: feedbacks.filter(f => f.status === "resolved").length,
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
        <Dialog open={isNewFeedbackOpen} onOpenChange={setIsNewFeedbackOpen}>
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
                <Select required>
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
                <Select required>
                  <SelectTrigger id="feedback-category">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipment">อุปกรณ์</SelectItem>
                    <SelectItem value="event">กิจกรรม</SelectItem>
                    <SelectItem value="facility">สถานที่</SelectItem>
                    <SelectItem value="schedule">ตารางเวลา</SelectItem>
                    <SelectItem value="activity">กิจกรรม</SelectItem>
                    <SelectItem value="other">อื่นๆ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-subject">หัวข้อ</Label>
                <Input
                  id="feedback-subject"
                  placeholder="สรุปข้อเสนอแนะของคุณอย่างย่อ"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-message">ข้อความ</Label>
                <Textarea
                  id="feedback-message"
                  placeholder="ให้ข้อเสนอแนะโดยละเอียด..."
                  rows={5}
                  required
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">ส่งข้อเสนอแนะ</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewFeedbackOpen(false)}
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
        {feedbacks
          .filter((feedback) => {
            // Members can only see "new" status feedback
            if (user.role === "member") {
              return feedback.status === "new";
            }
            // Leaders and admins can see all feedback
            return true;
          })
          .map((feedback) => (
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
                    <Badge variant="outline">{feedback.category}</Badge>
                    {getStatusBadge(feedback.status)}
                  </div>
                  <CardTitle className="text-base mb-1">{feedback.subject}</CardTitle>
                  <CardDescription>
                    โดย {feedback.submittedBy} • {new Date(feedback.date).toLocaleDateString('th-TH')}
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
                        onSelect={(e) => {
                          e.preventDefault();
                          setFeedbacks((prev) =>
                            prev.map((f) =>
                              f.id === feedback.id ? { ...f, status: "new" as const } : f
                            )
                          );
                          toast.success("เปลี่ยนสถานะเป็นใหม่แล้ว");
                        }}
                      >
                        ใหม่
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setFeedbacks((prev) =>
                            prev.map((f) =>
                              f.id === feedback.id ? { ...f, status: "reviewed" as const } : f
                            )
                          );
                          toast.success("เปลี่ยนสถานะเป็นตรวจสอบแล้ว");
                        }}
                      >
                        ตรวจสอบแล้ว
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setFeedbacks((prev) =>
                            prev.map((f) =>
                              f.id === feedback.id ? { ...f, status: "resolved" as const } : f
                            )
                          );
                          toast.success("เปลี่ยนสถานะเป็นแก้ไขแล้ว");
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
        ))}
      </div>

      {/* Feedback Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedFeedback.subject}</DialogTitle>
                <DialogDescription>
                  ส่งเมื่อ {new Date(selectedFeedback.date).toLocaleDateString('th-TH')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  {getTypeBadge(selectedFeedback.type)}
                  <Badge variant="outline">{selectedFeedback.category}</Badge>
                  {getStatusBadge(selectedFeedback.status)}
                </div>
                <div>
                  <Label>จาก</Label>
                  <p className="mt-1">{selectedFeedback.submittedBy}</p>
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
                    <Textarea
                      id="response"
                      placeholder="พิมพ์คำตอบของคุณ..."
                      rows={3}
                    />
                    <Button
                      onClick={() => {
                        toast.success("ส่งคำตอบสำเร็จแล้ว!");
                        setSelectedFeedback(null);
                      }}
                    >
                      ส่งคำตอบ
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
