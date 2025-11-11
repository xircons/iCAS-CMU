import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Avatar, AvatarImage, AvatarFallback, getDiceBearAvatar } from "./ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, Users, UserPlus, CheckCircle, XCircle, Clock, Settings } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";

interface ClubLeaderViewProps {
  user: User;
}

interface JoinRequest {
  id: string;
  memberName: string;
  studentId: string;
  requestDate: string;
  status: "pending" | "approved" | "rejected";
}

interface ActiveMember {
  id: string;
  name: string;
  studentId: string;
  role: "member" | "staff";
  joinDate: string;
  status: "active";
}

export function ClubLeaderView({ user }: ClubLeaderViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");

  // Mock join requests (pending requests from members)
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([
    {
      id: "req-1",
      memberName: "สมชาย ใจดี",
      studentId: "630510123",
      requestDate: "2025-11-05",
      status: "pending",
    },
    {
      id: "req-2",
      memberName: "สมหญิง รักดี",
      studentId: "630510124",
      requestDate: "2025-11-06",
      status: "pending",
    },
    {
      id: "req-3",
      memberName: "ประภาส มั่นคง",
      studentId: "630510125",
      requestDate: "2025-11-07",
      status: "pending",
    },
    {
      id: "req-6",
      memberName: "ธนพล แข็งแรง",
      studentId: "630510128",
      requestDate: "2025-10-10",
      status: "rejected",
    },
  ]);

  // Mock active members (current club members)
  const [activeMembers, setActiveMembers] = useState<ActiveMember[]>([
    {
      id: "mem-1",
      name: "ศิริพร รุ่งเรือง",
      studentId: "630510100",
      role: "staff",
      joinDate: "2025-09-01",
      status: "active",
    },
    {
      id: "mem-2",
      name: "พิมพ์ใจ ดีงาม",
      studentId: "630510101",
      role: "member",
      joinDate: "2025-09-15",
      status: "active",
    },
    {
      id: "mem-3",
      name: "วิชัย สุขใจ",
      studentId: "630510126",
      role: "member",
      joinDate: "2025-10-20",
      status: "active",
    },
    {
      id: "mem-4",
      name: "นภา สว่างใจ",
      studentId: "630510127",
      role: "member",
      joinDate: "2025-10-15",
      status: "active",
    },
  ]);

  const filteredRequests = joinRequests.filter((request) => {
    const matchesSearch = 
      request.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.studentId.includes(searchQuery);
    const matchesFilter = filterStatus === "all" || request.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const pendingRequests = joinRequests.filter(r => r.status === "pending");
  const approvedCount = joinRequests.filter(r => r.status === "approved").length;
  const rejectedCount = joinRequests.filter(r => r.status === "rejected").length;

  const handleApprove = (requestId: string) => {
    const request = joinRequests.find(r => r.id === requestId);
    if (!request) return;

    // Update request status
    setJoinRequests(joinRequests.map(r => 
      r.id === requestId ? { ...r, status: "approved" as const } : r
    ));

    // Add to active members
    setActiveMembers([...activeMembers, {
      id: `mem-${Date.now()}`,
      name: request.memberName,
      studentId: request.studentId,
      role: "member",
      joinDate: new Date().toISOString().split('T')[0],
      status: "active",
    }]);

    toast.success(`${request.memberName} ได้รับการอนุมัติและเพิ่มเข้าไปยังสมาชิกที่ใช้งานอยู่แล้ว!`);
  };

  const handleReject = (requestId: string) => {
    const request = joinRequests.find(r => r.id === requestId);
    if (!request) return;

    setJoinRequests(joinRequests.map(r => 
      r.id === requestId ? { ...r, status: "rejected" as const } : r
    ));

    toast.info(`คำขอของ${request.memberName}ถูกปฏิเสธแล้ว`);
  };

  const handleRemoveMember = (memberId: string) => {
    const member = activeMembers.find(m => m.id === memberId);
    if (!member) return;

    setActiveMembers(activeMembers.filter(m => m.id !== memberId));
    toast.success(`ลบ${member.name}ออกจากชมรมแล้ว`);
  };

  const handleChangeRole = (memberId: string, newRole: "member" | "staff") => {
    setActiveMembers(activeMembers.map(m => 
      m.id === memberId ? { ...m, role: newRole } : m
    ));
    toast.success("อัปเดตบทบาทสมาชิกสำเร็จแล้ว!");
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2">Club Management</h1>
        <p className="text-muted-foreground">
          จัดการคำขอเข้าร่วมและสมาชิกที่ใช้งานอยู่สำหรับ {user.clubName || "ชมรมของคุณ"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">คำขอที่รอ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-yellow-600">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              รอการอนุมัติ
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">สมาชิกที่ใช้งานอยู่</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">{activeMembers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              สมาชิกปัจจุบัน
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">อนุมัติแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{approvedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              อนุมัติทั้งหมด
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">ปฏิเสธแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-red-600">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ปฏิเสธทั้งหมด
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Join Requests Section */}
      <Card>
        <CardHeader>
          <CardTitle>คำขอเข้าร่วม</CardTitle>
          <CardDescription>
            จัดการคำขอเข้าร่วมที่รอจากสมาชิก
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาตามชื่อหรือรหัสนักศึกษา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: "all" | "pending" | "approved" | "rejected") => setFilterStatus(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="กรองตามสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                <SelectItem value="pending">รอ</SelectItem>
                <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                <SelectItem value="rejected">ปฏิเสธแล้ว</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requests Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อสมาชิก</TableHead>
                <TableHead>รหัสนักศึกษา</TableHead>
                <TableHead>วันที่ขอ</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>การดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>ไม่พบคำขอ</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={getDiceBearAvatar(request.memberName)} />
                          <AvatarFallback>
                            {request.memberName.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{request.memberName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{request.studentId}</TableCell>
                    <TableCell>
                      {new Date(request.requestDate).toLocaleDateString('th-TH')}
                    </TableCell>
                    <TableCell>
                      {request.status === "pending" && (
                        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                          <Clock className="h-3 w-3 mr-1" />
                          รอการอนุมัติ
                        </Badge>
                      )}
                      {request.status === "approved" && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          อนุมัติแล้ว
                        </Badge>
                      )}
                      {request.status === "rejected" && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                          <XCircle className="h-3 w-3 mr-1" />
                          ปฏิเสธแล้ว
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(request.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            อนุมัติ
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            ปฏิเสธ
                          </Button>
                        </div>
                      )}
                      {request.status !== "pending" && (
                        <span className="text-sm text-muted-foreground">ไม่มีรายการ</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Active Members Section */}
      <Card>
        <CardHeader>
          <CardTitle>รายชื่อสมาชิกที่ใช้งานอยู่</CardTitle>
          <CardDescription>
            สมาชิกชมรมปัจจุบัน ({activeMembers.length} คน)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อสมาชิก</TableHead>
                <TableHead>รหัสนักศึกษา</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead>วันที่เข้าร่วม</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>การดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>ไม่มีสมาชิกที่ใช้งานอยู่</p>
                  </TableCell>
                </TableRow>
              ) : (
                activeMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={getDiceBearAvatar(member.name)} />
                          <AvatarFallback>
                            {member.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{member.studentId}</TableCell>
                    <TableCell>
                      <Select
                        value={member.role}
                        onValueChange={(value: "member" | "staff") => handleChangeRole(member.id, value)}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">สมาชิก</SelectItem>
                          <SelectItem value="staff">เจ้าหน้าที่</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {new Date(member.joinDate).toLocaleDateString('th-TH')}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        ใช้งานอยู่
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        ลบ
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

