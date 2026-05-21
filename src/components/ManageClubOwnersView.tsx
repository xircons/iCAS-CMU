import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, UserCog, CheckCircle, Clock, XCircle, History, Edit, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";
import { PageChrome, StatsCard, AsyncBoundary } from "./shared";
import { clubApi, type Club } from "../features/club/api/clubApi";

interface ManageClubOwnersViewProps {
  user: User;
}

interface OwnerChangeLog {
  id: string;
  clubId: string;
  clubName: string;
  previousOwner?: string;
  newOwner: string;
  changedBy: string;
  date: string;
  reason?: string;
}

type UiClub = {
  publicId: string;
  clubName: string;
  category?: string;
  lifecycleStatus: Club["status"];
  presidentId?: number;
  presidentName?: string;
  presidentEmail?: string;
  coLeaderNames?: string;
};

function displayOwnerName(c: UiClub): string | undefined {
  return c.presidentName;
}

function presidentBadgeBucket(c: UiClub): "unassigned" | "pending" | "verified" | "inactive" {
  if (!c.presidentId) return "unassigned";
  if (c.lifecycleStatus === "inactive") return "inactive";
  if (c.lifecycleStatus === "pending") return "pending";
  return "verified";
}

function CoLeadersSummaryCell({ coLeaderNames }: { coLeaderNames?: string }) {
  const trimmed = coLeaderNames?.trim();
  if (!trimmed) {
    return <span className="text-sm text-muted-foreground">ไม่มี</span>;
  }
  const parts = trimmed.split(/,\s*/).map((s) => s.trim()).filter(Boolean);
  return (
    <div className="space-y-1 max-w-[220px]">
      {parts.map((name, i) => (
        <p key={`${name}:${i}`} className="text-sm font-medium leading-snug">
          {name}
        </p>
      ))}
    </div>
  );
}

type ClubMemberPickRow = {
  userId: number;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

type ClubMemberRole = "member" | "staff" | "leader";

type ClubMemberMgmtRow = {
  id: number;
  userId: number;
  role: ClubMemberRole;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

function isClubMemberRole(v: string): v is ClubMemberRole {
  return v === "member" || v === "staff" || v === "leader";
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
  ) {
    return (err as { response: { data: { message: string } } }).response.data.message;
  }
  return fallback;
}

export function ManageClubOwnersView({ user: _user }: ManageClubOwnersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClub, setSelectedClub] = useState<UiClub | null>(null);
  const [isChangeOwnerOpen, setIsChangeOwnerOpen] = useState(false);
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState("");
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [editingStatusPublicId, setEditingStatusPublicId] = useState<string | null>(null);

  const [clubsLoading, setClubsLoading] = useState(true);
  const [clubRows, setClubRows] = useState<UiClub[]>([]);

  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [clubPickMembersRaw, setClubPickMembersRaw] = useState<ClubMemberPickRow[]>([]);

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditLog, setAuditLog] = useState<OwnerChangeLog[]>([]);
  const [presidentSaving, setPresidentSaving] = useState(false);
  const [clearPresidentTarget, setClearPresidentTarget] = useState<UiClub | null>(null);
  const [clearPresidentSaving, setClearPresidentSaving] = useState(false);

  const [leadersMgmtClub, setLeadersMgmtClub] = useState<UiClub | null>(null);
  const [leadersMembersLoading, setLeadersMembersLoading] = useState(false);
  const [leadersMembersRaw, setLeadersMembersRaw] = useState<ClubMemberMgmtRow[]>([]);
  const [roleSavingMembershipId, setRoleSavingMembershipId] = useState<number | null>(null);

  const reloadClubs = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    try {
      if (!silent) setClubsLoading(true);
      const list = await clubApi.getAllClubs();
      setClubRows(
        list.map((c) => ({
          publicId: c.publicId,
          clubName: c.name,
          category: c.category,
          lifecycleStatus: c.status,
          presidentId: c.presidentId,
          presidentName: c.presidentName,
          presidentEmail: c.presidentEmail,
          coLeaderNames: c.coLeaderNames,
        }))
      );
    } catch {
      if (silent) {
        toast.error("Could not refresh clubs");
      } else {
        toast.error("Could not load clubs");
        setClubRows([]);
      }
    } finally {
      if (!silent) setClubsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadClubs();
  }, [reloadClubs]);

  useEffect(() => {
    if (!isChangeOwnerOpen || !selectedClub) {
      setClubPickMembersRaw([]);
      setPickerLoading(false);
      return;
    }
    let cancelled = false;
    setPickerLoading(true);
    clubApi
      .getClubMembers(selectedClub.publicId)
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        const normalized: ClubMemberPickRow[] = list
          .filter(
            (r: { userId?: number; user?: { firstName?: string; lastName?: string; email?: string } }) =>
              r?.userId != null &&
              r?.user &&
              typeof r.user.email === "string"
          )
          .map(
            (r: { userId: number; user: { firstName?: string; lastName?: string; email: string } }) => ({
              userId: Number(r.userId),
              user: {
                firstName: String(r.user.firstName ?? ""),
                lastName: String(r.user.lastName ?? ""),
                email: r.user.email,
              },
            })
          );
        setClubPickMembersRaw(normalized);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("ไม่สามารถโหลดรายชื่อสมาชิกชมรมได้");
          setClubPickMembersRaw([]);
        }
      })
      .finally(() => {
        if (!cancelled) setPickerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isChangeOwnerOpen, selectedClub?.publicId]);

  useEffect(() => {
    if (!leadersMgmtClub) {
      setLeadersMembersRaw([]);
      setLeadersMembersLoading(false);
      return;
    }
    let cancelled = false;
    setLeadersMembersLoading(true);
    clubApi
      .getClubMembers(leadersMgmtClub.publicId)
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        const normalized: ClubMemberMgmtRow[] = list
          .filter(
            (r: { id?: unknown; userId?: unknown; role?: unknown; user?: { email?: unknown } }) =>
              r?.id != null &&
              r?.userId != null &&
              r?.user &&
              typeof (r.user as { email?: unknown }).email === "string"
          )
          .map((r) => {
            const rawRole = String((r as { role?: unknown }).role ?? "member");
            const role: ClubMemberRole = isClubMemberRole(rawRole) ? rawRole : "member";
            const u = (r as { user: { firstName?: unknown; lastName?: unknown; email: string } }).user;
            return {
              id: Number((r as { id: unknown }).id),
              userId: Number((r as { userId: unknown }).userId),
              role,
              user: {
                firstName: String(u.firstName ?? ""),
                lastName: String(u.lastName ?? ""),
                email: u.email,
              },
            };
          });
        setLeadersMembersRaw(normalized);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("ไม่สามารถโหลดรายชื่อสมาชิกสำหรับจัดการบทบาทได้");
          setLeadersMembersRaw([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLeadersMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadersMgmtClub?.publicId]);

  const pickerUsers = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return clubPickMembersRaw
      .filter((m) => {
        if (!q) return true;
        const name = `${m.user.firstName} ${m.user.lastName}`.trim().toLowerCase();
        return name.includes(q) || m.user.email.toLowerCase().includes(q);
      })
      .map((m) => ({
        id: m.userId,
        email: m.user.email,
        label: `${m.user.firstName} ${m.user.lastName}`.trim() || m.user.email,
      }));
  }, [clubPickMembersRaw, pickerSearch]);

  const loadAggregateAudit = useCallback(async () => {
    try {
      setAuditLoading(true);
      const pubs = clubRows.map((c) => c.publicId);
      const chunks = await Promise.all(
        pubs.map(async (pid) => {
          try {
            return await clubApi.getPresidentAuditEntries(pid);
          } catch {
            return [];
          }
        })
      );
      const flat = chunks.flat();
      const normalized: OwnerChangeLog[] = flat.map((e) => ({
        id: String(e.id),
        clubId: e.clubId,
        clubName: e.clubName,
        previousOwner: e.previousOwner,
        newOwner: e.newOwner,
        changedBy: e.changedBy,
        date: e.date,
      }));
      normalized.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAuditLog(normalized);
    } finally {
      setAuditLoading(false);
    }
  }, [clubRows]);

  useEffect(() => {
    if (!showAuditLog) return;
    void loadAggregateAudit();
  }, [showAuditLog, loadAggregateAudit]);

  const filteredClubs = clubRows.filter(
    (club) =>
      club.clubName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.publicId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (club.presidentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (club.presidentEmail || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (club.coLeaderNames || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPresidentBadge = (bucket: ReturnType<typeof presidentBadgeBucket>) => {
    switch (bucket) {
      case "verified":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 whitespace-nowrap flex-shrink-0 text-xs">
            <CheckCircle className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">มีประธาน (ใช้งาน)</span>
            <span className="sm:hidden">ใช้งาน</span>
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 whitespace-nowrap flex-shrink-0 text-xs">
            <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">รอดำเนินการ</span>
            <span className="sm:hidden">รอ</span>
          </Badge>
        );
      case "inactive":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 whitespace-nowrap flex-shrink-0 text-xs">
            <XCircle className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">ระงับ/ไม่ใช้งาน</span>
            <span className="sm:hidden">ปิด</span>
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 whitespace-nowrap flex-shrink-0 text-xs">
            <XCircle className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="hidden sm:inline">ไม่มีประธาน</span>
            <span className="sm:hidden">ว่าง</span>
          </Badge>
        );
    }
  };

  const handleChangeOwnerSubmit = async () => {
    if (!selectedClub || !selectedNewOwnerId) {
      toast.error("กรุณาเลือกเจ้าของใหม่");
      return;
    }
    const uid = Number.parseInt(selectedNewOwnerId, 10);
    if (!Number.isFinite(uid)) {
      toast.error("เลือกผู้ใช้ไม่ถูกต้อง");
      return;
    }
    setPresidentSaving(true);
    try {
      const updated = await clubApi.patchClubPresident(selectedClub.publicId, uid);
      const pid = updated.publicId;
      setClubRows((prev) =>
        prev.map((c) =>
          c.publicId === pid
            ? {
                ...c,
                presidentId: updated.presidentId,
                presidentName: updated.presidentName,
                presidentEmail: updated.presidentEmail,
                lifecycleStatus: updated.status,
              }
            : c
        )
      );
      toast.success("อัปเดตประธานชมรมแล้ว");
      setIsChangeOwnerOpen(false);
      setSelectedNewOwnerId("");
      setPickerSearch("");
      setSelectedClub(null);
      void reloadClubs({ silent: true });
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "ไม่สามารถเปลี่ยนประธานได้"));
    } finally {
      setPresidentSaving(false);
    }
  };

  const handleLifecycleChange = async (publicId: string, next: Club["status"]) => {
    try {
      await clubApi.patchClubLifecycleStatus(publicId, next);
      setEditingStatusPublicId(null);
      setClubRows((prev) =>
        prev.map((c) => (c.publicId === publicId ? { ...c, lifecycleStatus: next } : c))
      );
      toast.success("อัปเดตสถานะชมรมแล้ว");
      void reloadClubs({ silent: true });
    } catch {
      toast.error("ไม่สามารถอัปเดตสถานะได้");
    }
  };

  const confirmClearPresident = async () => {
    if (!clearPresidentTarget) return;
    const publicId = clearPresidentTarget.publicId;
    setClearPresidentSaving(true);
    try {
      const updated = await clubApi.patchClubPresident(publicId, null);
      setClubRows((prev) =>
        prev.map((c) =>
          c.publicId === updated.publicId
            ? {
                ...c,
                presidentId: updated.presidentId,
                presidentName: updated.presidentName,
                presidentEmail: updated.presidentEmail,
                lifecycleStatus: updated.status,
              }
            : c
        )
      );
      toast.success("ถอดประธานชมรมแล้ว");
      setClearPresidentTarget(null);
      void reloadClubs({ silent: true });
    } catch {
      toast.error("ไม่สามารถถอดประธานได้");
    } finally {
      setClearPresidentSaving(false);
    }
  };

  const handleLeadersMgmtRoleChange = async (
    row: ClubMemberMgmtRow,
    nextRole: ClubMemberRole
  ): Promise<void> => {
    if (row.role === nextRole) return;
    const presId =
      clubRows.find((c) => c.publicId === leadersMgmtClub?.publicId)?.presidentId ??
      leadersMgmtClub?.presidentId;
    const isClubPresidentRow = presId != null && row.userId === presId;
    if (isClubPresidentRow && nextRole !== "leader") {
      toast.error(
        "ประธานชมรมต้องเป็นหัวหน้าชมรม (leader) เสมอ — ให้เปลี่ยนประธานหรือถอดประธานก่อน"
      );
      return;
    }

    setRoleSavingMembershipId(row.id);
    try {
      const updated = await clubApi.updateMemberRole(row.id, nextRole);
      const r = updated.role ? String(updated.role) : "";
      const resolved: ClubMemberRole = isClubMemberRole(r) ? r : nextRole;
      setLeadersMembersRaw((prev) => prev.map((m) => (m.id === row.id ? { ...m, role: resolved } : m)));
      toast.success("อัปเดตบทบาทในชมรมแล้ว");
      void reloadClubs({ silent: true });
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "ไม่สามารถอัปเดตบทบาทได้"));
    } finally {
      setRoleSavingMembershipId(null);
    }
  };

  const stats = useMemo(() => {
    const total = clubRows.length;
    const withPresidentActive = clubRows.filter(
      (c) => !!c.presidentId && c.lifecycleStatus === "active"
    ).length;
    const pendingLifecycle = clubRows.filter((c) => c.lifecycleStatus === "pending").length;
    const noPresident = clubRows.filter((c) => !c.presidentId).length;
    return { total, withPresidentActive, pendingLifecycle, noPresident };
  }, [clubRows]);

  const leadersMgmtClubSynced = useMemo(() => {
    if (!leadersMgmtClub) return null;
    return clubRows.find((c) => c.publicId === leadersMgmtClub.publicId) ?? leadersMgmtClub;
  }, [clubRows, leadersMgmtClub]);

  return (
    <PageChrome
      title="Manage Club"
      description="จัดการชมรม เปลี่ยนประธาน และสถานะชมรม (ข้อมูลจากระบบ)"
      actions={
        <Button variant="outline" onClick={() => setShowAuditLog(true)} className="w-full sm:w-auto shrink-0">
          <History className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">ดูบันทึกการตรวจสอบ</span>
          <span className="sm:hidden">บันทึก</span>
        </Button>
      }
    >
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatsCard title="ชมรมทั้งหมด" value={stats.total} />
        <StatsCard title="มีประธาน (ใช้งาน)" value={stats.withPresidentActive} valueClassName="text-green-600" />
        <StatsCard title="ชมรมรอยืนยัน" value={stats.pendingLifecycle} valueClassName="text-yellow-600" />
        <StatsCard title="ยังไม่มีประธาน" value={stats.noPresident} valueClassName="text-gray-600" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชมรมตามชื่อ public id หรือประธาน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <AsyncBoundary loading={clubsLoading}>
        <Card>
          <CardHeader>
            <CardTitle>เจ้าของชมรม</CardTitle>
            <CardDescription>พบ {filteredClubs.length} ชมรม — ภาพรวมจากฐานข้อมูล</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชมรม</TableHead>
                    <TableHead>ประธานปัจจุบัน</TableHead>
                    <TableHead title="ผู้เป็น leader (ไม่รวมประธาน)">หัวหน้าชมรม</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>การดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClubs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12 mt-4">
                        ไม่มีข้อมูลชมรม
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClubs.map((club) => {
                      const bucket = presidentBadgeBucket(club);
                      return (
                        <TableRow key={club.publicId}>
                          <TableCell>
                            <div>
                              <p className="font-medium truncate max-w-[200px]">{club.clubName}</p>
                              <p className="text-xs text-muted-foreground">
                                <code>{club.publicId}</code>
                                {club.category ? <> • {club.category}</> : null}
                              </p>
                              {/* <p className="text-xs text-muted-foreground mt-1">สถานะระบบ: {club.lifecycleStatus}</p> */}
                            </div>
                          </TableCell>
                          <TableCell>
                            {displayOwnerName(club) ? (
                              <div>
                                <p className="text-sm font-medium truncate max-w-[180px]">{club.presidentName}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                  {club.presidentEmail || "—"}
                                </p>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">ยังไม่มีประธาน</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <CoLeadersSummaryCell coLeaderNames={club.coLeaderNames} />
                          </TableCell>
                          <TableCell>
                            {editingStatusPublicId === club.publicId ? (
                              <Select
                                value={club.lifecycleStatus}
                                onValueChange={(value: Club["status"]) => {
                                  void handleLifecycleChange(club.publicId, value);
                                }}
                                onOpenChange={(open: boolean) => {
                                  if (!open) setEditingStatusPublicId(null);
                                }}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">active (ใช้งาน)</SelectItem>
                                  <SelectItem value="pending">pending (รอยืนยัน)</SelectItem>
                                  <SelectItem value="inactive">inactive (ไม่ใช้งาน)</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                {getPresidentBadge(bucket)}
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => setEditingStatusPublicId(club.publicId)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedClub(club);
                                  setIsChangeOwnerOpen(true);
                                }}
                              >
                                <UserCog className="h-4 w-4 mr-1 shrink-0" />
                                เปลี่ยนประธาน
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setLeadersMgmtClub(club)}>
                                <Users className="h-4 w-4 mr-1 shrink-0" />
                                จัดการหัวหน้าชมรม
                              </Button>
                              {club.presidentId != null ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  type="button"
                                  onClick={() => setClearPresidentTarget(club)}
                                >
                                  ถอดประธาน
                                </Button>
                              ) : null}
                            </div>
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
      </AsyncBoundary>

      <AlertDialog
        open={!!clearPresidentTarget}
        onOpenChange={(open) => {
          if (!open) setClearPresidentTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการถอดประธานชมรม</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-muted-foreground text-sm space-y-2 text-left">
                <p>
                  คุณต้องการถอดประธานออกจากชมรม{" "}
                  <span className="font-medium text-foreground">“{clearPresidentTarget?.clubName}”</span> หรือไม่?
                </p>
                {clearPresidentTarget?.presidentName ? (
                  <p>
                    ประธานปัจจุบัน:{" "}
                    <span className="font-medium text-foreground">{clearPresidentTarget.presidentName}</span>
                    {clearPresidentTarget.presidentEmail ? (
                      <span className="block text-xs font-normal mt-1">({clearPresidentTarget.presidentEmail})</span>
                    ) : null}
                  </p>
                ) : null}
                <p className="text-xs">ชมรมจะไม่มีประธานจนกว่าจะมีการแต่งตั้งใหม่</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearPresidentSaving}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={clearPresidentSaving}
              onClick={(e) => {
                e.preventDefault();
                void confirmClearPresident();
              }}
            >
              {clearPresidentSaving ? "กำลังถอดประธาน..." : "ถอดประธาน"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isChangeOwnerOpen}
        onOpenChange={(open) => {
          setIsChangeOwnerOpen(open);
          if (!open) {
            setSelectedNewOwnerId("");
            setPickerSearch("");
            setClubPickMembersRaw([]);
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เปลี่ยนประธานชมรม</DialogTitle>
            <DialogDescription className="truncate">
              {selectedClub?.clubName}
              <span className="block text-xs font-normal text-muted-foreground mt-1 leading-snug">
                เลือกได้เฉพาะผู้ใช้ที่เป็นสมาชิกได้รับการอนุมัติในชมรมนี้เท่านั้น
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ประธานปัจจุบัน</Label>
              <p className="text-sm text-muted-foreground truncate">
                {selectedClub?.presidentName || "ไม่มี —"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>ค้นหาสมาชิกในชมรม</Label>
              <Input
                placeholder="ชื่อหรืออีเมล (ในรายชื่อสมาชิกที่อนุมัติ)"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>เลือกสมาชิก</Label>
              {pickerLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังโหลดสมาชิก...
                </div>
              ) : clubPickMembersRaw.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 rounded-md border border-dashed px-3">
                  ชมรมนี้ยังไม่มีสมาชิกที่ได้รับการอนุมัติ จึงยังตั้งประธานจากรายชื่อนี้ไม่ได้ — โปรดอนุมัติการเข้าร่วมในแท็บสมาชิกก่อน
                </p>
              ) : pickerUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">ไม่พบผู้ใช้ที่ตรงกับคำค้น</p>
              ) : (
                <Select value={selectedNewOwnerId} onValueChange={setSelectedNewOwnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกจากสมาชิกที่อนุมัติแล้ว..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pickerUsers.map((opt) => (
                      <SelectItem key={opt.id} value={String(opt.id)}>
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{opt.email}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                onClick={() => void handleChangeOwnerSubmit()}
                className="flex-1"
                disabled={presidentSaving || pickerLoading || pickerUsers.length === 0}
              >
                {presidentSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึกประธานใหม่"
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsChangeOwnerOpen(false)} className="flex-1 sm:flex-none">
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!leadersMgmtClub}
        onOpenChange={(open) => {
          if (!open) {
            setLeadersMgmtClub(null);
            setLeadersMembersRaw([]);
            setRoleSavingMembershipId(null);
          }
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col gap-4"
          style={{ maxHeight: "min(90vh, 640px)" }}
        >
          <DialogHeader className="shrink-0 space-y-2">
            <DialogTitle>จัดการหัวหน้าชมรม</DialogTitle>
            <DialogDescription className="text-left space-y-2">
              <span
                className="block truncate text-sm text-foreground"
                title={
                  leadersMgmtClubSynced
                    ? [leadersMgmtClubSynced.clubName, leadersMgmtClubSynced.publicId].filter(Boolean).join(" - ")
                    : undefined
                }
              >
                <span className="font-medium">{(leadersMgmtClubSynced?.clubName ?? "").trim() || "—"}</span>
                {leadersMgmtClubSynced?.publicId ? (
                  <>
                    <span className="text-muted-foreground"> - </span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {leadersMgmtClubSynced.publicId}
                    </span>
                  </>
                ) : null}
              </span>
              {/* <span className="block text-sm leading-snug pt-1">
                ประธานชมรมคือผู้ได้รับแต่งตั้งหนึ่งคนต่อชมรม (แสดงในระบบดูแล) มีสิทธิ์เชิงหัวหน้าเช่นเดียวกับผู้มีบทบาทหัวหน้าชมรม (leader)
                ในสมาชิก — ผู้เป็น leader ได้หลายคน ประธานต้องคงการเป็น leader เสมอ
              </span> */}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-hidden flex flex-col border rounded-md">
            {leadersMembersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin p-4" />
                กำลังโหลดรายชื่อสมาชิก...
              </div>
            ) : leadersMembersRaw.length === 0 ? (
              <div className="text-sm text-muted-foreground py-12 px-4 text-center">
                ยังไม่มีสมาชิกที่อนุมัติในชมรมนี้
              </div>
            ) : (
              <div
                className="custom-scrollbar overflow-x-auto overflow-y-auto"
                style={{ maxHeight: "min(48vh, 360px)", WebkitOverflowScrolling: "touch" }}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ผู้ใช้</TableHead>
                      <TableHead className="w-[140px]">ประธาน</TableHead>
                      <TableHead className="min-w-[200px]">บทบาทในชมรม</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadersMembersRaw.map((row) => {
                      const presId =
                        leadersMgmtClubSynced?.presidentId != null &&
                        Number.isFinite(leadersMgmtClubSynced.presidentId)
                          ? leadersMgmtClubSynced.presidentId
                          : undefined;
                      const isClubPresidentRow = presId != null && row.userId === presId;
                      const displayName =
                        `${row.user.firstName} ${row.user.lastName}`.trim() || row.user.email;
                      const saving = roleSavingMembershipId === row.id;
                      return (
                        <TableRow key={`${row.id}-${row.userId}`}>
                          <TableCell className="align-top">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{displayName}</p>
                              <p className="text-xs text-muted-foreground truncate">{row.user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            {isClubPresidentRow ? (
                              <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100 text-xs whitespace-nowrap">
                                ประธาน
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex items-center gap-2">
                              <Select
                                value={row.role}
                                disabled={saving}
                                onValueChange={(v) => {
                                  if (isClubMemberRole(v)) void handleLeadersMgmtRoleChange(row, v);
                                }}
                              >
                                <SelectTrigger className="w-full min-w-[180px]" aria-label={`บทบาทของ ${displayName}`}>
                                  <SelectValue placeholder="เลือกบทบาท" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member" disabled={isClubPresidentRow}>
                                    สมาชิก (member)
                                  </SelectItem>
                                  <SelectItem value="staff" disabled={isClubPresidentRow}>
                                    staff
                                  </SelectItem>
                                  <SelectItem value="leader">หัวหน้าชมรม (leader)</SelectItem>
                                </SelectContent>
                              </Select>
                              {saving ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAuditLog} onOpenChange={setShowAuditLog}>
        <DialogContent
          className="max-w-3xl overflow-hidden flex flex-col gap-4 sm:max-w-3xl"
          style={{ maxHeight: "min(85vh, 720px)" }}
        >
          <DialogHeader className="shrink-0 space-y-2 pr-8">
            <DialogTitle>บันทึกการเปลี่ยนประธาน</DialogTitle>
            <DialogDescription>
              ประวัติการแต่งตั้งและเปลี่ยนประธานของทุกชมรม — เรียงจากใหม่ไปเก่า
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex flex-col flex-1">
            {auditLoading ? (
              <div className="flex justify-center py-10 text-muted-foreground gap-2 text-sm items-center shrink-0">
                <Loader2 className="h-5 w-5 animate-spin" />
                กำลังโหลดประวัติ...
              </div>
            ) : auditLog.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/30 p-8 py-10 text-center text-sm text-muted-foreground space-y-2 shrink-0">
                <p className="font-medium text-foreground">ยังไม่มีประวัติการเปลี่ยนประธานในระบบ</p>
                <p className="max-w-md mx-auto leading-relaxed">
                  รายการจะปรากฏที่นี่หลังผู้ดูแลมีการเปลี่ยนหรือถอดประธานชมรม — ประวัติก่อนเปิดใช้บันทึกนี้จะไม่แสดงย้อนหลัง
                </p>
              </div>
            ) : (
              <div
                className="custom-scrollbar space-y-3 overflow-y-auto"
                style={{
                  maxHeight: "min(440px, calc(85vh - 9.5rem))",
                  WebkitOverflowScrolling: "touch",
                  paddingRight: "0.75rem",
                }}
                aria-label="ประวัติการเปลี่ยนประธาน"
              >
                {auditLog.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1 min-w-0">
                          <p className="font-medium truncate">{log.clubName}</p>
                          <div className="text-sm text-muted-foreground">
                            {log.previousOwner ? (
                              <span>
                                {log.previousOwner} → <span className="font-medium">{log.newOwner}</span>
                              </span>
                            ) : (
                              <span>
                                <span className="font-medium">{log.newOwner}</span>
                              </span>
                            )}
                          </div>
                          {log.reason ? <p className="text-xs text-muted-foreground">เหตุผล: {log.reason}</p> : null}
                        </div>
                        <div className="text-right text-sm text-muted-foreground shrink-0">
                          <p>{new Date(log.date).toLocaleDateString("th-TH")}</p>
                          <p className="text-xs">โดย {log.changedBy}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageChrome>
  );
}
