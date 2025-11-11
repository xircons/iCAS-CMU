import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage, getDiceBearAvatar } from "./ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Progress } from "./ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Search, TrendingUp, TrendingDown, Minus, Eye, CheckCircle, XCircle } from "lucide-react";
import type { User } from "../App";

interface MembersViewProps {
  user: User;
}

interface Member {
  id: string;
  name: string;
  role: string;
  email: string;
  activeRate: number;
  eventsAttended: number;
  totalEvents: number;
  lastActive: string;
  trend: "up" | "down" | "stable";
  avatar?: string;
}

export function MembersView({ user }: MembersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const [members] = useState<Member[]>([
    {
      id: "1",
      name: "สมชาย ใจดี",
      role: "President",
      email: "somchai@cmu.ac.th",
      activeRate: 95,
      eventsAttended: 19,
      totalEvents: 20,
      lastActive: "2025-11-07",
      trend: "stable",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Somchai",
    },
    {
      id: "2",
      name: "สมหญิง รักดี",
      role: "Vice President",
      email: "somying@cmu.ac.th",
      activeRate: 90,
      eventsAttended: 18,
      totalEvents: 20,
      lastActive: "2025-11-06",
      trend: "up",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Somying",
    },
    {
      id: "3",
      name: "ประภาส มั่นคง",
      role: "Treasurer",
      email: "prapas@cmu.ac.th",
      activeRate: 88,
      eventsAttended: 17,
      totalEvents: 20,
      lastActive: "2025-11-07",
      trend: "up",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Prapas",
    },
    {
      id: "4",
      name: "วิชัย สุขใจ",
      role: "Secretary",
      email: "wichai@cmu.ac.th",
      activeRate: 85,
      eventsAttended: 17,
      totalEvents: 20,
      lastActive: "2025-11-05",
      trend: "stable",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Wichai",
    },
    {
      id: "5",
      name: "นภา สว่างใจ",
      role: "Member",
      email: "napa@cmu.ac.th",
      activeRate: 82,
      eventsAttended: 16,
      totalEvents: 20,
      lastActive: "2025-11-06",
      trend: "down",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Napa",
    },
    {
      id: "6",
      name: "ธนพล แข็งแรง",
      role: "Member",
      email: "tanpon@cmu.ac.th",
      activeRate: 75,
      eventsAttended: 15,
      totalEvents: 20,
      lastActive: "2025-11-04",
      trend: "down",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tanpon",
    },
    {
      id: "7",
      name: "พิมพ์ใจ ดีงาม",
      role: "Member",
      email: "pimjai@cmu.ac.th",
      activeRate: 70,
      eventsAttended: 14,
      totalEvents: 20,
      lastActive: "2025-11-03",
      trend: "stable",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pimjai",
    },
    {
      id: "8",
      name: "ศิริพร รุ่งเรือง",
      role: "Member",
      email: "siriporn@cmu.ac.th",
      activeRate: 65,
      eventsAttended: 13,
      totalEvents: 20,
      lastActive: "2025-11-01",
      trend: "down",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Siriporn",
    },
  ]);

  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActiveRateBadge = (rate: number) => {
    if (rate >= 80) {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">ใช้งานมาก</Badge>;
    } else if (rate >= 60) {
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">ใช้งาน</Badge>;
    } else if (rate >= 40) {
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">ปานกลาง</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">ไม่ใช้งาน</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "stable":
        return <Minus className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const averageActiveRate = Math.round(
    members.reduce((sum, m) => sum + m.activeRate, 0) / members.length
  );

  const highlyActiveCount = members.filter(m => m.activeRate >= 80).length;
  const activeCount = members.filter(m => m.activeRate >= 60 && m.activeRate < 80).length;
  const moderateCount = members.filter(m => m.activeRate >= 40 && m.activeRate < 60).length;
  const inactiveCount = members.filter(m => m.activeRate < 40).length;

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2">Member Tracker & Evaluation</h1>
        <p className="text-muted-foreground">
          ติดตามการมีส่วนร่วมของสมาชิกและประเมินผลการปฏิบัติงานตามข้อมูลการเข้าร่วม
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">สมาชิกทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{members.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              สมาชิกที่ลงทะเบียน
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">อัตราการใช้งานเฉลี่ย</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{averageActiveRate}%</div>
            <Progress value={averageActiveRate} className="h-1 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">ใช้งานมาก</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">{highlyActiveCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              การเข้าร่วม 80%+
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">ต้องให้ความสนใจ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-orange-600">{moderateCount + inactiveCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              การเข้าร่วมต่ำกว่า 60%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>การกระจายกิจกรรม</CardTitle>
          <CardDescription>การแบ่งสมาชิกตามระดับการมีส่วนร่วม</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm">ใช้งานมาก (80%+)</span>
              </div>
              <span className="text-sm">{highlyActiveCount} คน</span>
            </div>
            <Progress value={(highlyActiveCount / members.length) * 100} className="h-2 bg-green-100" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm">ใช้งาน (60-79%)</span>
              </div>
              <span className="text-sm">{activeCount} คน</span>
            </div>
            <Progress value={(activeCount / members.length) * 100} className="h-2 bg-blue-100" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm">ปานกลาง (40-59%)</span>
              </div>
              <span className="text-sm">{moderateCount} คน</span>
            </div>
            <Progress value={(moderateCount / members.length) * 100} className="h-2 bg-yellow-100" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">ไม่ใช้งาน (ต่ำกว่า 40%)</span>
              </div>
              <span className="text-sm">{inactiveCount} คน</span>
            </div>
            <Progress value={(inactiveCount / members.length) * 100} className="h-2 bg-red-100" />
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาสมาชิกตามชื่อ อีเมล หรือบทบาท..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายชื่อสมาชิก</CardTitle>
          <CardDescription>
            พบ {filteredMembers.length} คน
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>สมาชิก</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead>การเข้าร่วม</TableHead>
                <TableHead>อัตราการใช้งาน</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>แนวโน้ม</TableHead>
                <TableHead>การดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.avatar || getDiceBearAvatar(member.name)} />
                        <AvatarFallback>{member.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p>{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>
                    {member.eventsAttended}/{member.totalEvents}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span>{member.activeRate}%</span>
                      </div>
                      <Progress value={member.activeRate} className="h-1 w-20" />
                    </div>
                  </TableCell>
                  <TableCell>{getActiveRateBadge(member.activeRate)}</TableCell>
                  <TableCell>{getTrendIcon(member.trend)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMember(member)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Member Detail Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-2xl">
          {selectedMember && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedMember.avatar || getDiceBearAvatar(selectedMember.name)} />
                    <AvatarFallback>{selectedMember.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{selectedMember.name}</DialogTitle>
                    <DialogDescription>{selectedMember.role}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">อัตราการใช้งาน</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl">{selectedMember.activeRate}%</div>
                      <Progress value={selectedMember.activeRate} className="h-2 mt-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">กิจกรรมที่เข้าร่วม</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl">
                        {selectedMember.eventsAttended}/{selectedMember.totalEvents}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        30 วันล่าสุด
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <h4 className="text-sm mb-3">กิจกรรมล่าสุด</h4>
                  <div className="space-y-2">
                    {[
                      { event: "Weekly Practice Session", date: "2025-11-07", attended: true },
                      { event: "Monthly Meeting", date: "2025-11-05", attended: true },
                      { event: "Community Concert", date: "2025-11-02", attended: true },
                      { event: "Workshop Planning", date: "2025-10-30", attended: false },
                      { event: "Instrument Maintenance", date: "2025-10-28", attended: true },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {activity.attended ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <div>
                            <p className="text-sm">{activity.event}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(activity.date).toLocaleDateString('th-TH')}
                            </p>
                          </div>
                        </div>
                        <Badge variant={activity.attended ? "default" : "outline"}>
                          {activity.attended ? "เข้าร่วม" : "ไม่เข้าร่วม"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
