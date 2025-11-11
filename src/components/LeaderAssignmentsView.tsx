import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { 
  ClipboardList, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Eye,
  Calendar,
  CheckCircle2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";

interface LeaderAssignmentsViewProps {
  user: User;
}

type AssignmentStatus = "pending" | "in-progress" | "completed" | "overdue";

interface Assignment {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: AssignmentStatus;
  createdAt: string;
  createdBy: string;
  assignedClubs: string[];
  notes?: string;
  submittedAt?: string;
}

type KanbanColumn = "open" | "in-progress" | "completed";

export function LeaderAssignmentsView({ user }: LeaderAssignmentsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [draggedAssignment, setDraggedAssignment] = useState<Assignment | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumn | null>(null);

  // Get the leader's club name/ID
  const leaderClubName = user.clubName || "ชมรมดนตรีสากล";
  const leaderClubId = user.clubId;

  // Mock all assignments (as if from Super Admin's Assignment Center)
  // In a real app, this would come from an API
  const allAssignments: Assignment[] = [
    {
      id: "ASG-001",
      title: "Submit Annual Activity Report",
      description: "All clubs must submit their annual activity report by the deadline. Include all events and member participation.",
      deadline: "2025-11-30",
      status: "in-progress",
      createdAt: "2025-11-01",
      createdBy: "Super Admin",
      assignedClubs: ["ชมรมดนตรีสากล", "ชมรมภาพถ่าย", "ชมรมหุ่นยนต์"],
      notes: "Working on compiling event photos and attendance records",
    },
    {
      id: "ASG-002",
      title: "Planning for Next Quarter",
      description: "Prepare and submit planning documents for Q1 2026. Include detailed breakdown of expected activities.",
      deadline: "2025-11-20",
      status: "pending",
      createdAt: "2025-11-05",
      createdBy: "Super Admin",
      assignedClubs: ["ชมรมดนตรีสากล", "ชมรมอาสาพัฒนา"],
    },
    {
      id: "ASG-003",
      title: "Event Safety Checklist",
      description: "Complete and submit event safety checklist for upcoming events in December.",
      deadline: "2025-11-15",
      status: "completed",
      createdAt: "2025-10-28",
      createdBy: "Super Admin",
      assignedClubs: ["ชมรมกีฬาแบดมินตัน"],
      submittedAt: "2025-11-10T14:30:00",
    },
    {
      id: "ASG-004",
      title: "Member Registration Update",
      description: "Update member registration information in the system. Verify all current members are properly registered.",
      deadline: "2025-11-10",
      status: "overdue",
      createdAt: "2025-10-25",
      createdBy: "Super Admin",
      assignedClubs: ["ชมรมดนตรีสากล", "ชมรมภาษาญี่ปุ่น", "ชมรมการ์ตูนและอนิเมะ"],
      notes: "Almost done, need to verify a few more members",
    },
    {
      id: "ASG-005",
      title: "Quarterly Financial Report",
      description: "Submit quarterly financial report for Q4 2025.",
      deadline: "2025-12-05",
      status: "pending",
      createdAt: "2025-11-10",
      createdBy: "Super Admin",
      assignedClubs: ["ชมรมภาพถ่าย", "ชมรมหุ่นยนต์"],
    },
  ];

  // Filter assignments to only show those assigned to this leader's club
  const [assignments, setAssignments] = useState<Assignment[]>(
    allAssignments.filter((assignment) => 
      assignment.assignedClubs.includes(leaderClubName) || 
      (leaderClubId && assignment.assignedClubs.some(club => club === leaderClubId))
    )
  );

  // Map status to Kanban column
  const getColumnForStatus = (status: AssignmentStatus): KanbanColumn => {
    if (status === "pending") return "open";
    if (status === "completed") return "completed";
    return "in-progress"; // in-progress and overdue go to "in-progress"
  };

  // Get assignments for each column
  const getAssignmentsForColumn = (column: KanbanColumn): Assignment[] => {
    const filtered = assignments.filter((assignment) => {
      const matchesSearch =
        assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch && getColumnForStatus(assignment.status) === column;
    });
    return filtered;
  };

  const getStatusBadge = (status: AssignmentStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            รอ
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            กำลังดำเนินการ
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            เสร็จสมบูรณ์
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            เกินกำหนด
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleStartAssignment = (assignmentId: string) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId
          ? { ...a, status: "in-progress" as const }
          : a
      )
    );
    toast.success("เริ่มงานมอบหมายแล้ว");
  };

  const handleSubmitAssignment = () => {
    if (!selectedAssignment) return;

    setAssignments((prev) =>
      prev.map((a) =>
        a.id === selectedAssignment.id
          ? {
              ...a,
              status: "completed" as const,
              notes: submissionNotes || a.notes,
              submittedAt: new Date().toISOString(),
            }
          : a
      )
    );
    toast.success("ส่งงานมอบหมายสำเร็จแล้ว");
    setIsSubmitDialogOpen(false);
    setSubmissionNotes("");
    setSelectedAssignment(null);
  };

  // Convert Kanban column to status
  const getStatusForColumn = (column: KanbanColumn): AssignmentStatus => {
    if (column === "open") return "pending";
    if (column === "completed") return "completed";
    return "in-progress";
  };

  const handleDragStart = (e: React.DragEvent, assignment: Assignment) => {
    setDraggedAssignment(assignment);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", assignment.id);
  };

  const handleDragOver = (e: React.DragEvent, column: KanbanColumn) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(column);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumn: KanbanColumn) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedAssignment) return;

    const newStatus = getStatusForColumn(targetColumn);
    const currentColumn = getColumnForStatus(draggedAssignment.status);

    // Only update if dropped in a different column
    if (currentColumn !== targetColumn) {
      if (newStatus === "pending") {
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === draggedAssignment.id
              ? { ...a, status: "pending" as const }
              : a
          )
        );
        toast.success("ย้ายงานมอบหมายไปยังคำขอเปิดแล้ว");
      } else if (newStatus === "in-progress") {
        if (draggedAssignment.status === "pending") {
          handleStartAssignment(draggedAssignment.id);
        } else {
          setAssignments((prev) =>
            prev.map((a) =>
              a.id === draggedAssignment.id
                ? { ...a, status: "in-progress" as const }
                : a
            )
          );
          toast.success("ย้ายงานมอบหมายไปยังกำลังดำเนินการแล้ว");
        }
      } else if (newStatus === "completed") {
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === draggedAssignment.id
              ? {
                  ...a,
                  status: "completed" as const,
                  submittedAt: new Date().toISOString(),
                }
              : a
          )
        );
        toast.success("ทำเครื่องหมายงานมอบหมายเป็นเสร็จสมบูรณ์แล้ว");
      }
    }

    setDraggedAssignment(null);
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date() && new Date(deadline).toDateString() !== new Date().toDateString();
  };

  const stats = {
    open: assignments.filter((a) => getColumnForStatus(a.status) === "open").length,
    inProgress: assignments.filter((a) => getColumnForStatus(a.status) === "in-progress").length,
    completed: assignments.filter((a) => getColumnForStatus(a.status) === "completed").length,
  };

  const renderKanbanColumn = (column: KanbanColumn, title: string, icon: React.ReactNode) => {
    const columnAssignments = getAssignmentsForColumn(column);
    const columnColor = 
      column === "open" ? "border-yellow-200 bg-yellow-50/50" :
      column === "in-progress" ? "border-blue-200 bg-blue-50/50" :
      "border-green-200 bg-green-50/50";

    const isDragOver = dragOverColumn === column;
    const dragOverClass = isDragOver 
      ? "ring-4 ring-blue-500 ring-offset-2 bg-blue-100/30 border-blue-400" 
      : "";
    const showPlaceholder = isDragOver && draggedAssignment && getColumnForStatus(draggedAssignment.status) !== column;

    return (
      <div className="flex flex-col h-full min-h-[600px]">
        <Card 
          className={`${columnColor} border-2 ${dragOverClass} transition-all duration-200`}
          onDragOver={(e) => handleDragOver(e, column)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
              <Badge variant="secondary" className="ml-2">
                {columnAssignments.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-3 min-h-[400px]">
            {showPlaceholder && (
              <div className="border-2 border-dashed border-blue-400 bg-blue-50/50 rounded-lg p-4 mb-3">
                <p className="text-sm text-blue-600 font-medium text-center">
                  วางที่นี่เพื่อย้ายงานมอบหมาย
                </p>
              </div>
            )}
            {columnAssignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>ไม่มีงานมอบหมาย</p>
              </div>
            ) : (
              columnAssignments.map((assignment) => {
                const overdueFlag = isOverdue(assignment.deadline);
                const isDragging = draggedAssignment?.id === assignment.id;
                return (
                  <Card
                    key={assignment.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, assignment)}
                    className={`cursor-move hover:shadow-lg transition-all bg-white ${
                      isDragging ? "opacity-20 scale-90 shadow-2xl" : "hover:scale-[1.02]"
                    }`}
                    style={isDragging ? { 
                      transform: "scale(0.9)", 
                      opacity: 0.2,
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                    } : {}}
                    onClick={() => setSelectedAssignment(assignment)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <code className="text-xs text-muted-foreground">{assignment.id}</code>
                          <h4 className="font-medium text-sm mt-1 line-clamp-2">{assignment.title}</h4>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {assignment.description}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(assignment.deadline).toLocaleDateString("th-TH")}</span>
                        {overdueFlag && assignment.status !== "completed" && (
                          <Badge variant="destructive" className="text-xs ml-auto">เกินกำหนด</Badge>
                        )}
                      </div>

                      {getStatusBadge(assignment.status)}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2">My Assignments</h1>
        <p className="text-muted-foreground">
          ดูและจัดการงานมอบหมายที่มอบหมายให้ <strong>{leaderClubName}</strong>
        </p>
        {assignments.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            ยังไม่มีงานมอบหมายที่มอบหมายให้ชมรมของคุณ
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">คำขอเปิด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-yellow-600">{stats.open}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ใหม่ / ยังไม่ได้มอบหมาย
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">กำลังดำเนินการ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-blue-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground mt-1">
              มอบหมายและใช้งานอยู่
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">เสร็จสมบูรณ์</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              เสร็จสิ้น
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหางานมอบหมายตามหัวข้อหรือรหัส..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {renderKanbanColumn("open", "คำขอเปิด", <Clock className="h-4 w-4 text-yellow-600" />)}
        {renderKanbanColumn("in-progress", "กำลังดำเนินการ", <AlertCircle className="h-4 w-4 text-blue-600" />)}
        {renderKanbanColumn("completed", "เสร็จสมบูรณ์", <CheckCircle className="h-4 w-4 text-green-600" />)}
      </div>

      {/* Assignment Detail Dialog */}
      <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
        <DialogContent className="max-w-2xl">
          {selectedAssignment && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAssignment.title}</DialogTitle>
                <DialogDescription>
                  รหัสงานมอบหมาย: <code>{selectedAssignment.id}</code>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>คำอธิบาย</Label>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {selectedAssignment.description}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>กำหนดส่ง</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">
                        {new Date(selectedAssignment.deadline).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      {isOverdue(selectedAssignment.deadline) && selectedAssignment.status !== "completed" && (
                        <Badge variant="destructive" className="text-xs">เกินกำหนด</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>มอบหมายโดย</Label>
                    <p className="text-sm mt-1">{selectedAssignment.createdBy}</p>
                  </div>
                  <div>
                    <Label>สถานะ</Label>
                    <div className="mt-1">{getStatusBadge(selectedAssignment.status)}</div>
                  </div>
                </div>
                {selectedAssignment.notes && (
                  <div>
                    <Label>บันทึกของคุณ</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {selectedAssignment.notes}
                    </p>
                  </div>
                )}
                {selectedAssignment.submittedAt && (
                  <div>
                    <Label>ส่งเมื่อ</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(selectedAssignment.submittedAt).toLocaleString("th-TH")}
                    </p>
                  </div>
                )}
                <div className="pt-4 border-t space-y-3">
                  {selectedAssignment.status === "pending" && (
                    <Button onClick={() => handleStartAssignment(selectedAssignment.id)} className="w-full">
                      เริ่มงานมอบหมาย
                    </Button>
                  )}
                  {selectedAssignment.status === "in-progress" && (
                    <>
                      <div className="space-y-2">
                        <Label>เพิ่มบันทึก (ไม่บังคับ)</Label>
                        <Textarea
                          rows={3}
                          placeholder="เพิ่มบันทึกความคืบหน้า..."
                          value={selectedAssignment.notes || ""}
                          onChange={(e) => {
                            setAssignments((prev) =>
                              prev.map((a) =>
                                a.id === selectedAssignment.id ? { ...a, notes: e.target.value } : a
                              )
                            );
                          }}
                        />
                      </div>
                      <Button
                        onClick={() => {
                          setIsSubmitDialogOpen(true);
                        }}
                        className="w-full"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        ส่งงานมอบหมาย
                      </Button>
                    </>
                  )}
                  {selectedAssignment.status === "overdue" && (
                    <>
                      <div className="space-y-2">
                        <Label>เพิ่มบันทึก (ไม่บังคับ)</Label>
                        <Textarea
                          rows={3}
                          placeholder="เพิ่มบันทึกความคืบหน้า..."
                          value={selectedAssignment.notes || ""}
                          onChange={(e) => {
                            setAssignments((prev) =>
                              prev.map((a) =>
                                a.id === selectedAssignment.id ? { ...a, notes: e.target.value } : a
                              )
                            );
                          }}
                        />
                      </div>
                      <Button
                        onClick={() => {
                          setIsSubmitDialogOpen(true);
                        }}
                        className="w-full"
                        variant="destructive"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        ส่งงานมอบหมาย (เกินกำหนด)
                      </Button>
                    </>
                  )}
                  {selectedAssignment.status === "completed" && (
                    <div className="text-center py-4">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
                      <p className="text-sm font-medium">งานมอบหมายเสร็จสมบูรณ์</p>
                      {selectedAssignment.submittedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ส่งเมื่อ {new Date(selectedAssignment.submittedAt).toLocaleDateString("th-TH")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit Assignment Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ส่งงานมอบหมาย</DialogTitle>
            <DialogDescription>
              ยืนยันการส่งสำหรับ {selectedAssignment?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>บันทึกสุดท้าย (ไม่บังคับ)</Label>
              <Textarea
                rows={4}
                placeholder="เพิ่มบันทึกหรือความคิดเห็นสุดท้าย..."
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmitAssignment} className="flex-1">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                ยืนยันการส่ง
              </Button>
              <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
