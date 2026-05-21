import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { FileText, Users, Calendar, TrendingUp, Clock, CheckCircle2, AlertCircle, XCircle, MapPin, ClipboardList, ArrowRight } from "lucide-react";
import { Badge } from "./ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { toast } from "sonner";
import type { User } from "../App";
import { clubApi, type Club } from "../features/club/api/clubApi";
import { adminApi, type RecentSmartDocument } from "../features/admin/api/adminApi";
import { useClubSocket } from "../features/club/hooks/useClubSocket";
import {
  PageChrome,
  AsyncBoundary,
  StatusBadge,
  EmptyState,
  ClubCard,
} from "./shared";

interface DashboardViewProps {
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
}

export function DashboardView({ user, onUserUpdate }: DashboardViewProps) {
  const navigate = useNavigate();
  const [clubDetails, setClubDetails] = useState<Map<string, Club>>(new Map());
  const [isLoadingClubs, setIsLoadingClubs] = useState(false);
  const [leaderClubs, setLeaderClubs] = useState<Club[]>([]);

  // Fetch club details for approved memberships (members)
  useEffect(() => {
    const fetchClubDetails = async () => {
      const approvedMemberships = user.memberships?.filter(m => m.status === 'approved') || [];
      if (approvedMemberships.length === 0) return;

      try {
        setIsLoadingClubs(true);
        const clubPromises = approvedMemberships.map((m) =>
          m.clubPublicId ? clubApi.getClubById(m.clubPublicId).catch(() => null) : Promise.resolve(null),
        );
        const clubs = await Promise.all(clubPromises);
        
        const detailsMap = new Map<string, Club>();
        clubs.forEach((club, index) => {
          const publicId = approvedMemberships[index].clubPublicId;
          if (club && publicId) {
            detailsMap.set(publicId, club);
          }
        });
        setClubDetails(detailsMap);
      } catch (error) {
        console.error('Error fetching club details:', error);
      } finally {
        setIsLoadingClubs(false);
      }
    };

    if (user.role === 'member' && user.memberships) {
      fetchClubDetails();
    }
  }, [user.memberships, user.role]);

  // Fetch leader's clubs
  useEffect(() => {
    const fetchLeaderClubs = async () => {
      if (user.role !== 'leader') return;

      try {
        setIsLoadingClubs(true);
        const clubs = await clubApi.getLeaderClubs();
        setLeaderClubs(clubs);
      } catch (error) {
        console.error('Error fetching leader clubs:', error);
      } finally {
        setIsLoadingClubs(false);
      }
    };

    fetchLeaderClubs();
  }, [user.role]);

  // Memoize the membership status change handler
  const handleMembershipStatusChanged = useCallback(async (data: any) => {
    // Show toast notification
    if (data.status === 'approved') {
      toast.success(`คุณได้รับการอนุมัติเข้าร่วมชมรมแล้ว!`);
    } else if (data.status === 'rejected') {
      toast.info(`คำขอเข้าร่วมชมรมของคุณถูกปฏิเสธ`);
    } else if (data.status === 'left') {
      toast.info(`คุณถูกถอดออกจากชมรมแล้ว`);
    }
    
    // Refresh user memberships for any status change
    try {
      const updatedMemberships = await clubApi.getUserMemberships();
      if (onUserUpdate) {
        onUserUpdate({
          ...user,
          memberships: updatedMemberships,
        });
      }
      
      // Update club details if approved
      if (data.status === 'approved' && data.clubPublicId) {
        try {
          const club = await clubApi.getClubById(data.clubPublicId);
          setClubDetails(prev => new Map(prev).set(data.clubPublicId, club));
        } catch (error) {
          console.error('Error refreshing club details:', error);
        }
      } else if (data.status === 'left' && data.clubPublicId) {
        // Remove club from details when membership is removed
        setClubDetails(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.clubPublicId);
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error refreshing memberships:', error);
    }
  }, [user, onUserUpdate]);

  // WebSocket for real-time membership updates
  useClubSocket({
    onMembershipStatusChanged: handleMembershipStatusChanged,
  });


  const [adminClubsOverview, setAdminClubsOverview] = useState<Club[]>([]);
  const [adminRecentDocs, setAdminRecentDocs] = useState<RecentSmartDocument[]>([]);
  const [loadingAdminDashboard, setLoadingAdminDashboard] = useState(false);
  const [selectedAdminDoc, setSelectedAdminDoc] = useState<RecentSmartDocument | null>(null);

  useEffect(() => {
    if (user.role !== "admin") return;
    let cancelled = false;
    (async () => {
      setLoadingAdminDashboard(true);
      try {
        const [clubs, docs] = await Promise.all([
          clubApi.getAllClubs(),
          adminApi.getRecentSmartDocuments(10),
        ]);
        if (!cancelled) {
          setAdminClubsOverview(clubs);
          setAdminRecentDocs(docs);
        }
      } catch (error) {
        console.error("Error loading admin dashboard:", error);
        toast.error("ไม่สามารถโหลดข้อมูลแดชบอร์ดผู้ดูแลระบบได้");
        if (!cancelled) {
          setAdminClubsOverview([]);
          setAdminRecentDocs([]);
        }
      } finally {
        if (!cancelled) setLoadingAdminDashboard(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.role]);

  const adminTotalMemberSlots = useMemo(
    () => adminClubsOverview.reduce((sum, c) => sum + (c.memberCount ?? 0), 0),
    [adminClubsOverview]
  );
  const adminActiveClubs = useMemo(
    () => adminClubsOverview.filter((c) => c.status === "active").length,
    [adminClubsOverview]
  );

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "reimbursement":
        return <Badge variant="outline">การเบิกจ่าย</Badge>;
      case "proposal":
        return <Badge variant="outline">ข้อเสนอ</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    return <StatusBadge status={status as any} />;
  };

  const getDescription = () => {
    if (user.role === "admin") {
      return "นี่คือภาพรวมของชมรมทั้งหมดในมหาวิทยาลัย";
    } else if (user.role === "leader") {
      return `นี่คือสิ่งที่เกิดขึ้นกับ${leaderClubs.length > 0 ? leaderClubs.map(c => c.name).join(", ") : user.clubName || "ชมรมของคุณ"}`;
    }
    return "นี่คือสรุปกิจกรรมชมรมของคุณ";
  };

  return (
    <PageChrome
      title="Dashboard Overview"
      description={`ยินดีต้อนรับกลับ, ${user.firstName} ${user.lastName}! ${getDescription()}`}
    >

      {/* Leader's Clubs - Only for leaders */}
      {user.role === "leader" && (
        <Card>
          <CardHeader>
            <CardTitle>ชมรมของคุณ</CardTitle>
            <CardDescription>
              ชมรมที่คุณเป็นหัวหน้า ({leaderClubs.length} ชมรม)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AsyncBoundary loading={isLoadingClubs}>
              {leaderClubs.length === 0 ? (
              <EmptyState
                icon={Users}
                title="คุณยังไม่มีชมรม"
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {leaderClubs.map((club) => (
                  <ClubCard
                    key={club.id}
                    club={{
                      id: club.id,
                      name: club.name,
                      category: club.category,
                      description: club.description,
                      logo: club.logo,
                      memberCount: club.memberCount,
                      meetingDay: club.meetingDay,
                      location: club.location,
                      status: club.status,
                      role: "leader",
                    }}
                    onClick={() => navigate(`/club/${club.publicId}/home`)}
                    showRole
                  />
                ))}
              </div>
            )}
            </AsyncBoundary>
          </CardContent>
        </Card>
      )}

      {/* Member Activity - Only for admins */}
      {user.role === "admin" && (
        <div className="grid gap-6 lg:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>ภาพรวมการเป็นสมาชิกจากข้อมูลในระบบ</CardTitle>
              <CardDescription>
                จากรายการชมรมและจำนวนสมาชิกที่บันทึกไว้ ไม่ได้วัดความเข้าร่วมกิจกรรมใน 30 วัน
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AsyncBoundary loading={loadingAdminDashboard}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xl sm:text-2xl">{adminClubsOverview.length}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">ชมรมในระบบ</p>
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl">{adminTotalMemberSlots}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        สมาชิก (รวมตามฟิลด์สมาชิกในแต่ละชมรม)
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-xl sm:text-2xl text-green-700">{adminActiveClubs}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">ชมรมที่สถานะ active</p>
                    </div>
                  </div>
                  <p className="border-t pt-3 text-xs text-muted-foreground">
                    เมตริกอัตราเข้าร่วมกิจกรรมยังไม่มีในระบบ จึงไม่แสดงเปอร์เซ็นต์ประมาณการ
                  </p>
                </div>
              </AsyncBoundary>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Joined Clubs - Only for members */}
      {user.role === "member" && (
        <Card>
          <CardHeader>
            <CardTitle>ชมรมที่เข้าร่วม</CardTitle>
            <CardDescription>
              ชมรมที่คุณได้รับการอนุมัติ ({user.memberships?.filter(m => m.status === 'approved').length || 0} ชมรม)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              // Get approved memberships
              const approvedMemberships = user.memberships?.filter(m => m.status === 'approved') || [];
              const joinedClubs = approvedMemberships.map(m => ({
                id: m.clubPublicId || "",
                name: m.clubName || `ชมรม #${m.clubId}`,
                role: m.role || 'member',
                joinDate: m.approvedDate || m.requestDate,
              })).filter((club) => club.id.length > 0);

              return joinedClubs.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="คุณยังไม่ได้เข้าร่วมชมรมใดๆ"
                  description='ไปที่ "เข้าร่วมชมรม" เพื่อสำรวจชมรมที่มี'
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {joinedClubs.map((club) => {
                    const clubDetail = clubDetails.get(club.id);
                    return (
                      <ClubCard
                        key={club.id} 
                        club={{
                          id: club.id,
                          name: club.name,
                          category: clubDetail?.category,
                          description: clubDetail?.description,
                          logo: clubDetail?.logo,
                          memberCount: clubDetail?.memberCount,
                          meetingDay: clubDetail?.meetingDay,
                          location: clubDetail?.location,
                          role: club.role === 'leader' ? 'หัวหน้า' : 'สมาชิก',
                        }}
                        onClick={() => navigate(`/club/${club.id}/home`)}
                        showRole
                      />
                    );
                  })}
            </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Recent Documents - Only for admins */}
      {user.role === "admin" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>เอกสาร Smart Documents ล่าสุด</CardTitle>
              <CardDescription>รายการอัปเดตจากฐานข้อมูลล่าสุด (ทุกชมรม)</CardDescription>
            </CardHeader>
            <CardContent>
              <AsyncBoundary loading={loadingAdminDashboard}>
                {adminRecentDocs.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="ยังไม่มีข้อความจาก Smart Documents"
                    description="เอกสารล่าสุดจะแสดงที่นี่เมื่อมีบันทึกในระบบ"
                  />
                ) : (
                  <div className="space-y-4">
                    {adminRecentDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedAdminDoc(doc)}
                        onKeyDown={(e) => {
                          if (e.key === " ") e.preventDefault();
                          if (e.key === "Enter" || e.key === " ") setSelectedAdminDoc(doc);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{doc.title}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            {doc.submittedByName} •{" "}
                            {new Date(doc.updatedAt).toLocaleDateString("th-TH")}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:ml-4 sm:flex-nowrap sm:flex-shrink-0">
                          {getTypeBadge(doc.type)}
                          <Badge variant="secondary" className="truncate max-w-[160px] text-xs font-normal">
                            {doc.clubName?.trim()
                              ? doc.clubName
                              : doc.clubIdNum
                                ? `ชมรม #${doc.clubIdNum}`
                                : "ชมรมไม่ระบุ"}
                          </Badge>
                          {getStatusBadge(doc.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AsyncBoundary>
            </CardContent>
          </Card>

          <Dialog open={!!selectedAdminDoc} onOpenChange={() => setSelectedAdminDoc(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              {selectedAdminDoc && (
                <>
                  <DialogHeader>
                    <DialogTitle>{selectedAdminDoc.title}</DialogTitle>
                    <DialogDescription>
                      อัปเดตล่าสุด{" "}
                      {new Date(selectedAdminDoc.updatedAt).toLocaleDateString("th-TH")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                      {getTypeBadge(selectedAdminDoc.type)}
                      {getStatusBadge(selectedAdminDoc.status)}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label>ชมรม</Label>
                        <p className="mt-1">
                          {selectedAdminDoc.clubName?.trim()
                            ? selectedAdminDoc.clubName
                            : selectedAdminDoc.clubIdNum
                              ? `ชมรม #${selectedAdminDoc.clubIdNum}`
                              : "ชมรมไม่ระบุ"}
                        </p>
                      </div>
                      <div>
                        <Label>สร้าง/ผู้เกี่ยวข้อง</Label>
                        <p className="mt-1">{selectedAdminDoc.submittedByName}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground border-t pt-3">
                      เปิดภาพรวมในเมนู Smart Documents เพื่อดูรายละเอียดและไฟล์ครบถ้วน
                    </p>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </PageChrome>
  );
}
