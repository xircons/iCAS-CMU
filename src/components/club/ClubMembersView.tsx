import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage, getDiceBearAvatar } from "../ui/avatar";
import { Users, UserPlus, XCircle, Loader2, CheckCircle } from "lucide-react";
import { useClub } from "../../contexts/ClubContext";
import { clubApi } from "../../features/club/api/clubApi";
import { useUser } from "../../App";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { useClubSocket } from "../../features/club/hooks/useClubSocket";
import {
  PageContainer,
  PageHeader,
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  SearchInput,
  StatsCard,
} from "../shared";

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

export function ClubMembersView() {
  const { club, clubId } = useClub();
  const { user } = useUser();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<{ id: number; name: string } | null>(null);
  
  // Check if current user is a leader/admin of this club
  const isLeader = React.useMemo(() => {
    if (!user || !clubId) return false;
    if (user.role === "admin") return true;
    // Check if user is a leader in this specific club
    const membership = user.memberships?.find(m => 
      String(m.clubId) === String(clubId) && m.status === "approved"
    );
    return membership?.role === "leader" || club?.presidentId === parseInt(user.id);
  }, [user, clubId, club?.presidentId]);

  // Fetch club data
  const fetchClubData = useCallback(async () => {
      if (!clubId) return;

      try {
        setIsLoading(true);
        
        if (isLeader) {
          // Leaders fetch all data
          const [requests, members, stats] = await Promise.all([
            clubApi.getClubJoinRequests(clubId),
            clubApi.getClubMembers(clubId),
            clubApi.getClubMembershipStats(clubId),
          ]);
          setJoinRequests(requests);
          setActiveMembers(members);
          setMembershipStats(stats);
        } else {
          // Members only fetch the member list
          const members = await clubApi.getClubMembers(clubId);
          setActiveMembers(members);
          // Set empty stats for members
          setMembershipStats({
            pending: 0,
            approved: 0,
            rejected: 0,
            activeMembers: members.length,
          });
        }
      } catch (error: any) {
      console.error('Error fetching club data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลชมรมได้');
      } finally {
        setIsLoading(false);
      }
  }, [clubId, isLeader]);

  useEffect(() => {
    if (clubId) {
      fetchClubData();
    }
  }, [clubId, fetchClubData]);

  // WebSocket callbacks
  const handleJoinRequest = useCallback((data: any) => {
    if (data.clubId === clubId) {
      toast.info('มีคำขอเข้าร่วมชมรมใหม่!');
      fetchClubData();
    }
  }, [clubId, fetchClubData]);

  const handleMembershipUpdated = useCallback((data: any) => {
    if (data.clubId === clubId) {
      if (data.status === 'approved') {
        toast.success('สมาชิกใหม่ได้รับการอนุมัติแล้ว');
      }
      fetchClubData();
    }
  }, [clubId, fetchClubData]);

  const handleMemberRoleUpdated = useCallback((data: any) => {
    if (data.clubId === clubId) {
      toast.success('บทบาทสมาชิกได้รับการอัปเดตแล้ว');
      fetchClubData();
    }
  }, [clubId, fetchClubData]);

  const handleMemberRemoved = useCallback((data: any) => {
    if (data.clubId === clubId) {
      fetchClubData();
    }
  }, [clubId, fetchClubData]);

  // WebSocket for real-time updates
  useClubSocket({
    clubId: clubId || undefined,
    onJoinRequest: isLeader ? handleJoinRequest : undefined,
    onMembershipUpdated: isLeader ? handleMembershipUpdated : undefined,
    onMemberRoleUpdated: isLeader ? handleMemberRoleUpdated : undefined,
    onMemberRemoved: isLeader ? handleMemberRemoved : undefined,
  });

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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "leader":
        return "หัวหน้าชมรม";
      case "staff":
        return "เจ้าหน้าที่";
      default:
        return "สมาชิก";
    }
  };

  // Filter members based on search
  const filteredMembers = React.useMemo(() => {
    if (!memberSearchQuery.trim()) return activeMembers;
    const query = memberSearchQuery.toLowerCase();
    return activeMembers.filter(member =>
      member.user.firstName.toLowerCase().includes(query) ||
      member.user.lastName.toLowerCase().includes(query) ||
      member.user.email.toLowerCase().includes(query)
    );
  }, [activeMembers, memberSearchQuery]);

  // Filter join requests
  const filteredRequests = React.useMemo(() => {
    let filtered = joinRequests;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(request =>
        request.user.firstName.toLowerCase().includes(query) ||
        request.user.lastName.toLowerCase().includes(query) ||
        request.user.email.toLowerCase().includes(query)
      );
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(request => request.status === filterStatus);
    }
    return filtered;
  }, [joinRequests, searchQuery, filterStatus]);

  const pendingCount = filteredRequests.filter(r => r.status === 'pending').length;
  const approvedCount = filteredRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = filteredRequests.filter(r => r.status === 'rejected').length;

  return (
    <PageContainer>
      {isLeader ? (
        <>
          <PageHeader
            title="Club Management"
            description="จัดการคำขอเข้าร่วมและสมาชิกที่ใช้งานอยู่"
          />

          {clubId && (
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

          {/* Join Requests Section - Only for leaders */}
          {isLeader && (
            <Card>
              <CardHeader>
                <CardTitle>คำขอเข้าร่วม - {club?.name}</CardTitle>
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
      {isLoading ? (
                  <LoadingSpinner size="md" />
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
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
          </CardContent>
        </Card>
          )}

          {/* Active Members Section */}
        <Card>
          <CardHeader>
              <CardTitle>รายชื่อสมาชิกที่ใช้งานอยู่ - {club?.name}</CardTitle>
              <CardDescription>
                สมาชิกชมรมปัจจุบัน ({activeMembers.length} คน)
              </CardDescription>
          </CardHeader>
            <CardContent className="space-y-4">
              {/* Search for Members */}
              <SearchInput
                  placeholder="ค้นหาตามชื่อหรืออีเมล..."
                  value={memberSearchQuery}
                onChange={setMemberSearchQuery}
                />
              {isLoading ? (
                <LoadingSpinner size="md" />
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
                      {isLeader && <TableHead>การดำเนินการ</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={isLeader ? 7 : 6}>
                        <EmptyState
                          icon={Users}
                          title="ไม่พบสมาชิก"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                      filteredMembers.map((member) => {
                        const isCurrentUser = member.userId === parseInt(user?.id || '0');
                        return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage 
                                    src={member.user.avatar || getDiceBearAvatar(`${member.user.firstName} ${member.user.lastName}`)} 
                              />
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
                          {isLeader ? (
                            <Select
                              value={member.role}
                              onValueChange={(value: "member" | "staff" | "leader") => handleChangeRole(member.id, value)}
                              disabled={isProcessing}
                            >
                                  <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                    <SelectItem value="member">สมาชิก</SelectItem>
                                    <SelectItem value="staff">เจ้าหน้าที่</SelectItem>
                                    <SelectItem value="leader">หัวหน้าชมรม</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                                <span>{getRoleLabel(member.role)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                              {member.approvedDate 
                                ? new Date(member.approvedDate).toLocaleDateString('th-TH')
                                : new Date(member.createdAt).toLocaleDateString('th-TH')
                              }
                            </TableCell>
                            <TableCell>
                              <StatusBadge status="active" />
                            </TableCell>
                            {isLeader && (
                              <TableCell>
                                {isCurrentUser ? (
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
                            )}
                      </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
              )}
          </CardContent>
        </Card>
        </>
      )}
        </>
      ) : (
        <>
          {/* Member View - Simple Member List */}
          {clubId && (
            <Card>
              <CardHeader>
                <CardTitle>Member List</CardTitle>
                <CardDescription>
                  สมาชิกชมรมปัจจุบัน ({activeMembers.length} คน)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search for Members */}
                <SearchInput
                    placeholder="ค้นหาตามชื่อหรืออีเมล..."
                    value={memberSearchQuery}
                  onChange={setMemberSearchQuery}
                  />
                {isLoading ? (
                  <LoadingSpinner size="md" />
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <EmptyState
                              icon={Users}
                              title="ไม่พบสมาชิก"
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage 
                                    src={member.user.avatar || getDiceBearAvatar(`${member.user.firstName} ${member.user.lastName}`)} 
                                  />
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
                              <span>{getRoleLabel(member.role)}</span>
                            </TableCell>
                            <TableCell>
                              {member.approvedDate 
                                ? new Date(member.approvedDate).toLocaleDateString('th-TH')
                                : new Date(member.createdAt).toLocaleDateString('th-TH')
                              }
                            </TableCell>
                            <TableCell>
                              <StatusBadge status="active" />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบสมาชิก</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบ {memberToDelete?.name} ออกจากชมรม? การดำเนินการนี้ไม่สามารถยกเลิกได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
                "ลบ"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
