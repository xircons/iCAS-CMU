import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Avatar, AvatarImage, AvatarFallback, getDiceBearAvatar } from "./ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { cn } from "./ui/utils";
import { Search, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";
import { PageChrome, StatsCard, AsyncBoundary } from "./shared";
import type { OversightLeader, OversightMember } from "../features/admin/api/adminApi";
import { adminApi } from "../features/admin/api/adminApi";

interface LeaderUserOversightViewProps {
  user: User;
}

export function LeaderUserOversightView({ user: _user }: LeaderUserOversightViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"leaders" | "members">("leaders");

  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<OversightLeader[]>([]);
  const [members, setMembers] = useState<OversightMember[]>([]);
  const [suspensionBusyUserId, setSuspensionBusyUserId] = useState<number | null>(null);
  const suspensionInFlightRef = useRef(false);

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    try {
      if (!silent) setLoading(true);
      const { leaders: L, members: M } = await adminApi.getOversight();
      setLeaders(L);
      setMembers(M);
    } catch {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
      if (!silent) {
        setLeaders([]);
        setMembers([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredLeaders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return leaders;
    return leaders.filter((leader) => {
      const name = `${leader.firstName} ${leader.lastName}`.trim().toLowerCase();
      return (
        name.includes(q) ||
        leader.email.toLowerCase().includes(q) ||
        leader.clubName.toLowerCase().includes(q) ||
        (leader.clubPublicId || "").toLowerCase().includes(q)
      );
    });
  }, [leaders, searchQuery]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) => {
      const name = `${member.firstName} ${member.lastName}`.trim().toLowerCase();
      return (
        name.includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.clubName.toLowerCase().includes(q) ||
        (member.clubPublicId || "").toLowerCase().includes(q)
      );
    });
  }, [members, searchQuery]);

  const leaderTabCountLabel = useMemo(() => {
    const total = leaders.length;
    const q = searchQuery.trim();
    if (!q) return String(total);
    return `${filteredLeaders.length}/${total}`;
  }, [leaders.length, searchQuery, filteredLeaders.length]);

  const memberTabCountLabel = useMemo(() => {
    const total = members.length;
    const q = searchQuery.trim();
    if (!q) return String(total);
    return `${filteredMembers.length}/${total}`;
  }, [members.length, searchQuery, filteredMembers.length]);

  const getStatusBadge = (isSuspended: boolean) =>
    !isSuspended ? (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 whitespace-nowrap flex-shrink-0 text-xs">
        <CheckCircle className="h-3 w-3 mr-1 flex-shrink-0" />
        <span className="hidden sm:inline">ใช้งานอยู่</span>
        <span className="sm:hidden">ใช้งาน</span>
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 whitespace-nowrap flex-shrink-0 text-xs">
        <XCircle className="h-3 w-3 mr-1 flex-shrink-0" />
        <span className="hidden sm:inline">ระงับบัญชี</span>
        <span className="sm:hidden">ระงับ</span>
      </Badge>
    );

  const patchSuspensionLocally = useCallback((userId: number, isSuspended: boolean) => {
    setLeaders((prev) => prev.map((l) => (l.userId === userId ? { ...l, isSuspended } : l)));
    setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, isSuspended } : m)));
  }, []);

  const suspendUser = async (userId: number, suspended: boolean) => {
    if (suspensionInFlightRef.current) return;
    suspensionInFlightRef.current = true;

    const previousLeaders = leaders;
    const previousMembers = members;
    setSuspensionBusyUserId(userId);
    patchSuspensionLocally(userId, suspended);

    try {
      await adminApi.patchUserSuspension(userId, suspended);
      toast.success(suspended ? "ระงับบัญชีผู้ใช้แล้ว" : "ยกเลิกการระงับแล้ว");
      void loadData({ silent: true });
    } catch {
      setLeaders(previousLeaders);
      setMembers(previousMembers);
      toast.error(suspended ? "ระงับบัญชีไม่สำเร็จ" : "ยกเลิกการระงับไม่สำเร็จ");
    } finally {
      suspensionInFlightRef.current = false;
      setSuspensionBusyUserId(null);
    }
  };

  const stats = useMemo(() => {
    const uniqLeaderIds = new Set(leaders.map((l) => l.userId));
    const uniqMemberIds = new Set(members.map((m) => m.userId));
    return {
      totalLeaderSlots: leaders.length,
      suspendedLeaders: leaders.filter((l) => l.isSuspended).length,
      totalMemberRows: members.length,
      suspendedMembers: members.filter((m) => m.isSuspended).length,
      uniqueLeadersApprox: uniqLeaderIds.size,
      uniqueMembersApprox: uniqMemberIds.size,
    };
  }, [leaders, members]);

  return (
    <PageChrome
      title="Leader & User Oversight"
      description="หัวหน้าชมรมและสมาชิกที่อนุมัติแล้วจากฐานข้อมูล (ผู้ดูแลสามารถระงับบัญชี)"
    >
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatsCard
          title="บทบาทหัวหน้า / ประธาน (แถว)"
          value={stats.totalLeaderSlots}
          description={`ผู้ใช้ไม่ซ้ำ ${stats.uniqueLeadersApprox} คน`}
        />
        <StatsCard title="ผู้ถูกระงับในแถวหัวหน้า" value={stats.suspendedLeaders} valueClassName="text-red-600" />
        <StatsCard
          title="สมาชิก (แถว)"
          value={stats.totalMemberRows}
          description={`ผู้ใช้ไม่ซ้ำ ${stats.uniqueMembersApprox} คน`}
        />
        <StatsCard title="สมาชิกถูกระงับ" value={stats.suspendedMembers} valueClassName="text-red-600" />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v: string) => setActiveTab(v as "leaders" | "members")}
        className={cn("gap-4", "leader-user-oversight-tabs")}
      >
        <TabsList aria-label="หมวดหัวหน้าและสมาชิก">
          <TabsTrigger value="leaders" className="flex-1">
            <span className="leading-tight">หัวหน้า ({leaderTabCountLabel})</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex-1">
            <span className="leading-tight">สมาชิก ({memberTabCountLabel})</span>
          </TabsTrigger>
        </TabsList>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="ค้นหา ชื่อ อีเมล ชื่อชมรม รหัสชมรม (public id)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="ค้นหาหัวหน้าและสมาชิก"
          />
        </div>

        <AsyncBoundary loading={loading} loadingText="กำลังโหลดรายชื่อ...">

          <TabsContent value="leaders" className="mt-0 outline-none">
            <Card>
              <CardHeader>
                <CardTitle>หัวหน้าและประธานจากข้อมูลจริง</CardTitle>
                <CardDescription>ประธาน (president) และ membership role leader (ไม่รวมตำแหน่งซ้ำกับประธาน)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ผู้ใช้</TableHead>
                        <TableHead>ชมรม</TableHead>
                        <TableHead>บทบาทในระบบ</TableHead>
                        <TableHead>สถานะบัญชี</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeaders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                            {leaders.length === 0
                              ? "ยังไม่มีข้อมูลหัวหน้า/ประธานในระบบ"
                              : "ไม่พบข้อมูลตามที่ค้น ลองค้นด้วยชื่อ อีเมล ชื่อชมรม หรือรหัสชมรม (public id)"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLeaders.map((leader) => {
                          const lid = `${leader.userId}:${leader.clubPublicId}:${leader.relation}`;
                          const name = `${leader.firstName} ${leader.lastName}`.trim();
                          const rowSaving = suspensionBusyUserId === leader.userId;
                          return (
                            <TableRow key={lid}>
                              <TableCell>
                                <div className="flex gap-3">
                                  <Avatar className="h-9 w-9">
                                    <AvatarImage src={getDiceBearAvatar(leader.email)} />
                                    <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate max-w-[180px]">{name}</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{leader.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm font-medium truncate max-w-[160px]">{leader.clubName}</p>
                                <code className="text-xs text-muted-foreground">{leader.clubPublicId}</code>
                              </TableCell>
                              <TableCell>{leader.relation === "president" ? "ประธาน" : "หัวหน้าชมรม"}</TableCell>
                              <TableCell>{getStatusBadge(leader.isSuspended)}</TableCell>
                              <TableCell>
                                {!leader.isSuspended ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="min-w-[5.25rem]"
                                    disabled={suspensionBusyUserId !== null && suspensionBusyUserId !== leader.userId}
                                    onClick={() => void suspendUser(leader.userId, true)}
                                  >
                                    {rowSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "ระงับ"}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="min-w-[5.25rem]"
                                    disabled={suspensionBusyUserId !== null && suspensionBusyUserId !== leader.userId}
                                    onClick={() => void suspendUser(leader.userId, false)}
                                  >
                                    {rowSaving ? (
                                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                    ) : (
                                      "คืนสถานะ"
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-0 outline-none">
            <Card>
              <CardHeader>
                <CardTitle>สมาชิกที่อนุมัติแล้ว</CardTitle>
                <CardDescription>จาก Club Memberships สถานะ approved และ role member</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ผู้ใช้</TableHead>
                        <TableHead>ชมรม</TableHead>
                        <TableHead>วันเข้า (ถ้ามี)</TableHead>
                        <TableHead>สถานะบัญชี</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                            {members.length === 0
                              ? "ยังไม่มีสมาชิกที่อนุมัติในระบบ"
                              : "ไม่พบสมาชิกตามที่ค้น ลองค้นด้วยชื่อ อีเมล ชื่อชมรม หรือรหัสชมรม (public id)"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMembers.map((m) => {
                          const mk = `${m.userId}:${m.clubPublicId}`;
                          const nm = `${m.firstName} ${m.lastName}`.trim();
                          const rowSaving = suspensionBusyUserId === m.userId;
                          return (
                            <TableRow key={mk}>
                              <TableCell>
                                <div className="flex gap-3">
                                  <Avatar className="h-9 w-9">
                                    <AvatarImage src={getDiceBearAvatar(m.email)} />
                                    <AvatarFallback>{nm.slice(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{nm}</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{m.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm font-medium truncate max-w-[160px]">{m.clubName}</p>
                                <code className="text-xs text-muted-foreground">{m.clubPublicId}</code>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString("th-TH") : "—"}
                                </span>
                              </TableCell>
                              <TableCell>{getStatusBadge(m.isSuspended)}</TableCell>
                              <TableCell>
                                {!m.isSuspended ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="min-w-[6.5rem]"
                                    disabled={suspensionBusyUserId !== null && suspensionBusyUserId !== m.userId}
                                    onClick={() => void suspendUser(m.userId, true)}
                                  >
                                    {rowSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "ระงับบัญชี"}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="min-w-[6.5rem]"
                                    disabled={suspensionBusyUserId !== null && suspensionBusyUserId !== m.userId}
                                    onClick={() => void suspendUser(m.userId, false)}
                                  >
                                    {rowSaving ? (
                                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                    ) : (
                                      "คืนสถานะ"
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
      </AsyncBoundary>
    </Tabs>
    </PageChrome>
  );
}
