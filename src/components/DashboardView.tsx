import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { FileText, Users, Calendar, TrendingUp, Clock, CheckCircle2, AlertCircle, XCircle, MapPin, ClipboardList, ArrowRight } from "lucide-react";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { toast } from "sonner";
import type { User } from "../App";
import { clubApi, type Club } from "../features/club/api/clubApi";
import { useClubSocket } from "../features/club/hooks/useClubSocket";

interface DashboardViewProps {
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
}

interface Document {
  id: number;
  title: string;
  type: "reimbursement" | "proposal";
  status: "pending" | "approved" | "revision" | "rejected";
  submittedBy: string;
  date: string;
  amount: string;
  description: string;
  attachments?: string[];
}

export function DashboardView({ user, onUserUpdate }: DashboardViewProps) {
  const navigate = useNavigate();
  const [clubDetails, setClubDetails] = useState<Map<number, Club>>(new Map());
  const [isLoadingClubs, setIsLoadingClubs] = useState(false);

  // Fetch club details for approved memberships
  useEffect(() => {
    const fetchClubDetails = async () => {
      const approvedMemberships = user.memberships?.filter(m => m.status === 'approved') || [];
      if (approvedMemberships.length === 0) return;

      try {
        setIsLoadingClubs(true);
        const clubPromises = approvedMemberships.map(m => 
          clubApi.getClubById(m.clubId).catch(() => null)
        );
        const clubs = await Promise.all(clubPromises);
        
        const detailsMap = new Map<number, Club>();
        clubs.forEach((club, index) => {
          if (club) {
            detailsMap.set(approvedMemberships[index].clubId, club);
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
      if (data.status === 'approved' && data.clubId) {
        try {
          const club = await clubApi.getClubById(data.clubId);
          setClubDetails(prev => new Map(prev).set(data.clubId, club));
        } catch (error) {
          console.error('Error refreshing club details:', error);
        }
      } else if (data.status === 'left' && data.clubId) {
        // Remove club from details when membership is removed
        setClubDetails(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.clubId);
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


  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const recentDocuments: Document[] = [
    {
      id: 1,
      title: "Annual Concert Proposal",
      type: "proposal",
      status: "pending",
      submittedBy: "สมชาย ใจดี",
      date: "2025-11-05",
      amount: "฿15,000",
      description: "ข้อเสนอสำหรับจัดคอนเสิร์ตประจำปี รวมค่าเช่าสถานที่ เครื่องเสียง และการตลาด",
      attachments: ["proposal.pdf", "breakdown.xlsx"],
    },
    {
      id: 2,
      title: "Equipment Purchase Reimbursement",
      type: "reimbursement",
      status: "approved",
      submittedBy: "สมหญิง รักดี",
      date: "2025-11-03",
      amount: "฿3,500",
      description: "เบิกค่าซื้อไมโครโฟนและสายสัญญาณสำหรับการซ้อม",
      attachments: ["receipt.jpg"],
    },
    {
      id: 3,
      title: "Workshop Activity Proposal",
      type: "proposal",
      status: "revision",
      submittedBy: "ประภาส มั่นคง",
      date: "2025-11-01",
      amount: "฿8,000",
      description: "โครงการเวิร์คช็อปสอนดนตรีให้น้องใหม่",
      attachments: ["workshop-plan.pdf"],
    },
    {
      id: 4,
      title: "Monthly Meeting Expenses",
      type: "reimbursement",
      status: "approved",
      submittedBy: "วิชัย สุขใจ",
      date: "2025-10-30",
      amount: "฿2,000",
      description: "ค่าอาหารและเครื่องดื่มสำหรับประชุมประจำเดือน",
      attachments: ["receipt-1.jpg", "receipt-2.jpg"],
    },
    {
      id: 5,
      title: "New Instrument Purchase Request",
      type: "proposal",
      status: "pending",
      submittedBy: "สมชาย ใจดี",
      date: "2025-10-28",
      amount: "฿25,000",
      description: "ขอซื้อกีตาร์ไฟฟ้าและแอมป์สำหรับการซ้อม",
    },
  ];

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
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            อนุมัติแล้ว
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            รอดำเนินการ
          </Badge>
        );
      case "revision":
        return (
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            ต้องแก้ไข
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            ปฏิเสธ
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-xl md:text-2xl">Dashboard Overview</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          ยินดีต้อนรับกลับ, {user.firstName} {user.lastName}! {
            user.role === "admin" 
              ? "นี่คือภาพรวมของชมรมทั้งหมดในมหาวิทยาลัย"
              : user.role === "leader"
              ? `นี่คือสิ่งที่เกิดขึ้นกับ${user.clubName || "ชมรมของคุณ"}`
              : "นี่คือสรุปกิจกรรมชมรมของคุณ"
          }
        </p>
      </div>


      {/* Member Activity - Only for leaders and admins */}
      {(user.role === "leader" || user.role === "admin") && (
        <div className="grid gap-6 lg:grid-cols-1">
        {/* Member Activity */}
        <Card>
          <CardHeader>
              <CardTitle>อัตราการใช้งานของสมาชิก</CardTitle>
              <CardDescription>การมีส่วนร่วม 30 วันล่าสุด</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-xl sm:text-2xl">85%</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">อัตราการใช้งานเฉลี่ย</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xl sm:text-2xl text-green-600">41</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">สมาชิกที่ใช้งาน</p>
                </div>
              </div>
              <Progress value={85} className="h-2" />
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                    <span>เข้าร่วมกิจกรรมทั้งหมด</span>
                    <span className="text-green-600">28 คน</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span>เข้าร่วมกิจกรรม 50%+</span>
                    <span className="text-blue-600">13 คน</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span>เข้าร่วมต่ำกว่า 50%</span>
                    <span className="text-orange-600">7 คน</span>
                  </div>
                </div>
              </div>
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
                id: String(m.clubId),
                name: m.clubName || `ชมรม #${m.clubId}`,
                role: m.role || 'member',
                joinDate: m.approvedDate || m.requestDate,
              }));

              return joinedClubs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>คุณยังไม่ได้เข้าร่วมชมรมใดๆ</p>
                  <p className="text-sm mt-1">ไปที่ "เข้าร่วมชมรม" เพื่อสำรวจชมรมที่มี</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {joinedClubs.map((club) => {
                    const clubDetail = clubDetails.get(parseInt(club.id));
                    return (
                      <Card 
                        key={club.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/club/${club.id}/home`)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={clubDetail?.logo} />
                              <AvatarFallback>
                                {club.name.substring(4, 6)}
                              </AvatarFallback>
                            </Avatar>
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {club.role === 'leader' ? 'หัวหน้า' : 'สมาชิก'}
                            </Badge>
                          </div>
                          <CardTitle className="text-base mt-3">{club.name}</CardTitle>
                          {clubDetail?.category && (
                            <CardDescription>
                              <Badge variant="outline" className="text-xs">{clubDetail.category}</Badge>
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {clubDetail?.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {clubDetail.description}
                            </p>
                          )}
                          <div className="space-y-2 text-sm text-muted-foreground">
                            {clubDetail?.memberCount !== undefined && (
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3" />
                                <span>{clubDetail.memberCount} สมาชิก</span>
                              </div>
                            )}
                            {clubDetail?.meetingDay && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>{clubDetail.meetingDay}</span>
                              </div>
                            )}
                            {clubDetail?.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>{clubDetail.location}</span>
                              </div>
                            )}
                          </div>
                          <div className="pt-4 border-t text-xs text-muted-foreground">
                            เข้าร่วมเมื่อ: {new Date(club.joinDate).toLocaleDateString('th-TH')}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
            </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Recent Documents - Only for leaders and admins */}
      {(user.role === "leader" || user.role === "admin") && (
        <>
      <Card>
        <CardHeader>
              <CardTitle>การส่งเอกสารล่าสุด</CardTitle>
          <CardDescription>
                ข้อเสนอโครงการและคำขอเบิกจ่ายล่าสุด
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedDoc(doc)}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{doc.title}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    By {doc.submittedBy} • {new Date(doc.date).toLocaleDateString('th-TH')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:ml-4 sm:flex-nowrap sm:flex-shrink-0">
                  {getTypeBadge(doc.type)}
                  <span className="text-sm font-medium whitespace-nowrap">{doc.amount}</span>
                  {getStatusBadge(doc.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document Detail Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedDoc && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedDoc.title}</DialogTitle>
                <DialogDescription>
                      ส่งเมื่อ {new Date(selectedDoc.date).toLocaleDateString('th-TH')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                      {getTypeBadge(selectedDoc.type)}
                  {getStatusBadge(selectedDoc.status)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                        <Label>จำนวนเงิน</Label>
                    <p className="text-2xl mt-1">{selectedDoc.amount}</p>
                  </div>
                  <div>
                        <Label>ส่งโดย</Label>
                    <p className="mt-1">{selectedDoc.submittedBy}</p>
                  </div>
                </div>
                <div>
                      <Label>คำอธิบาย</Label>
                  <p className="mt-2 text-sm text-muted-foreground">{selectedDoc.description}</p>
                </div>
                {selectedDoc.attachments && selectedDoc.attachments.length > 0 && (
                  <div>
                        <Label>ไฟล์แนบ</Label>
                    <div className="mt-2 space-y-2">
                      {selectedDoc.attachments.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
