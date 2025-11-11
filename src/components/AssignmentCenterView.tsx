import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { 
  ClipboardList, 
  Plus, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Edit,
  Trash2,
  Bell,
  Users,
  Calendar,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";

interface AssignmentCenterViewProps {
  user: User;
}

type AssignmentStatus = "pending" | "in-progress" | "completed" | "overdue";

interface Assignment {
  id: string;
  title: string;
  description: string;
  deadline: string;
  targetClubs: string[];
  assignedTo: string[];
  status: AssignmentStatus;
  createdAt: string;
  createdBy: string;
}

interface NewAssignmentForm {
  title: string;
  description: string;
  deadline: string;
  targetClubs: string[];
}

type KanbanColumn = "open" | "in-progress" | "completed";

export function AssignmentCenterView({ user }: AssignmentCenterViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewAssignmentOpen, setIsNewAssignmentOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [draggedAssignment, setDraggedAssignment] = useState<Assignment | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumn | null>(null);
  const [newAssignmentForm, setNewAssignmentForm] = useState<NewAssignmentForm>({
    title: "",
    description: "",
    deadline: "",
    targetClubs: [],
  });

  const availableClubs = [
    "ชมรมดนตรีสากล",
    "ชมรมภาพถ่าย",
    "ชมรมหุ่นยนต์",
    "ชมรมอาสาพัฒนา",
    "ชมรมกีฬาแบดมินตัน",
    "ชมรมภาษาญี่ปุ่น",
    "ชมรมการ์ตูนและอนิเมะ",
    "ชมรมธุรกิจและการลงทุน",
  ];

  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: "ASG-001",
      title: "Submit Annual Activity Report",
      description: "All clubs must submit their annual activity report by the deadline",
      deadline: "2025-11-30",
      targetClubs: ["ชมรมดนตรีสากล", "ชมรมภาพถ่าย", "ชมรมหุ่นยนต์"],
      assignedTo: ["สมหญิง หัวหน้า", "วิชัย ช่างภาพ", "ธนพล วิศวกร"],
      status: "in-progress",
      createdAt: "2025-11-01",
      createdBy: "Super Admin",
    },
    {
      id: "ASG-002",
      title: "Planning for Next Quarter",
      description: "Prepare and submit planning documents for Q1 2026",
      deadline: "2025-11-20",
      targetClubs: ["ชมรมดนตรีสากล", "ชมรมอาสาพัฒนา"],
      assignedTo: ["สมหญิง หัวหน้า", "นภา ใจดี"],
      status: "pending",
      createdAt: "2025-11-05",
      createdBy: "Super Admin",
    },
    {
      id: "ASG-003",
      title: "Event Safety Checklist",
      description: "Complete and submit event safety checklist for upcoming events",
      deadline: "2025-11-15",
      targetClubs: ["ชมรมกีฬาแบดมินตัน"],
      assignedTo: ["ศิริพร นักกีฬา"],
      status: "completed",
      createdAt: "2025-10-28",
      createdBy: "Super Admin",
    },
    {
      id: "ASG-004",
      title: "Member Registration Update",
      description: "Update member registration information in the system",
      deadline: "2025-11-10",
      targetClubs: ["ชมรมภาษาญี่ปุ่น", "ชมรมการ์ตูนและอนิเมะ"],
      assignedTo: ["พิมพ์ใจ ซากุระ", "ประภาส มังงะ"],
      status: "overdue",
      createdAt: "2025-10-25",
      createdBy: "Super Admin",
    },
  ]);

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

  const handleStatusChange = (assignmentId: string, newStatus: AssignmentStatus) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId
          ? {
              ...a,
              status: newStatus,
            }
          : a
      )
    );
    toast.success("อัปเดตสถานะงานมอบหมายแล้ว");
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
      handleStatusChange(draggedAssignment.id, newStatus);
    }

    setDraggedAssignment(null);
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAssignmentForm.title || !newAssignmentForm.deadline || newAssignmentForm.targetClubs.length === 0) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็นทั้งหมด");
      return;
    }

    // Mock: Get assigned leaders for selected clubs
    const assignedTo = newAssignmentForm.targetClubs.map((club) => {
      const leaders: Record<string, string> = {
        "ชมรมดนตรีสากล": "สมหญิง หัวหน้า",
        "ชมรมภาพถ่าย": "วิชัย ช่างภาพ",
        "ชมรมหุ่นยนต์": "ธนพล วิศวกร",
        "ชมรมอาสาพัฒนา": "นภา ใจดี",
        "ชมรมกีฬาแบดมินตัน": "ศิริพร นักกีฬา",
        "ชมรมภาษาญี่ปุ่น": "พิมพ์ใจ ซากุระ",
        "ชมรมการ์ตูนและอนิเมะ": "ประภาส มังงะ",
        "ชมรมธุรกิจและการลงทุน": "สมชาย นักธุรกิจ",
      };
      return leaders[club] || "ยังไม่ได้มอบหมาย";
    });

    const newAssignment: Assignment = {
      id: `ASG-${String(assignments.length + 1).padStart(3, "0")}`,
      title: newAssignmentForm.title,
      description: newAssignmentForm.description,
      deadline: newAssignmentForm.deadline,
      targetClubs: newAssignmentForm.targetClubs,
      assignedTo,
      status: "pending",
      createdAt: new Date().toISOString().split("T")[0],
      createdBy: user.name,
    };

    setAssignments((prev) => [newAssignment, ...prev]);
    toast.success("สร้างงานมอบหมายและส่งการแจ้งเตือนไปยังหัวหน้าแล้ว");
    
    // Reset form
    setNewAssignmentForm({
      title: "",
      description: "",
      deadline: "",
      targetClubs: [],
    });
    setIsNewAssignmentOpen(false);
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    toast.success("ลบงานมอบหมายแล้ว");
  };

  const stats = {
    open: assignments.filter((a) => getColumnForStatus(a.status) === "open").length,
    inProgress: assignments.filter((a) => getColumnForStatus(a.status) === "in-progress").length,
    completed: assignments.filter((a) => getColumnForStatus(a.status) === "completed").length,
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date() && new Date(deadline).toDateString() !== new Date().toDateString();
  };

  const getStatusBadge = (status: AssignmentStatus, isOverdueFlag?: boolean) => {
    if (isOverdueFlag && status !== "completed") {
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
          <AlertCircle className="h-3 w-3 mr-1" />
          เกินกำหนด
        </Badge>
      );
    }
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
                        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setIsEditOpen(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDeleteAssignment(assignment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {assignment.description}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(assignment.deadline).toLocaleDateString("th-TH")}</span>
                        {overdueFlag && assignment.status !== "completed" && (
                          <Badge variant="destructive" className="text-xs ml-auto">Overdue</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {assignment.targetClubs.length} ชมรม
                        </span>
                      </div>

                      {getStatusBadge(assignment.status, overdueFlag)}
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="mb-2">Assignment Center</h1>
          <p className="text-muted-foreground">
            สร้างและจัดการงานมอบหมายสำหรับหัวหน้าชมรม
          </p>
        </div>
        <Dialog open={isNewAssignmentOpen} onOpenChange={setIsNewAssignmentOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              สร้างงานมอบหมาย
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>สร้างงานมอบหมายใหม่</DialogTitle>
              <DialogDescription>
                สร้างงานมอบหมายที่จะส่งไปยังหัวหน้าชมรมที่เลือก
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assignment-title">หัวข้อ *</Label>
                <Input
                  id="assignment-title"
                  placeholder="เช่น ส่งรายงานกิจกรรมประจำปี"
                  value={newAssignmentForm.title}
                  onChange={(e) => setNewAssignmentForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-description">คำอธิบาย</Label>
                <Textarea
                  id="assignment-description"
                  placeholder="อธิบายความต้องการของงานมอบหมาย..."
                  rows={4}
                  value={newAssignmentForm.description}
                  onChange={(e) => setNewAssignmentForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-deadline">กำหนดส่ง *</Label>
                <Input
                  id="assignment-deadline"
                  type="date"
                  value={newAssignmentForm.deadline}
                  onChange={(e) => setNewAssignmentForm((prev) => ({ ...prev, deadline: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>ชมรมเป้าหมาย *</Label>
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  {availableClubs.map((club) => (
                    <div key={club} className="flex items-center space-x-2 py-2">
                      <Checkbox
                        id={`club-${club}`}
                        checked={newAssignmentForm.targetClubs.includes(club)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewAssignmentForm((prev) => ({
                              ...prev,
                              targetClubs: [...prev.targetClubs, club],
                            }));
                          } else {
                            setNewAssignmentForm((prev) => ({
                              ...prev,
                              targetClubs: prev.targetClubs.filter((c) => c !== club),
                            }));
                          }
                        }}
                      />
                      <Label
                        htmlFor={`club-${club}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {club}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  เลือกชมรม {newAssignmentForm.targetClubs.length} ชมรม
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  <Bell className="h-4 w-4 mr-2" />
                  สร้างและแจ้งเตือน
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewAssignmentOpen(false)}
                >
                  ยกเลิก
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
      <Dialog open={!!selectedAssignment && !isEditOpen} onOpenChange={() => setSelectedAssignment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
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
                  <p className="text-sm text-muted-foreground mt-1">{selectedAssignment.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>กำหนดส่ง</Label>
                    <p className="text-sm mt-1">
                      {new Date(selectedAssignment.deadline).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  <div>
                    <Label>สถานะ</Label>
                    <div className="mt-1">{getStatusBadge(selectedAssignment.status, isOverdue(selectedAssignment.deadline))}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>ชมรมเป้าหมาย</Label>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {selectedAssignment.targetClubs.map((club) => (
                        <Badge key={club} variant="outline" className="text-xs whitespace-nowrap">
                          {club}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>มอบหมายให้</Label>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {selectedAssignment.assignedTo.map((leader) => (
                        <Badge key={leader} variant="secondary" className="text-xs whitespace-nowrap">
                          {leader}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Label>เปลี่ยนสถานะ</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedAssignment.id, "pending")}
                      disabled={selectedAssignment.status === "pending"}
                    >
                      เปิด
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedAssignment.id, "in-progress")}
                      disabled={selectedAssignment.status === "in-progress"}
                    >
                      กำลังดำเนินการ
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedAssignment.id, "completed")}
                      disabled={selectedAssignment.status === "completed"}
                    >
                      เสร็จสมบูรณ์
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขงานมอบหมาย</DialogTitle>
            <DialogDescription>
              อัปเดตรายละเอียดงานมอบหมาย
            </DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <div className="space-y-4">
              <div>
                <Label>รหัสงานมอบหมาย</Label>
                <p className="text-sm font-mono">{selectedAssignment.id}</p>
              </div>
              <div>
                <Label>หัวข้อ</Label>
                <p className="text-sm font-medium">{selectedAssignment.title}</p>
              </div>
              <div>
                <Label>คำอธิบาย</Label>
                <p className="text-sm text-muted-foreground">{selectedAssignment.description}</p>
              </div>
              <div>
                <Label>ชมรมเป้าหมาย</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5 w-full">
                  {selectedAssignment.targetClubs.map((club) => (
                    <Badge key={club} variant="outline" className="text-xs whitespace-nowrap">
                      {club}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>กำหนดส่ง</Label>
                <p className="text-sm">{new Date(selectedAssignment.deadline).toLocaleDateString("th-TH")}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
