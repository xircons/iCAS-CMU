import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Search, Users, Calendar, MapPin, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";

interface JoinClubsViewProps {
  user: User;
}

interface Club {
  id: string;
  name: string;
  category: string;
  description: string;
  memberCount: number;
  president: string;
  meetingDay: string;
  location: string;
}

interface ClubMembership {
  clubId: string;
  status: "joined" | "pending" | "rejected";
  role?: "member" | "staff";
  requestDate?: string;
}

export function JoinClubsView({ user }: JoinClubsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  
  // All available clubs
  const [allClubs] = useState<Club[]>([
    {
      id: "club-1",
      name: "ชมรมดนตรีสากล",
      category: "Arts & Music",
      description: "ชมรมสำหรับผู้ที่สนใจดนตรีสากล ทั้งการเล่นเครื่องดนตรี ร้องเพลง และการแสดงบนเวที",
      memberCount: 48,
      president: "สมหญิง หัวหน้า",
      meetingDay: "Every Saturday",
      location: "Music Room 301",
    },
    {
      id: "club-2",
      name: "ชมรมภาพถ่าย",
      category: "Arts & Media",
      description: "เรียนรู้เทคนิคการถ่ายภาพ การตัดต่อ และการจัดนิทรรศการภาพถ่าย",
      memberCount: 35,
      president: "วิชัย ช่างภาพ",
      meetingDay: "Every Sunday",
      location: "Art Building",
    },
    {
      id: "club-3",
      name: "ชมรมหุ่นยนต์",
      category: "Technology",
      description: "พัฒนาและสร้างหุ่นยนต์ เข้าร่วมการแข่งขัน และเรียนรู้เทคโนโลยีใหม่ๆ",
      memberCount: 42,
      president: "ธนพล วิศวกร",
      meetingDay: "Every Friday",
      location: "Engineering Lab 5",
    },
    {
      id: "club-4",
      name: "ชมรมอาสาพัฒนา",
      category: "Community Service",
      description: "ทำกิจกรรมบริการสังคม ช่วยเหลือชุมชน และพัฒนาท้องถิ่น",
      memberCount: 56,
      president: "นภา ใจดี",
      meetingDay: "Every Sunday",
      location: "Student Center",
    },
    {
      id: "club-5",
      name: "ชมรมกีฬาแบดมินตัน",
      category: "Sports",
      description: "ฝึกซ้อมและแข่งขันกีฬาแบดมินตัน เหมาะสำหรับทุกระดับความสามารถ",
      memberCount: 62,
      president: "ศิริพร นักกีฬา",
      meetingDay: "Tuesday & Thursday",
      location: "Sports Complex",
    },
    {
      id: "club-6",
      name: "ชมรมภาษาญี่ปุ่น",
      category: "Language & Culture",
      description: "เรียนรู้ภาษาและวัฒนธรรมญี่ปุ่น พร้อมกิจกรรมแลกเปลี่ยนวัฒนธรรม",
      memberCount: 38,
      president: "พิมพ์ใจ ซากุระ",
      meetingDay: "Every Wednesday",
      location: "Language Center",
    },
    {
      id: "club-7",
      name: "ชมรมการ์ตูนและอนิเมะ",
      category: "Arts & Media",
      description: "พูดคุย แบ่งปัน และสร้างสรรค์ผลงานเกี่ยวกับการ์ตูนและอนิเมะ",
      memberCount: 45,
      president: "ประภาส มังงะ",
      meetingDay: "Every Saturday",
      location: "Art Building Room 202",
    },
    {
      id: "club-8",
      name: "ชมรมธุรกิจและการลงทุน",
      category: "Business",
      description: "เรียนรู้การทำธุรกิจ การลงทุน และการบริหารจัดการ",
      memberCount: 52,
      president: "สมชาย นักธุรกิจ",
      meetingDay: "Every Monday",
      location: "Business School",
    },
  ]);

  // Member's club memberships (mock data) - to track which clubs are joined or pending
  const [memberships, setMemberships] = useState<ClubMembership[]>([
    {
      clubId: "club-1",
      status: "joined",
      role: "member",
      requestDate: "2025-10-15",
    },
    {
      clubId: "club-3",
      status: "pending",
      requestDate: "2025-11-05",
    },
  ]);

  // Get available clubs (not joined, not pending)
  const availableClubs = allClubs.filter(club => 
    !memberships.some(m => m.clubId === club.id && (m.status === "joined" || m.status === "pending"))
  );

  const filteredAvailableClubs = availableClubs.filter((club) =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinClub = (clubId: string) => {
    setMemberships([...memberships, {
      clubId,
      status: "pending",
      requestDate: new Date().toISOString().split('T')[0],
    }]);
    toast.success("ส่งคำขอเข้าร่วมแล้ว! กำลังรอการอนุมัติจากหัวหน้า");
    setSelectedClub(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2">Join New Club</h1>
        <p className="text-muted-foreground">
          สำรวจและเข้าร่วมชมรมที่ตรงกับความสนใจของคุณ
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">ชมรมที่มี</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{availableClubs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ชมรมที่คุณสามารถเข้าร่วมได้
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">ชมรมทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{allClubs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ชมรมทั้งหมดในมหาวิทยาลัย
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">สมาชิกทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{allClubs.reduce((sum, c) => sum + c.memberCount, 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              สมาชิกชมรมที่ใช้งานอยู่
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
              placeholder="ค้นหาชมรมตามชื่อ หมวดหมู่ หรือคำอธิบาย..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Available Clubs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAvailableClubs.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>ไม่พบชมรมที่ตรงกับการค้นหาของคุณ</p>
          </div>
        ) : (
          filteredAvailableClubs.map((club) => (
            <Card key={club.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="invalid" />
                    <AvatarFallback>
                      {club.name.substring(4, 6)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-base mt-3">{club.name}</CardTitle>
                <CardDescription>
                  <Badge variant="outline" className="text-xs">{club.category}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {club.description}
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    <span>{club.memberCount} คน</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>{club.meetingDay}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>{club.location}</span>
                  </div>
                </div>
                <Button
                  className="w-full mt-2"
                  onClick={() => setSelectedClub(club)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  เข้าร่วมชมรม
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Join Club Confirmation Dialog */}
      <Dialog open={!!selectedClub} onOpenChange={() => setSelectedClub(null)}>
        <DialogContent className="max-w-2xl">
          {selectedClub && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="invalid" />
                    <AvatarFallback className="text-xl">
                      {selectedClub.name.substring(4, 6)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <DialogTitle>{selectedClub.name}</DialogTitle>
                    <DialogDescription>
                      <Badge variant="outline" className="mt-1">{selectedClub.category}</Badge>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm mb-2">เกี่ยวกับ</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedClub.description}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">สมาชิก</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl">{selectedClub.memberCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">ประธาน</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedClub.president}</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">ตารางการประชุม</p>
                      <p className="text-xs text-muted-foreground">{selectedClub.meetingDay}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">สถานที่</p>
                      <p className="text-xs text-muted-foreground">{selectedClub.location}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1"
                    onClick={() => handleJoinClub(selectedClub.id)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    เข้าร่วมชมรม
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedClub(null)}>
                    ยกเลิก
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
