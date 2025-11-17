import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Plus, Users, Eye, Upload, X } from "lucide-react";
import { Progress } from "./ui/progress";
import { toast } from "sonner";
import type { User } from "../App";
import {
  PageContainer,
  PageHeader,
  StatusBadge,
  SearchInput,
  StatsCard,
} from "./shared";

interface CreateClubsViewProps {
  user: User;
}

interface Club {
  id: string;
  name: string;
  category: string;
  description: string;
  president?: string;
  memberCount: number;
  status: "active" | "pending" | "inactive";
  createdAt: string;
  logo?: string;
}

interface NewClubForm {
  name: string;
  category: string;
  description: string;
  president: string;
  status: "active" | "pending" | "inactive";
  logo: File | null;
}

export function CreateClubsView({ user }: CreateClubsViewProps) {
  console.log("CreateClubsView rendered with user:", user);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewClubOpen, setIsNewClubOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [newClubForm, setNewClubForm] = useState<NewClubForm>({
    name: "",
    category: "",
    description: "",
    president: "",
    status: "pending",
    logo: null,
  });

  const [clubs, setClubs] = useState<Club[]>([
    {
      id: "CLUB-001",
      name: "ชมรมดนตรีสากล",
      category: "Arts & Music",
      description: "ชมรมสำหรับผู้ที่สนใจดนตรีสากล ทั้งการเล่นเครื่องดนตรี ร้องเพลง และการแสดงบนเวที",
      president: "สมหญิง หัวหน้า",
      memberCount: 48,
      status: "active",
      createdAt: "2025-01-15",
    },
    {
      id: "CLUB-002",
      name: "ชมรมภาพถ่าย",
      category: "Arts & Media",
      description: "เรียนรู้และพัฒนาทักษะการถ่ายภาพ ทั้งภาพนิ่งและภาพเคลื่อนไหว",
      president: "วิชัย ช่างภาพ",
      memberCount: 35,
      status: "active",
      createdAt: "2025-02-20",
    },
    {
      id: "CLUB-003",
      name: "ชมรมหุ่นยนต์",
      category: "Technology",
      description: "พัฒนาและแข่งขันหุ่นยนต์ รวมถึงการเรียนรู้ AI และ IoT",
      president: "ธนพล วิศวกร",
      memberCount: 42,
      status: "active",
      createdAt: "2025-01-10",
    },
    {
      id: "CLUB-004",
      name: "ชมรมอาสาพัฒนา",
      category: "Community Service",
      description: "ทำกิจกรรมเพื่อสังคมและชุมชน",
      memberCount: 56,
      status: "pending",
      createdAt: "2025-11-01",
    },
  ]);

  const filteredClubs = clubs.filter((club) =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
        return (
      <StatusBadge
        status={status as any}
        className="whitespace-nowrap flex-shrink-0 text-xs"
      />
    );
  };

  const generateClubId = () => {
    const count = clubs.length + 1;
    return `CLUB-${String(count).padStart(3, "0")}`;
  };

  const handleSubmitNewClub = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newClubForm.name || !newClubForm.category) {
      toast.error("Please fill in required fields");
      return;
    }

    const newClub: Club = {
      id: generateClubId(),
      name: newClubForm.name,
      category: newClubForm.category,
      description: newClubForm.description,
      president: newClubForm.president || undefined,
      memberCount: 0,
      status: newClubForm.status,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setClubs((prev) => [newClub, ...prev]);
    toast.success(`สร้างชมรม "${newClub.name}" สำเร็จแล้วด้วยรหัส: ${newClub.id}`);
    
    // Reset form
    setNewClubForm({
      name: "",
      category: "",
      description: "",
      president: "",
      status: "pending",
      logo: null,
    });
    setIsNewClubOpen(false);
  };

  const stats = {
    total: clubs.length,
    active: clubs.filter((c) => c.status === "active").length,
    pending: clubs.filter((c) => c.status === "pending").length,
    inactive: clubs.filter((c) => c.status === "inactive").length,
  };

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex-1 min-w-0">
          <PageHeader
            title="Create Clubs"
            description="ลงทะเบียนชมรมใหม่และจัดการกระบวนการสร้างชมรม"
            titleClassName="font-bold"
          />
        </div>
        <Dialog open={isNewClubOpen} onOpenChange={setIsNewClubOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              สร้างชมรมใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>สร้างชมรมใหม่</DialogTitle>
              <DialogDescription>
                ลงทะเบียนชมรมใหม่ในระบบ รหัสชมรมจะถูกสร้างอัตโนมัติ
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitNewClub} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="club-name">ชื่อชมรม *</Label>
                <Input
                  id="club-name"
                  placeholder="เช่น ชมรมดนตรีสากล"
                  value={newClubForm.name}
                  onChange={(e) => setNewClubForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="club-category">หมวดหมู่ *</Label>
                  <Select
                    value={newClubForm.category}
                    onValueChange={(value) => setNewClubForm((prev) => ({ ...prev, category: value }))}
                    required
                  >
                    <SelectTrigger id="club-category">
                      <SelectValue placeholder="เลือกหมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arts & Music">ศิลปะและดนตรี</SelectItem>
                      <SelectItem value="Arts & Media">ศิลปะและสื่อ</SelectItem>
                      <SelectItem value="Technology">เทคโนโลยี</SelectItem>
                      <SelectItem value="Community Service">บริการสังคม</SelectItem>
                      <SelectItem value="Sports">กีฬา</SelectItem>
                      <SelectItem value="Language & Culture">ภาษาและวัฒนธรรม</SelectItem>
                      <SelectItem value="Business">ธุรกิจ</SelectItem>
                      <SelectItem value="Other">อื่นๆ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="club-description">คำอธิบาย</Label>
                <Textarea
                  id="club-description"
                  placeholder="อธิบายวัตถุประสงค์และกิจกรรมของชมรม"
                  rows={3}
                  value={newClubForm.description}
                  onChange={(e) => setNewClubForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="club-president">มอบหมายหัวหน้าเริ่มต้น (ไม่บังคับ)</Label>
                <Input
                  id="club-president"
                  placeholder="กรอกชื่อหัวหน้าหรือปล่อยว่างไว้"
                  value={newClubForm.president}
                  onChange={(e) => setNewClubForm((prev) => ({ ...prev, president: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  คุณสามารถมอบหมายหัวหน้าทีหลังได้จาก "จัดการเจ้าของชมรม"
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="club-logo">โลโก้ชมรม (ไม่บังคับ)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    คลิกเพื่ออัปโหลดหรือลากและวาง
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG สูงสุด 5MB
                  </p>
                  <Input
                    id="club-logo"
                    type="file"
                    accept="image/*"
                    className="mt-2"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setNewClubForm((prev) => ({ ...prev, logo: file || null }));
                    }}
                  />
                  {newClubForm.logo && (
                    <div className="mt-2 flex items-center gap-2 justify-center">
                      <span className="text-xs text-muted-foreground">{newClubForm.logo.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewClubForm((prev) => ({ ...prev, logo: null }))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="club-status">สถานะเริ่มต้น</Label>
                <Select
                  value={newClubForm.status}
                  onValueChange={(value: "active" | "pending" | "inactive") =>
                    setNewClubForm((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger id="club-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">รอ</SelectItem>
                    <SelectItem value="active">ใช้งานอยู่</SelectItem>
                    <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">สร้างชมรม</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewClubOpen(false)}
                >
                  ยกเลิก
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatsCard
          title="ชมรมทั้งหมด"
          value={stats.total}
          description="ลงทะเบียนแล้ว"
        />
        <StatsCard
          title="ใช้งานอยู่"
          value={stats.active}
          valueClassName="text-green-600"
        />
        <StatsCard
          title="รอ"
          value={stats.pending}
          valueClassName="text-yellow-600"
        />
        <StatsCard
          title="ไม่ใช้งาน"
          value={stats.inactive}
          valueClassName="text-red-600"
        />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <SearchInput
              placeholder="ค้นหาชมรมตามชื่อ หมวดหมู่ หรือรหัส..."
              value={searchQuery}
            onChange={setSearchQuery}
            />
        </CardContent>
      </Card>

      {/* Clubs Table - Desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>ชมรมทั้งหมด</CardTitle>
          <CardDescription>
            พบ {filteredClubs.length} ชมรม
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">รหัสชมรม</TableHead>
                  <TableHead className="min-w-[200px]">ชื่อชมรม</TableHead>
                  <TableHead className="whitespace-nowrap">หมวดหมู่</TableHead>
                  <TableHead className="whitespace-nowrap">หัวหน้า</TableHead>
                  <TableHead className="whitespace-nowrap">สมาชิก</TableHead>
                  <TableHead className="whitespace-nowrap">สถานะ</TableHead>
                  <TableHead className="whitespace-nowrap">สร้างเมื่อ</TableHead>
                  <TableHead className="whitespace-nowrap">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClubs.map((club) => (
                  <TableRow key={club.id}>
                    <TableCell className="whitespace-nowrap">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">{club.id}</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-3 min-w-0">
                        <Avatar className="shrink-0">
                          <AvatarFallback>
                            {club.name.substring(4, 6)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium break-words">{club.name}</p>
                          <p className="text-xs text-muted-foreground break-words mt-1 line-clamp-2">{club.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline">{club.category}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {club.president ? (
                        <span className="text-sm truncate max-w-[150px] block">{club.president}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{club.memberCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{getStatusBadge(club.status)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="text-sm text-muted-foreground">
                        {new Date(club.createdAt).toLocaleDateString("th-TH")}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedClub(club)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Clubs Cards - Mobile */}
      <div className="md:hidden w-full min-w-0 overflow-hidden">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>ชมรมทั้งหมด</CardTitle>
            <CardDescription>
              พบ {filteredClubs.length} ชมรม
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-3 px-4 pb-4">
              {filteredClubs.map((club) => (
                <div
                  key={club.id}
                  className="p-3 border rounded-lg hover:bg-slate-50 transition-colors w-full overflow-hidden"
                  onClick={() => setSelectedClub(club)}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <Avatar className="shrink-0">
                      <AvatarFallback>
                        {club.name.substring(4, 6)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm truncate flex-1">{club.name}</p>
                        {getStatusBadge(club.status)}
                      </div>
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">{club.id}</code>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="line-clamp-2">{club.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">{club.category}</Badge>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {club.memberCount} คน
                      </span>
                      {club.president && (
                        <span className="truncate">หัวหน้า: {club.president}</span>
                      )}
                    </div>
                    <p className="text-xs mt-1">
                      สร้างเมื่อ: {new Date(club.createdAt).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Club Detail Dialog */}
      <Dialog open={!!selectedClub} onOpenChange={() => setSelectedClub(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedClub && (
            <>
              <DialogHeader>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Avatar className="h-16 w-16 shrink-0">
                    <AvatarFallback className="text-xl">
                      {selectedClub.name.substring(4, 6)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="truncate">{selectedClub.name}</DialogTitle>
                    <DialogDescription>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded">{selectedClub.id}</code>
                        <Badge variant="outline">{selectedClub.category}</Badge>
                        {getStatusBadge(selectedClub.status)}
                      </div>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>คำอธิบาย</Label>
                  <p className="mt-2 text-sm text-muted-foreground">{selectedClub.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">สมาชิก</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl sm:text-2xl">{selectedClub.memberCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">สร้างเมื่อ</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{new Date(selectedClub.createdAt).toLocaleDateString("th-TH")}</p>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <Label>หัวหน้าปัจจุบัน</Label>
                  <p className="mt-1 text-sm">
                    {selectedClub.president || (
                      <span className="text-muted-foreground">ยังไม่ได้มอบหมายหัวหน้า</span>
                    )}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

