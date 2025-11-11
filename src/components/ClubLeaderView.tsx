import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Avatar, AvatarImage, AvatarFallback, getDiceBearAvatar } from "./ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, Users, UserPlus, CheckCircle, XCircle, Clock, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";
import { clubApi, type Club } from "../features/club/api/clubApi";
import { useClubSocket } from "../features/club/hooks/useClubSocket";

interface ClubLeaderViewProps {
  user: User;
}

interface JoinRequest {
  id: number;
  userId: number;
  clubId: number;
  status: string;
  role: string;
  requestDate: string;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    major: string;
  };
}

interface ActiveMember {
  id: number;
  userId: number;
  clubId: number;
  status: string;
  role: string;
  requestDate: string;
  approvedDate?: string;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    major: string;
    avatar?: string;
  };
}

export function ClubLeaderView({ user }: ClubLeaderViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [leaderClubs, setLeaderClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [activeMembers, setActiveMembers] = useState<ActiveMember[]>([]);
  const [membershipStats, setMembershipStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    activeMembers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<{ id: number; name: string } | null>(null);

  // Fetch leader's clubs on mount
  useEffect(() => {
    const fetchLeaderClubs = async () => {
      try {
        setIsLoading(true);
        const clubs = await clubApi.getLeaderClubs();
        setLeaderClubs(clubs);
        if (clubs.length > 0) {
          setSelectedClubId(clubs[0].id);
        }
      } catch (error: any) {
        console.error('Error fetching leader clubs:', error);
        toast.error('ไม่สามารถโหลดข้อมูลชมรมได้');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderClubs();
  }, []);

  // Fetch join requests and members when club is selected
  useEffect(() => {
    if (selectedClubId) {
      fetchClubData();
    }
  }, [selectedClubId]);

  // WebSocket for real-time updates
  useClubSocket({
    clubId: selectedClubId,
    onJoinRequest: (data) => {
      // New join request received
      toast.info('มีคำขอเข้าร่วมชมรมใหม่!');
      fetchClubData();
    },
    onMembershipUpdated: (data) => {
      // Membership status changed (approved/rejected)
      if (data.status === 'approved') {
        toast.success('สมาชิกใหม่ได้รับการอนุมัติแล้ว');
      }
      fetchClubData();
    },
    onMemberRoleUpdated: (data) => {
      // Member role updated
      fetchClubData();
    },
    onMemberRemoved: (data) => {
      // Member removed
      fetchClubData();
    },
  });

  const fetchClubData = async () => {
    if (!selectedClubId) return;

    try {
      setIsLoading(true);
      const [requests, members, stats] = await Promise.all([
        clubApi.getClubJoinRequests(selectedClubId),
        clubApi.getClubMembers(selectedClubId),
        clubApi.getClubMembershipStats(selectedClubId),
      ]);
      setJoinRequests(requests);
      setActiveMembers(members);
      setMembershipStats(stats);
    } catch (error: any) {
      console.error('Error fetching club data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลชมรมได้');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedClub = leaderClubs.find(c => c.id === selectedClubId);

  const filteredRequests = joinRequests.filter((request) => {
    const matchesSearch = 
      `${request.user.firstName} ${request.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || request.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Use stats from API for accurate counts
  const pendingCount = membershipStats.pending;
  const approvedCount = membershipStats.approved;
  const rejectedCount = membershipStats.rejected;

  const handleApprove = async (requestId: number) => {
    try {
      setIsProcessing(true);
      await clubApi.updateMembershipStatus(requestId, { status: 'approved' });
      toast.success("อนุมัติคำขอเข้าร่วมแล้ว!");
      await fetchClubData();
    } catch (error: any) {
      console.error('Error approving request:', error);
      const message = error.response?.data?.error?.message || 'ไม่สามารถอนุมัติคำขอได้';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      setIsProcessing(true);
      await clubApi.updateMembershipStatus(requestId, { status: 'rejected' });
      toast.info("ปฏิเสธคำขอแล้ว");
      await fetchClubData();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      const message = error.response?.data?.error?.message || 'ไม่สามารถปฏิเสธคำขอได้';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMemberClick = (membershipId: number, memberName: string) => {
    setMemberToDelete({ id: membershipId, name: memberName });
    setDeleteDialogOpen(true);
  };

  const handleRemoveMemberConfirm = async () => {
    if (!memberToDelete) return;

    try {
      setIsProcessing(true);
      await clubApi.removeMember(memberToDelete.id);
      toast.success(`ลบ${memberToDelete.name}ออกจากชมรมแล้ว`);
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
      await fetchClubData();
    } catch (error: any) {
      console.error('Error removing member:', error);
      const message = error.response?.data?.error?.message || 'ไม่สามารถลบสมาชิกได้';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeRole = async (membershipId: number, newRole: "member" | "staff" | "leader") => {
    try {
      setIsProcessing(true);
      await clubApi.updateMemberRole(membershipId, newRole);
      toast.success("อัปเดตบทบาทสมาชิกสำเร็จแล้ว!");
      await fetchClubData();
    } catch (error: any) {
      console.error('Error updating role:', error);
      const message = error.response?.data?.error?.message || 'ไม่สามารถอัปเดตบทบาทได้';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading && leaderClubs.length === 0) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (leaderClubs.length === 0) {
    return (
      <div className="p-4 md:p-8 space-y-4">
        <div>
          <h1 className="mb-2">Club Management</h1>
          <p className="text-muted-foreground">
            คุณยังไม่ได้เป็นหัวหน้าชมรมใดๆ
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>ไม่มีชมรมที่คุณเป็นหัวหน้า</p>
              <p className="text-sm mt-1">ติดต่อผู้ดูแลระบบเพื่อมอบหมายชมรม</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2">Club Management</h1>
        <p className="text-muted-foreground">
          จัดการคำขอเข้าร่วมและสมาชิกที่ใช้งานอยู่
        </p>
      </div>

      {/* Club Selector */}
      {leaderClubs.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">เลือกชมรมที่ต้องการจัดการ</label>
              <Select
                value={selectedClubId?.toString() || ""}
                onValueChange={(value) => setSelectedClubId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกชมรม" />
                </SelectTrigger>
                <SelectContent>
                  {leaderClubs.map((club) => (
                    <SelectItem key={club.id} value={club.id.toString()}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedClub && (
        <>
          {/* Stats */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">คำขอที่รอ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-yellow-600">{pendingCount}</div>
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
                <div className="text-2xl text-green-600">{membershipStats.activeMembers}</div>
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
              <CardTitle>คำขอเข้าร่วม - {selectedClub.name}</CardTitle>
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
                    placeholder="ค้นหาตามชื่อหรืออีเมล..."
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
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อสมาชิก</TableHead>
                      <TableHead>อีเมล</TableHead>
                      <TableHead>สาขา</TableHead>
                      <TableHead>วันที่ขอ</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>การดำเนินการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <UserPlus className="h-12 w-12 mx-auto mb-2 mt-4 opacity-50" />
                          <p>ไม่พบคำขอ</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={getDiceBearAvatar(`${request.user.firstName} ${request.user.lastName}`)} />
                                <AvatarFallback>
                                  {request.user.firstName.substring(0, 1)}{request.user.lastName.substring(0, 1)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{request.user.firstName} {request.user.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>{request.user.email}</TableCell>
                          <TableCell>{request.user.major}</TableCell>
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
                                  disabled={isProcessing}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  อนุมัติ
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(request.id)}
                                  disabled={isProcessing}
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
              )}
            </CardContent>
          </Card>

          {/* Active Members Section */}
          <Card>
            <CardHeader>
              <CardTitle>รายชื่อสมาชิกที่ใช้งานอยู่ - {selectedClub.name}</CardTitle>
              <CardDescription>
                สมาชิกชมรมปัจจุบัน ({activeMembers.length} คน)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อสมาชิก</TableHead>
                      <TableHead>อีเมล</TableHead>
                      <TableHead>สาขา</TableHead>
                      <TableHead>บทบาท</TableHead>
                      <TableHead>วันที่เข้าร่วม</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>การดำเนินการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                                <AvatarImage src={member.user.avatar || getDiceBearAvatar(`${member.user.firstName} ${member.user.lastName}`)} />
                                <AvatarFallback>
                                  {member.user.firstName.substring(0, 1)}{member.user.lastName.substring(0, 1)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{member.user.firstName} {member.user.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>{member.user.email}</TableCell>
                          <TableCell>{member.user.major}</TableCell>
                          <TableCell>
                            <Select
                              value={member.role}
                              onValueChange={(value: "member" | "staff" | "leader") => handleChangeRole(member.id, value)}
                              disabled={isProcessing}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">สมาชิก</SelectItem>
                                <SelectItem value="staff">เจ้าหน้าที่</SelectItem>
                                <SelectItem value="leader">หัวหน้าชมรม</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {member.approvedDate 
                              ? new Date(member.approvedDate).toLocaleDateString('th-TH')
                              : new Date(member.requestDate).toLocaleDateString('th-TH')
                            }
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              ใช้งานอยู่
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {member.user.id === parseInt(user.id) ? (
                              <span className="text-sm text-muted-foreground">ไม่สามารถลบตัวเองได้</span>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveMemberClick(member.id, `${member.user.firstName} ${member.user.lastName}`)}
                                disabled={isProcessing}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                ลบ
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete Member Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-slot="dialog-content">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบสมาชิก</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบ {memberToDelete?.name} ออกจากชมรม?
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                การกระทำนี้ไม่สามารถยกเลิกได้
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setMemberToDelete(null);
              }}
              disabled={isProcessing}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMemberConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  ลบสมาชิก
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
