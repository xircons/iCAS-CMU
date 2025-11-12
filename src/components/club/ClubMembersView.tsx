import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage, getDiceBearAvatar } from "../ui/avatar";
import { Search, Users } from "lucide-react";
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

interface ClubMember {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  major: string;
  role: "member" | "staff" | "leader";
  status: "pending" | "approved" | "rejected";
  joinedAt: string;
  avatar?: string;
}

export function ClubMembersView() {
  const { club, clubId } = useClub();
  const { user } = useUser();
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Check if current user is a leader/admin of this club
  const isLeader = React.useMemo(() => {
    if (!user || !clubId) return false;
    if (user.role === "admin") return true;
    // Check if user is a leader in this specific club
    const membership = user.memberships?.find(m => 
      String(m.clubId) === String(clubId) && m.status === "approved"
    );
    return membership?.role === "leader" || club?.presidentId === user.id;
  }, [user, clubId, club?.presidentId]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!clubId) return;

      try {
        setIsLoading(true);
        setError(null);
        console.log("Fetching members for clubId:", clubId, "Type:", typeof clubId);
        const membersData = await clubApi.getClubMembers(clubId);
        console.log("Members data from API:", membersData);
        
        // Transform API response to match our interface
        // API returns: { id, userId, status, role, user: { firstName, lastName, email, major, avatar } }
        const transformedMembers = membersData.map((member: any) => {
          // Handle both flat structure and nested user structure
          const user = member.user || member;
          return {
            id: member.id,
            userId: member.userId || user.id,
            firstName: user.firstName || member.firstName || "",
            lastName: user.lastName || member.lastName || "",
            email: user.email || member.email || "",
            major: user.major || member.major || "",
            role: member.role || "member",
            status: member.status || "approved",
            joinedAt: member.approvedDate || member.createdAt || member.joinedAt,
            avatar: user.avatar || member.avatar,
          };
        });
        
        console.log("Transformed members:", transformedMembers);
        setMembers(transformedMembers);
        setError(null);
      } catch (error: any) {
        console.error("Error fetching club members:", error);
        console.error("Error details:", error.response?.data);
        console.error("User memberships:", user?.memberships);
        console.error("Current clubId:", clubId, "Type:", typeof clubId);
        
        // If it's a 403 error, the user might not have permission
        if (error.response?.status === 403) {
          // Check if user is a member of this club
          const isMemberOfClub = user?.memberships?.some(m => {
            const mClubId = String(m.clubId);
            const cClubId = String(clubId);
            console.log(`Comparing membership clubId: ${mClubId} with current clubId: ${cClubId}, status: ${m.status}`);
            return mClubId === cClubId && m.status === "approved";
          });
          console.log("Is member of club:", isMemberOfClub);
          
          if (!isMemberOfClub) {
            setError("คุณยังไม่ได้เป็นสมาชิกของชมรมนี้ หรือยังไม่ได้รับการอนุมัติ");
          } else {
            setError("คุณไม่มีสิทธิ์ในการดูรายชื่อสมาชิก - กรุณาติดต่อผู้ดูแลระบบ");
          }
        } else if (error.response?.status === 404) {
          setError("ไม่พบชมรม");
        } else {
          setError("เกิดข้อผิดพลาดในการโหลดข้อมูลสมาชิก");
        }
        setMembers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [clubId]);

  const filteredMembers = members.filter((member) => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    const email = member.email.toLowerCase();
    const major = member.major?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query) || major.includes(query);
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "leader":
        return (
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
            Leader
          </Badge>
        );
      case "staff":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            Staff
          </Badge>
        );
      default:
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            Member
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            {status}
          </Badge>
        );
    }
  };

  const handleChangeRole = async (membershipId: number, newRole: "member" | "staff" | "leader") => {
    if (!isLeader) return;
    
    try {
      setIsProcessing(true);
      await clubApi.updateMemberRole(membershipId, newRole);
      toast.success("อัปเดตบทบาทสมาชิกสำเร็จแล้ว!");
      
      // Refresh members list
      const membersData = await clubApi.getClubMembers(clubId!);
      const transformedMembers = membersData.map((member: any) => {
        const user = member.user || member;
        return {
          id: member.id,
          userId: member.userId || user.id,
          firstName: user.firstName || member.firstName || "",
          lastName: user.lastName || member.lastName || "",
          email: user.email || member.email || "",
          major: user.major || member.major || "",
          role: member.role || "member",
          status: member.status || "approved",
          joinedAt: member.approvedDate || member.createdAt || member.joinedAt,
          avatar: user.avatar || member.avatar,
        };
      });
      setMembers(transformedMembers);
    } catch (error: any) {
      console.error('Error updating role:', error);
      const message = error.response?.data?.error?.message || 'ไม่สามารถอัปเดตบทบาทได้';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-xl md:text-2xl">Member List</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {club?.name} - View all club members
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="!pl-12"
          style={{ paddingLeft: '2.5rem' }}
        />
      </div>

      {/* Members List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Loading members...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto mt-4 mb-2 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">ไม่พบผู้ใช้</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Members ({filteredMembers.length})</CardTitle>
            <CardDescription>All club members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Major</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>ไม่พบผู้ใช้</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage 
                                src={member.avatar || getDiceBearAvatar(`${member.firstName} ${member.lastName}`)} 
                              />
                              <AvatarFallback>
                                {member.firstName.substring(0, 1)}{member.lastName.substring(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{member.firstName} {member.lastName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>{member.major || "N/A"}</TableCell>
                        <TableCell>
                          {isLeader ? (
                            <Select
                              value={member.role}
                              onValueChange={(value: "member" | "staff" | "leader") => handleChangeRole(member.id, value)}
                              disabled={isProcessing}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                                <SelectItem value="leader">Leader</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            getRoleBadge(member.role)
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(member.status)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}