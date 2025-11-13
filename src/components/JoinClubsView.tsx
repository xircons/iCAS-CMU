import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Users, Calendar, MapPin, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";
import { clubApi, type Club, type ClubMembership } from "../features/club/api/clubApi";
import { useClubSocket } from "../features/club/hooks/useClubSocket";
import {
  PageContainer,
  PageHeader,
  LoadingSpinner,
  EmptyState,
  SearchInput,
  StatsCard,
  ClubCard,
} from "./shared";

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
  const fetchData = useCallback(async () => {
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
  }, []);

  // Fetch clubs and memberships on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memoize the membership status change handler
  const handleMembershipStatusChanged = useCallback(async (data: any) => {
    // Refresh memberships when status changes
    // This will automatically update the available clubs list
    try {
      const updatedMemberships = await clubApi.getUserMemberships();
      setMemberships(updatedMemberships);
      
      if (data.status === 'approved') {
        toast.success('คุณได้รับการอนุมัติเข้าร่วมชมรมแล้ว!');
      } else if (data.status === 'rejected') {
        toast.info('คำขอเข้าร่วมชมรมของคุณถูกปฏิเสธ คุณสามารถส่งคำขอใหม่ได้');
      }
    } catch (error) {
      console.error('Error refreshing memberships:', error);
    }
  }, []);

  // WebSocket listener for membership status changes
  useClubSocket({
    onMembershipStatusChanged: handleMembershipStatusChanged,
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
      setMemberships(prev => {
        // Check if membership already exists to avoid duplicates
        const exists = prev.find(m => m.id === newMembership.id || m.clubId === newMembership.clubId);
        if (exists) {
          // Update existing membership
          return prev.map(m => 
            m.id === newMembership.id || m.clubId === newMembership.clubId 
              ? newMembership 
              : m
          );
        }
        // Add new membership
        return [...prev, newMembership];
      });
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
    <PageContainer>
      <PageHeader
        title="Join New Club"
        description="สำรวจและเข้าร่วมชมรมที่ตรงกับความสนใจของคุณ"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="ชมรมที่มี"
          value={availableClubs.length}
          description="ชมรมที่คุณสามารถเข้าร่วมได้"
        />
        <StatsCard
          title="ชมรมทั้งหมด"
          value={allClubs.length}
          description="ชมรมทั้งหมดในมหาวิทยาลัย"
        />
        <StatsCard
          title="สมาชิกทั้งหมด"
          value={allClubs.reduce((sum, c) => sum + c.memberCount, 0)}
          description="สมาชิกชมรมที่ใช้งานอยู่"
        />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <SearchInput
              placeholder="ค้นหาชมรมตามชื่อ หมวดหมู่ หรือคำอธิบาย..."
              value={searchQuery}
            onChange={setSearchQuery}
            />
        </CardContent>
      </Card>

      {/* Available Clubs Grid */}
      {isLoading ? (
        <LoadingSpinner size="lg" />
      ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAvailableClubs.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Users}
              title="ไม่พบชมรมที่ตรงกับการค้นหาของคุณ"
            />
          </div>
        ) : (
          filteredAvailableClubs.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              actionButton={{
                label: "เข้าร่วมชมรม",
                icon: UserPlus,
                onClick: () => setSelectedClub(club),
                disabled: isJoining,
              }}
            />
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
    </PageContainer>
  );
}
