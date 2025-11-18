import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Avatar, AvatarImage, AvatarFallback, getDiceBearAvatar } from "./ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Search, Users, Shield, UserCheck, UserX, ArrowUp, ArrowDown, History, CheckCircle, XCircle } from "lucide-react";
import { Progress } from "./ui/progress";
import { toast } from "sonner";
import type { User } from "../App";

interface LeaderUserOversightViewProps {
  user: User;
}

interface Leader {
  id: string;
  name: string;
  email: string;
  club: string;
  clubId: string;
  activityRate: number;
  lastLogin: string;
  totalMembers: number;
  status: "active" | "suspended";
  joinedDate: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: "member" | "leader";
  joinedClub?: string;
  joinedDate: string;
  status: "active" | "suspended";
  lastActivity?: string;
}

export function LeaderUserOversightView({ user }: LeaderUserOversightViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"leaders" | "members">("leaders");
  const [selectedUser, setSelectedUser] = useState<Leader | Member | null>(null);
  const [showActivityLog, setShowActivityLog] = useState(false);

  const [leaders, setLeaders] = useState<Leader[]>([
    {
      id: "leader-1",
      name: "สมหญิง หัวหน้า",
      email: "somying@cmu.ac.th",
      club: "ชมรมดนตรีสากล",
      clubId: "CLUB-001",
      activityRate: 92,
      lastLogin: "2025-11-07T08:30:00",
      totalMembers: 48,
      status: "active",
      joinedDate: "2025-01-15",
    },
    {
      id: "leader-2",
      name: "วิชัย ช่างภาพ",
      email: "wichai@cmu.ac.th",
      club: "ชมรมภาพถ่าย",
      clubId: "CLUB-002",
      activityRate: 85,
      lastLogin: "2025-11-06T14:20:00",
      totalMembers: 35,
      status: "active",
      joinedDate: "2025-02-20",
    },
    {
      id: "leader-3",
      name: "ธนพล วิศวกร",
      email: "thanapol@cmu.ac.th",
      club: "ชมรมหุ่นยนต์",
      clubId: "CLUB-003",
      activityRate: 78,
      lastLogin: "2025-11-05T09:15:00",
      totalMembers: 42,
      status: "suspended",
      joinedDate: "2025-01-10",
    },
  ]);

  const [members, setMembers] = useState<Member[]>([
    {
      id: "member-1",
      name: "นภา สว่างใจ",
      email: "napa@cmu.ac.th",
      role: "member",
      joinedClub: "ชมรมดนตรีสากล",
      joinedDate: "2025-03-10",
      status: "active",
      lastActivity: "2025-11-07T10:00:00",
    },
    {
      id: "member-2",
      name: "ศิริพร นักกีฬา",
      email: "siriporn@cmu.ac.th",
      role: "member",
      joinedClub: "ชมรมกีฬาแบดมินตัน",
      joinedDate: "2025-04-15",
      status: "active",
      lastActivity: "2025-11-06T16:30:00",
    },
    {
      id: "member-3",
      name: "พิมพ์ใจ ซากุระ",
      email: "phimjai@cmu.ac.th",
      role: "member",
      joinedClub: "ชมรมภาษาญี่ปุ่น",
      joinedDate: "2025-05-20",
      status: "suspended",
      lastActivity: "2025-10-15T12:00:00",
    },
    {
      id: "member-4",
      name: "ประภาส มังงะ",
      email: "prapas@cmu.ac.th",
      role: "member",
      joinedClub: "ชมรมการ์ตูนและอนิเมะ",
      joinedDate: "2025-06-01",
      status: "active",
      lastActivity: "2025-11-07T11:20:00",
    },
  ]);

  const filteredLeaders = leaders.filter((leader) =>
    leader.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    leader.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    leader.club.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.joinedClub?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 whitespace-nowrap flex-shrink-0 text-xs">
          <CheckCircle className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="hidden sm:inline">ใช้งานอยู่</span>
          <span className="sm:hidden">ใช้งาน</span>
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 whitespace-nowrap flex-shrink-0 text-xs">
        <XCircle className="h-3 w-3 mr-1 flex-shrink-0" />
        <span className="hidden sm:inline">ถูกระงับ</span>
        <span className="sm:hidden">ระงับ</span>
      </Badge>
    );
  };

  const handleSuspend = (userId: string, isLeader: boolean) => {
    if (isLeader) {
      setLeaders((prev) =>
        prev.map((l) => (l.id === userId ? { ...l, status: "suspended" as const } : l))
      );
      toast.success("ระงับหัวหน้าแล้ว");
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, status: "suspended" as const } : m))
      );
      toast.success("ระงับสมาชิกแล้ว");
    }
  };

  const handleReinstate = (userId: string, isLeader: boolean) => {
    if (isLeader) {
      setLeaders((prev) =>
        prev.map((l) => (l.id === userId ? { ...l, status: "active" as const } : l))
      );
      toast.success("คืนสถานะหัวหน้าแล้ว");
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, status: "active" as const } : m))
      );
      toast.success("คืนสถานะสมาชิกแล้ว");
    }
  };

  const handlePromote = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    // Add as leader
    const newLeader: Leader = {
      id: `leader-${Date.now()}`,
      name: member.name,
      email: member.email,
      club: member.joinedClub || "ยังไม่ได้มอบหมาย",
      clubId: "TBD",
      activityRate: 0,
      lastLogin: new Date().toISOString(),
      totalMembers: 0,
      status: "active",
      joinedDate: new Date().toISOString().split("T")[0],
    };
    setLeaders((prev) => [...prev, newLeader]);

    // Remove from members or update role
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: "leader" as const } : m))
    );
    toast.success(`เลื่อน${member.name}เป็นหัวหน้าแล้ว`);
  };

  const handleDemote = (leaderId: string) => {
    const leader = leaders.find((l) => l.id === leaderId);
    if (!leader) return;

    // Add as member
    const newMember: Member = {
      id: `member-${Date.now()}`,
      name: leader.name,
      email: leader.email,
      role: "member",
      joinedClub: leader.club,
      joinedDate: leader.joinedDate,
      status: leader.status,
    };
    setMembers((prev) => [...prev, newMember]);

    // Remove from leaders
    setLeaders((prev) => prev.filter((l) => l.id !== leaderId));
    toast.success(`ลด${leader.name}เป็นสมาชิกแล้ว`);
  };

  const stats = {
    totalLeaders: leaders.length,
    activeLeaders: leaders.filter((l) => l.status === "active").length,
    totalMembers: members.length,
    activeMembers: members.filter((m) => m.status === "active").length,
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-xl md:text-2xl">Leader & User Oversight</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          ติดตามและจัดการหัวหน้าและสมาชิกทั้งหมดในระบบ
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm">หัวหน้าทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl">{stats.totalLeaders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeLeaders} คนใช้งานอยู่
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm">สมาชิกทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeMembers} คนใช้งานอยู่
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm">อัตราการใช้งานหัวหน้าเฉลี่ย</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl text-green-600">
              {Math.round(
                leaders.reduce((sum, l) => sum + l.activityRate, 0) / leaders.length
              )}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm">ผู้ใช้ที่ถูกระงับ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl text-red-600">
              {leaders.filter((l) => l.status === "suspended").length +
                members.filter((m) => m.status === "suspended").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาตามชื่อ อีเมล หรือชมรม..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as "leaders" | "members")}>
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:grid-cols-none">
          <TabsTrigger value="leaders" className="text-xs sm:text-sm">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            หัวหน้า ({stats.totalLeaders})
          </TabsTrigger>
          <TabsTrigger value="members" className="text-xs sm:text-sm">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            สมาชิก ({stats.totalMembers})
          </TabsTrigger>
        </TabsList>

        {/* Leaders Tab */}
        <TabsContent value="leaders" className="space-y-4">
          {/* Leaders Table - Desktop */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle>หัวหน้าทั้งหมด</CardTitle>
              <CardDescription>
                พบ {filteredLeaders.length} คน
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>หัวหน้า</TableHead>
                      <TableHead>ชมรม</TableHead>
                      <TableHead>อัตราการใช้งาน</TableHead>
                      <TableHead>สมาชิก</TableHead>
                      <TableHead>เข้าสู่ระบบล่าสุด</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>การดำเนินการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeaders.map((leader) => (
                      <TableRow key={leader.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={getDiceBearAvatar(leader.name)} />
                              <AvatarFallback>{leader.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium truncate max-w-[150px]">{leader.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">{leader.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm truncate max-w-[150px]">{leader.club}</p>
                            <p className="text-xs text-muted-foreground">{leader.clubId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span className="text-sm">{leader.activityRate}%</span>
                            <Progress value={leader.activityRate} className="h-1 w-16" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{leader.totalMembers}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(leader.lastLogin).toLocaleDateString("th-TH")}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(leader.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {leader.status === "active" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSuspend(leader.id, true)}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReinstate(leader.id, true)}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDemote(leader.id)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(leader);
                                setShowActivityLog(true);
                              }}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Leaders Cards - Mobile */}
          <div className="md:hidden w-full min-w-0 overflow-hidden">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>หัวหน้าทั้งหมด</CardTitle>
                <CardDescription>
                  พบ {filteredLeaders.length} คน
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-3 px-4 pb-4">
                  {filteredLeaders.map((leader) => (
                    <div
                      key={leader.id}
                      className="p-3 border rounded-lg hover:bg-slate-50 transition-colors w-full overflow-hidden"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <Avatar className="shrink-0">
                          <AvatarImage src={getDiceBearAvatar(leader.name)} />
                          <AvatarFallback>{leader.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-medium text-sm truncate">{leader.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{leader.email}</p>
                            </div>
                            {getStatusBadge(leader.status)}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p className="truncate">{leader.club}</p>
                            <p>{leader.clubId}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center justify-between">
                          <span>อัตราการใช้งาน</span>
                          <span className="font-medium">{leader.activityRate}%</span>
                        </div>
                        <Progress value={leader.activityRate} className="h-1" />
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {leader.totalMembers} สมาชิก
                          </span>
                          <span>เข้าสู่ระบบ: {new Date(leader.lastLogin).toLocaleDateString("th-TH")}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {leader.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs flex-1 sm:flex-none"
                            onClick={() => handleSuspend(leader.id, true)}
                          >
                            <UserX className="h-3 w-3 mr-1" />
                            ระงับ
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs flex-1 sm:flex-none"
                            onClick={() => handleReinstate(leader.id, true)}
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            คืนสถานะ
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs flex-1 sm:flex-none"
                          onClick={() => handleDemote(leader.id)}
                        >
                          <ArrowDown className="h-3 w-3 mr-1" />
                          ลดระดับ
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs flex-1 sm:flex-none"
                          onClick={() => {
                            setSelectedUser(leader);
                            setShowActivityLog(true);
                          }}
                        >
                          <History className="h-3 w-3 mr-1" />
                          ประวัติ
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          {/* Members Table - Desktop */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle>สมาชิกทั้งหมด</CardTitle>
              <CardDescription>
                พบ {filteredMembers.length} คน
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>สมาชิก</TableHead>
                      <TableHead>บทบาท</TableHead>
                      <TableHead>ชมรมที่เข้าร่วม</TableHead>
                      <TableHead>วันที่เข้าร่วม</TableHead>
                      <TableHead>กิจกรรมล่าสุด</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>การดำเนินการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={getDiceBearAvatar(member.name)} />
                              <AvatarFallback>{member.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium truncate max-w-[150px]">{member.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{member.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm truncate max-w-[150px] block">{member.joinedClub || "ไม่มีชมรม"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(member.joinedDate).toLocaleDateString("th-TH")}
                          </span>
                        </TableCell>
                        <TableCell>
                          {member.lastActivity ? (
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {new Date(member.lastActivity).toLocaleDateString("th-TH")}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(member.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {member.status === "active" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSuspend(member.id, false)}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReinstate(member.id, false)}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                            )}
                            {member.role === "member" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePromote(member.id)}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(member);
                                setShowActivityLog(true);
                              }}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Members Cards - Mobile */}
          <div className="md:hidden w-full min-w-0 overflow-hidden">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>สมาชิกทั้งหมด</CardTitle>
                <CardDescription>
                  พบ {filteredMembers.length} คน
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-3 px-4 pb-4">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-3 border rounded-lg hover:bg-slate-50 transition-colors w-full overflow-hidden"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <Avatar className="shrink-0">
                          <AvatarImage src={getDiceBearAvatar(member.name)} />
                          <AvatarFallback>{member.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-medium text-sm truncate">{member.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                            </div>
                            {getStatusBadge(member.status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{member.role}</Badge>
                            {member.joinedClub && (
                              <span className="truncate">{member.joinedClub}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground mb-3">
                        <p>เข้าร่วม: {new Date(member.joinedDate).toLocaleDateString("th-TH")}</p>
                        {member.lastActivity && (
                          <p>กิจกรรมล่าสุด: {new Date(member.lastActivity).toLocaleDateString("th-TH")}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {member.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs flex-1 sm:flex-none"
                            onClick={() => handleSuspend(member.id, false)}
                          >
                            <UserX className="h-3 w-3 mr-1" />
                            ระงับ
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs flex-1 sm:flex-none"
                            onClick={() => handleReinstate(member.id, false)}
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            คืนสถานะ
                          </Button>
                        )}
                        {member.role === "member" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs flex-1 sm:flex-none"
                            onClick={() => handlePromote(member.id)}
                          >
                            <ArrowUp className="h-3 w-3 mr-1" />
                            เลื่อนระดับ
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs flex-1 sm:flex-none"
                          onClick={() => {
                            setSelectedUser(member);
                            setShowActivityLog(true);
                          }}
                        >
                          <History className="h-3 w-3 mr-1" />
                          ประวัติ
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Activity Log Dialog */}
      <Dialog open={showActivityLog} onOpenChange={setShowActivityLog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>บันทึกกิจกรรม</DialogTitle>
            <DialogDescription className="truncate">
              ประวัติกิจกรรมสำหรับ {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ฟีเจอร์บันทึกกิจกรรม - ประวัติโดยละเอียดจะแสดงที่นี่
            </p>
            {/* Mock activity log items */}
            <div className="space-y-2">
              <div className="p-3 border rounded">
                <p className="text-sm font-medium">เข้าสู่ระบบล่าสุด</p>
                <p className="text-xs text-muted-foreground">
                  {new Date().toLocaleString("th-TH")}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

