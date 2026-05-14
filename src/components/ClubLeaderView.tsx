import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarImage, AvatarFallback, getDiceBearAvatar } from "./ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Users, UserPlus, XCircle, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";
import { clubApi, type Club } from "../features/club/api/clubApi";
import { useClubSocket } from "../features/club/hooks/useClubSocket";
import {
  PageChrome,
  AsyncBoundary,
  StatusBadge,
  EmptyState,
  SearchInput,
  StatsCard,
} from "./shared";

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

  // Memoize fetchClubData to ensure WebSocket callbacks always use the latest version
  const fetchClubData = useCallback(async () => {
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
  }, [selectedClubId]);

  // Fetch join requests and members when club is selected
  useEffect(() => {
    if (selectedClubId) {
      fetchClubData();
    }
  }, [selectedClubId, fetchClubData]);

  // Memoize WebSocket callbacks to ensure they always use the latest fetchClubData
  const handleJoinRequest = useCallback((data: any) => {
    // New join request received
    toast.info('มีคำขอเข้าร่วมชมรมใหม่!');
    fetchClubData();
  }, [fetchClubData]);

  const handleMembershipUpdated = useCallback((data: any) => {
    // Membership status changed (approved/rejected)
    if (data.status === 'approved') {
      toast.success('สมาชิกใหม่ได้รับการอนุมัติแล้ว');
    }
    fetchClubData();
  }, [fetchClubData]);

  const handleMemberRoleUpdated = useCallback((data: any) => {
    // Member role updated - refresh member list
    console.log('📨 Member role updated, refreshing data...', data);
    toast.success('บทบาทสมาชิกได้รับการอัปเดตแล้ว');
    fetchClubData();
  }, [fetchClubData]);

  const handleMemberRemoved = useCallback((data: any) => {
    // Member removed
    fetchClubData();
  }, [fetchClubData]);

  const selectedClub = leaderClubs.find(c => c.id === selectedClubId);

  // WebSocket for real-time updates
  useClubSocket({
    clubId: selectedClub?.publicId,
    onJoinRequest: handleJoinRequest,
    onMembershipUpdated: handleMembershipUpdated,
    onMemberRoleUpdated: handleMemberRoleUpdated,
    onMemberRemoved: handleMemberRemoved,
  });

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
      <PageChrome title="Club Management">
        <AsyncBoundary loading />
      </PageChrome>
    );
  }

  if (leaderClubs.length === 0) {
    return (
      <PageChrome title="Club Management" description="คุณยังไม่ได้เป็นหัวหน้าชมรมใดๆ">
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Users}
              title="ไม่มีชมรมที่คุณเป็นหัวหน้า"
              description="ติดต่อผู้ดูแลระบบเพื่อมอบหมายชมรม"
            />
          </CardContent>
        </Card>
      </PageChrome>
    );
  }

  return (
    <PageChrome
      title="Club Management"
      description="จัดการคำขอเข้าร่วมและสมาชิกที่ใช้งานอยู่"
    >

      {/* Club Selector */}
      {leaderClubs.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">เลือกชมรมที่ต้องการจัดการ</label>
              <Select
                value={selectedClubId?.toString() || ""}
                onValueChange={(value: string) => setSelectedClubId(parseInt(value))}
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
            <StatsCard
              title="คำขอที่รอ"
              value={pendingCount}
              description="รอการอนุมัติ"
              valueClassName="text-yellow-600"
            />
            <StatsCard
              title="สมาชิกที่ใช้งานอยู่"
              value={membershipStats.activeMembers}
              description="สมาชิกปัจจุบัน"
              valueClassName="text-green-600"
            />
            <StatsCard
              title="อนุมัติแล้ว"
              value={approvedCount}
              description="อนุมัติทั้งหมด"
            />
            <StatsCard
              title="ปฏิเสธแล้ว"
              value={rejectedCount}
              description="ปฏิเสธทั้งหมด"
              valueClassName="text-red-600"
            />
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
                <div className="flex-1">
                  <SearchInput
                    placeholder="ค้นหาตามชื่อหรืออีเมล..."
                    value={searchQuery}
                    onChange={setSearchQuery}
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
              <AsyncBoundary loading={isLoading}>
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
                        <TableCell colSpan={6}>
                          <EmptyState
                            icon={UserPlus}
                            title="ไม่พบคำขอ"
                          />
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
                            <StatusBadge status={request.status} />
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
              </AsyncBoundary>
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
              <AsyncBoundary loading={isLoading}>
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
                        <TableCell colSpan={7}>
                          <EmptyState
                            icon={Users}
                            title="ไม่มีสมาชิกที่ใช้งานอยู่"
                          />
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
                            <StatusBadge status="active" />
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
              </AsyncBoundary>
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
    </PageChrome>
  );
}
