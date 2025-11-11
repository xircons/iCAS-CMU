import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, UserCog, CheckCircle, Clock, XCircle, History, Edit } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";

interface ManageClubOwnersViewProps {
  user: User;
}

interface ClubOwner {
  clubId: string;
  clubName: string;
  category: string;
  currentOwner?: {
    id: string;
    name: string;
    email: string;
    verified: boolean;
  };
  status: "verified" | "pending" | "unassigned";
  lastChange?: {
    date: string;
    changedBy: string;
    previousOwner?: string;
  };
}

interface OwnerChangeLog {
  id: string;
  clubId: string;
  clubName: string;
  previousOwner?: string;
  newOwner: string;
  changedBy: string;
  date: string;
  reason?: string;
}

export function ManageClubOwnersView({ user }: ManageClubOwnersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClub, setSelectedClub] = useState<ClubOwner | null>(null);
  const [isChangeOwnerOpen, setIsChangeOwnerOpen] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState("");
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [editingStatusClubId, setEditingStatusClubId] = useState<string | null>(null);

  const [clubOwners, setClubOwners] = useState<ClubOwner[]>([
    {
      clubId: "CLUB-001",
      clubName: "ชมรมดนตรีสากล",
      category: "Arts & Music",
      currentOwner: {
        id: "user-1",
        name: "สมหญิง หัวหน้า",
        email: "somying@cmu.ac.th",
        verified: true,
      },
      status: "verified",
      lastChange: {
        date: "2025-10-15",
        changedBy: "Super Admin",
        previousOwner: "Previous Leader",
      },
    },
    {
      clubId: "CLUB-002",
      clubName: "ชมรมภาพถ่าย",
      category: "Arts & Media",
      currentOwner: {
        id: "user-2",
        name: "วิชัย ช่างภาพ",
        email: "wichai@cmu.ac.th",
        verified: true,
      },
      status: "verified",
      lastChange: {
        date: "2025-09-20",
        changedBy: "Super Admin",
      },
    },
    {
      clubId: "CLUB-003",
      clubName: "ชมรมหุ่นยนต์",
      category: "Technology",
      currentOwner: {
        id: "user-3",
        name: "ธนพล วิศวกร",
        email: "thanapol@cmu.ac.th",
        verified: false,
      },
      status: "pending",
      lastChange: {
        date: "2025-11-01",
        changedBy: "Super Admin",
      },
    },
    {
      clubId: "CLUB-004",
      clubName: "ชมรมอาสาพัฒนา",
      category: "Community Service",
      status: "unassigned",
    },
  ]);

  const [auditLog, setAuditLog] = useState<OwnerChangeLog[]>([
    {
      id: "log-1",
      clubId: "CLUB-001",
      clubName: "ชมรมดนตรีสากล",
      previousOwner: "Previous Leader",
      newOwner: "สมหญิง หัวหน้า",
      changedBy: "Super Admin",
      date: "2025-10-15T10:30:00",
      reason: "Previous leader graduated",
    },
    {
      id: "log-2",
      clubId: "CLUB-003",
      clubName: "ชมรมหุ่นยนต์",
      previousOwner: "Old Leader",
      newOwner: "ธนพล วิศวกร",
      changedBy: "Super Admin",
      date: "2025-11-01T14:20:00",
      reason: "Leadership transition",
    },
  ]);

  // Mock users for assignment
  const availableUsers = [
    { id: "user-4", name: "นภา ใจดี", email: "napa@cmu.ac.th", role: "member" },
    { id: "user-5", name: "ศิริพร นักกีฬา", email: "siriporn@cmu.ac.th", role: "member" },
    { id: "user-6", name: "พิมพ์ใจ ซากุระ", email: "phimjai@cmu.ac.th", role: "member" },
    { id: "user-7", name: "ประภาส มังงะ", email: "prapas@cmu.ac.th", role: "member" },
    { id: "user-8", name: "สมชาย นักธุรกิจ", email: "somchai@cmu.ac.th", role: "member" },
  ];

  const filteredClubs = clubOwners.filter((club) =>
    club.clubName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.clubId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.currentOwner?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 whitespace-nowrap flex-shrink-0 text-xs">
            <CheckCircle className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">ยืนยันแล้ว</span>
            <span className="sm:hidden">ยืนยัน</span>
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 whitespace-nowrap flex-shrink-0 text-xs">
            <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">รอยืนยัน</span>
            <span className="sm:hidden">รอ</span>
          </Badge>
        );
      case "unassigned":
        return (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 whitespace-nowrap flex-shrink-0 text-xs">
            <XCircle className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">ยังไม่ได้มอบหมาย</span>
            <span className="sm:hidden">ว่าง</span>
          </Badge>
        );
      default:
        return <Badge className="whitespace-nowrap flex-shrink-0 text-xs">{status}</Badge>;
    }
  };

  const handleChangeOwner = () => {
    if (!selectedClub || !selectedNewOwner) {
      toast.error("กรุณาเลือกเจ้าของใหม่");
      return;
    }

    const newOwner = availableUsers.find((u) => u.id === selectedNewOwner);
    if (!newOwner) {
      toast.error("ไม่พบผู้ใช้ที่เลือก");
      return;
    }

    // Update club owner
    setClubOwners((prev) =>
      prev.map((club) => {
        if (club.clubId === selectedClub.clubId) {
          return {
            ...club,
            currentOwner: {
              id: newOwner.id,
              name: newOwner.name,
              email: newOwner.email,
              verified: false,
            },
            status: "pending" as const,
            lastChange: {
              date: new Date().toISOString().split("T")[0],
              changedBy: `${user.firstName} ${user.lastName}`,
              previousOwner: club.currentOwner?.name,
            },
          };
        }
        return club;
      })
    );

    // Add to audit log
    const newLog: OwnerChangeLog = {
      id: `log-${Date.now()}`,
      clubId: selectedClub.clubId,
      clubName: selectedClub.clubName,
      previousOwner: selectedClub.currentOwner?.name,
      newOwner: newOwner.name,
      changedBy: `${user.firstName} ${user.lastName}`,
      date: new Date().toISOString(),
      reason: "Owner reassignment",
    };
    setAuditLog((prev) => [newLog, ...prev]);

    toast.success(`เปลี่ยนเจ้าของเป็น ${newOwner.name} แล้ว`);
    setIsChangeOwnerOpen(false);
    setSelectedNewOwner("");
    setSelectedClub(null);
  };

  const handleStatusChange = (clubId: string, newStatus: "verified" | "pending" | "unassigned") => {
    setClubOwners((prev) =>
      prev.map((club) => {
        if (club.clubId === clubId) {
          return {
            ...club,
            status: newStatus,
            lastChange: {
              date: new Date().toISOString().split("T")[0],
              changedBy: `${user.firstName} ${user.lastName}`,
              previousOwner: club.currentOwner?.name,
            },
          };
        }
        return club;
      })
    );
    setEditingStatusClubId(null);
    toast.success("เปลี่ยนสถานะชมรมแล้ว");
  };

  const stats = {
    total: clubOwners.length,
    verified: clubOwners.filter((c) => c.status === "verified").length,
    pending: clubOwners.filter((c) => c.status === "pending").length,
    unassigned: clubOwners.filter((c) => c.status === "unassigned").length,
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="mb-2 text-xl md:text-2xl">Manage Club</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            จัดการชมรม เปลี่ยนเจ้าของ และแก้ไขสถานะชมรม
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowAuditLog(true)} className="w-full sm:w-auto">
          <History className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">ดูบันทึกการตรวจสอบ</span>
          <span className="sm:hidden">บันทึก</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm">ชมรมทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm">ยืนยันแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl text-green-600">{stats.verified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm">รอยืนยัน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm">ยังไม่ได้มอบหมาย</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl text-gray-600">{stats.unassigned}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชมรมตามชื่อ รหัส หรือชื่อเจ้าของ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clubs Table - Desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>เจ้าของชมรม</CardTitle>
          <CardDescription>
            พบ {filteredClubs.length} ชมรม
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชมรม</TableHead>
                  <TableHead>เจ้าของปัจจุบัน</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>เปลี่ยนล่าสุด</TableHead>
                  <TableHead>การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClubs.map((club) => (
                  <TableRow key={club.clubId}>
                    <TableCell>
                      <div>
                        <p className="font-medium truncate max-w-[200px]">{club.clubName}</p>
                        <p className="text-xs text-muted-foreground">
                          <code>{club.clubId}</code> • {club.category}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {club.currentOwner ? (
                        <div>
                          <p className="text-sm font-medium truncate max-w-[150px]">{club.currentOwner.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{club.currentOwner.email}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">ยังไม่ได้มอบหมายเจ้าของ</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingStatusClubId === club.clubId ? (
                        <Select
                          value={club.status}
                          onValueChange={(value: "verified" | "pending" | "unassigned") => {
                            handleStatusChange(club.clubId, value);
                          }}
                          onOpenChange={(open) => {
                            if (!open) {
                              setEditingStatusClubId(null);
                            }
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="verified">ยืนยันแล้ว</SelectItem>
                            <SelectItem value="pending">รอยืนยัน</SelectItem>
                            <SelectItem value="unassigned">ยังไม่ได้มอบหมาย</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {getStatusBadge(club.status)}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setEditingStatusClubId(club.clubId)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {club.lastChange ? (
                        <div>
                          <p className="text-sm whitespace-nowrap">{new Date(club.lastChange.date).toLocaleDateString("th-TH")}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">by {club.lastChange.changedBy}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedClub(club);
                          setIsChangeOwnerOpen(true);
                        }}
                      >
                        <UserCog className="h-4 w-4 mr-1" />
                        เปลี่ยนเจ้าของ
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Clubs Cards - Mobile */}
      <div className="md:hidden w-full min-w-0 overflow-hidden">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>เจ้าของชมรม</CardTitle>
            <CardDescription>
              พบ {filteredClubs.length} ชมรม
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-3 px-4 pb-4">
              {filteredClubs.map((club) => (
                <div
                  key={club.clubId}
                  className="p-3 border rounded-lg hover:bg-slate-50 transition-colors w-full overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium text-sm truncate">{club.clubName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <code>{club.clubId}</code> • {club.category}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(club.status)}
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground mb-3">
                    {club.currentOwner ? (
                      <>
                        <p className="truncate">เจ้าของ: {club.currentOwner.name}</p>
                        <p className="truncate">{club.currentOwner.email}</p>
                      </>
                    ) : (
                      <p>ยังไม่ได้มอบหมายเจ้าของ</p>
                    )}
                    {club.lastChange && (
                      <p>
                        เปลี่ยนล่าสุด: {new Date(club.lastChange.date).toLocaleDateString("th-TH")} โดย {club.lastChange.changedBy}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex-1 sm:flex-none"
                      onClick={() => {
                        setSelectedClub(club);
                        setIsChangeOwnerOpen(true);
                      }}
                    >
                      <UserCog className="h-3 w-3 mr-1" />
                      เปลี่ยนเจ้าของ
                    </Button>
                    {editingStatusClubId === club.clubId ? (
                      <Select
                        value={club.status}
                        onValueChange={(value: "verified" | "pending" | "unassigned") => {
                          handleStatusChange(club.clubId, value);
                        }}
                        onOpenChange={(open) => {
                          if (!open) {
                            setEditingStatusClubId(null);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="verified">ยืนยันแล้ว</SelectItem>
                          <SelectItem value="pending">รอยืนยัน</SelectItem>
                          <SelectItem value="unassigned">ยังไม่ได้มอบหมาย</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setEditingStatusClubId(club.clubId)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        แก้ไขสถานะ
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Owner Dialog */}
      <Dialog open={isChangeOwnerOpen} onOpenChange={setIsChangeOwnerOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เปลี่ยนเจ้าของชมรม</DialogTitle>
            <DialogDescription className="truncate">
              มอบหมายเจ้าของใหม่สำหรับ {selectedClub?.clubName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>เจ้าของปัจจุบัน</Label>
              <p className="text-sm text-muted-foreground truncate">
                {selectedClub?.currentOwner?.name || "ยังไม่ได้มอบหมาย"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>เลือกเจ้าของใหม่</Label>
              <Select value={selectedNewOwner} onValueChange={setSelectedNewOwner}>
                <SelectTrigger>
                  <SelectValue placeholder="ค้นหาและเลือกผู้ใช้..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div>
                        <p className="font-medium truncate">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button onClick={handleChangeOwner} className="flex-1">
                มอบหมายเจ้าของ
              </Button>
              <Button variant="outline" onClick={() => setIsChangeOwnerOpen(false)} className="flex-1 sm:flex-none">
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog open={showAuditLog} onOpenChange={setShowAuditLog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>บันทึกการตรวจสอบการเปลี่ยนเจ้าของ</DialogTitle>
            <DialogDescription>
              ประวัติการเปลี่ยนเจ้าของชมรมทั้งหมด
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {auditLog.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">ไม่มีการเปลี่ยนแปลงที่บันทึกไว้</p>
            ) : (
              <div className="space-y-3">
                {auditLog.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-medium">{log.clubName}</p>
                          <div className="text-sm text-muted-foreground">
                            {log.previousOwner ? (
                              <span>
                                {log.previousOwner} → <span className="font-medium">{log.newOwner}</span>
                              </span>
                            ) : (
                              <span>มอบหมายให้ <span className="font-medium">{log.newOwner}</span></span>
                            )}
                          </div>
                          {log.reason && (
                            <p className="text-xs text-muted-foreground">เหตุผล: {log.reason}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{new Date(log.date).toLocaleDateString("th-TH")}</p>
                          <p className="text-xs">โดย {log.changedBy}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

