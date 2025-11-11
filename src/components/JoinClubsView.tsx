import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Search, Users, Calendar, MapPin, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";
import { clubApi, type Club, type ClubMembership } from "../features/club/api/clubApi";
import { useClubSocket } from "../features/club/hooks/useClubSocket";

interface JoinClubsViewProps {
  user: User;
}

export function JoinClubsView({ user }: JoinClubsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  // Fetch clubs and memberships
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [clubsData, membershipsData] = await Promise.all([
        clubApi.getAllClubs(),
        clubApi.getUserMemberships(),
      ]);
      setAllClubs(clubsData);
      setMemberships(membershipsData);
    } catch (error: any) {
      console.error('Error fetching clubs:', error);
      toast.error('ไม่สามารถโหลดข้อมูลชมรมได้ กรุณาลองอีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch clubs and memberships on mount
  useEffect(() => {
    fetchData();
  }, []);

  // WebSocket listener for membership status changes
  useClubSocket({
    onMembershipStatusChanged: async (data) => {
      // Refresh memberships when status changes (especially when rejected)
      // This will automatically update the available clubs list
      try {
        const updatedMemberships = await clubApi.getUserMemberships();
        setMemberships(updatedMemberships);
        
        if (data.status === 'rejected') {
          toast.info('คำขอเข้าร่วมชมรมของคุณถูกปฏิเสธ คุณสามารถส่งคำขอใหม่ได้');
        }
      } catch (error) {
        console.error('Error refreshing memberships:', error);
      }
    },
  });

  // Get available clubs (hide if approved or pending, show if rejected or left)
  const availableClubs = allClubs.filter(club => {
    const membership = memberships.find(m => m.clubId === club.id);
    // Show club if: no membership, or status is rejected/left
    // Hide club if: status is approved or pending
    return !membership || (membership.status !== 'approved' && membership.status !== 'pending');
  });

  const filteredAvailableClubs = availableClubs.filter((club) =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (club.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (club.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinClub = async (clubId: number) => {
    try {
      setIsJoining(true);
      const newMembership = await clubApi.joinClub({ clubId });
      // Update memberships to include the new pending membership
      // This will automatically hide the club from available clubs list
      setMemberships(prev => [...prev, newMembership]);
      toast.success("ส่งคำขอเข้าร่วมแล้ว! กำลังรอการอนุมัติจากหัวหน้า");
      setSelectedClub(null);
    } catch (error: any) {
      console.error('Error joining club:', error);
      const message = error.response?.data?.error?.message || 'ไม่สามารถส่งคำขอเข้าร่วมได้ กรุณาลองอีกครั้ง';
      toast.error(message);
    } finally {
      setIsJoining(false);
    }
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
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
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
                      <AvatarImage src={club.logo} />
                    <AvatarFallback>
                      {club.name.substring(4, 6)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-base mt-3">{club.name}</CardTitle>
                <CardDescription>
                    {club.category && (
                  <Badge variant="outline" className="text-xs">{club.category}</Badge>
                    )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                  {club.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {club.description}
                </p>
                  )}
                <div className="space-y-2 text-sm text-muted-foreground">
                    {club.memberCount !== undefined && (
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    <span>{club.memberCount} คน</span>
                  </div>
                    )}
                    {club.meetingDay && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>{club.meetingDay}</span>
                  </div>
                    )}
                    {club.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>{club.location}</span>
                  </div>
                    )}
                </div>
                <Button
                  className="w-full mt-2"
                  onClick={() => setSelectedClub(club)}
                    disabled={isJoining}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  เข้าร่วมชมรม
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      )}

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
                      {selectedClub.category && (
                      <Badge variant="outline" className="mt-1">{selectedClub.category}</Badge>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                {selectedClub.description && (
                <div>
                  <h4 className="text-sm mb-2">เกี่ยวกับ</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedClub.description}
                  </p>
                </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {selectedClub.memberCount !== undefined && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">สมาชิก</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl">{selectedClub.memberCount}</p>
                    </CardContent>
                  </Card>
                  )}
                  {selectedClub.presidentName && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">ประธาน</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">{selectedClub.presidentName}</p>
                    </CardContent>
                  </Card>
                  )}
                </div>
                {(selectedClub.meetingDay || selectedClub.location) && (
                <div className="space-y-2">
                    {selectedClub.meetingDay && (
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">ตารางการประชุม</p>
                      <p className="text-xs text-muted-foreground">{selectedClub.meetingDay}</p>
                    </div>
                  </div>
                    )}
                    {selectedClub.location && (
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">สถานที่</p>
                      <p className="text-xs text-muted-foreground">{selectedClub.location}</p>
                    </div>
                  </div>
                    )}
                </div>
                )}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1"
                    onClick={() => handleJoinClub(selectedClub.id)}
                    disabled={isJoining}
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        กำลังส่งคำขอ...
                      </>
                    ) : (
                      <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    เข้าร่วมชมรม
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedClub(null)} disabled={isJoining}>
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
