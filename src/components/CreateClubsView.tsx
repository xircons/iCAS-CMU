import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
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
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Plus, Users, Eye, Upload, X, Loader2, EllipsisVertical } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";
import { clubApi, type Club } from "../features/club/api/clubApi";
import { PageChrome, StatusBadge, SearchInput, StatsCard, AsyncBoundary } from "./shared";

interface CreateClubsViewProps {
  user: User;
}

interface NewClubForm {
  name: string;
  category: string;
  description: string;
  status: "active" | "pending" | "inactive";
  logo: File | null;
}

type ClubMemberRole = "member" | "staff" | "leader";
type ClubMemberRow = {
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
  const e = err as {
    response?: { data?: { error?: { message?: string }; message?: string } };
  };
  return e?.response?.data?.error?.message || e?.response?.data?.message || fallback;
}

export function CreateClubsView({ user: _user }: CreateClubsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewClubOpen, setIsNewClubOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const [statusTarget, setStatusTarget] = useState<Club | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [nextStatus, setNextStatus] = useState<Club["status"]>("pending");

  const [presidentTarget, setPresidentTarget] = useState<Club | null>(null);
  const [presidentSaving, setPresidentSaving] = useState(false);
  const [presidentPickerLoading, setPresidentPickerLoading] = useState(false);
  const [presidentSearch, setPresidentSearch] = useState("");
  const [selectedPresidentId, setSelectedPresidentId] = useState("");
  const [clubMembersRaw, setClubMembersRaw] = useState<ClubMemberRow[]>([]);

  const [leaderTarget, setLeaderTarget] = useState<Club | null>(null);
  const [leaderLoading, setLeaderLoading] = useState(false);
  const [roleSavingMembershipId, setRoleSavingMembershipId] = useState<number | null>(null);
  const [leaderMembersRaw, setLeaderMembersRaw] = useState<ClubMemberRow[]>([]);

  const [clearPresidentTarget, setClearPresidentTarget] = useState<Club | null>(null);
  const [clearPresidentSaving, setClearPresidentSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Club | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [newClubForm, setNewClubForm] = useState<NewClubForm>({
    name: "",
    category: "",
    description: "",
    status: "pending",
    logo: null,
  });

  const loadClubs = useCallback(async () => {
    setLoading(true);
    try {
      const list = await clubApi.getAllClubs();
      setClubs(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Could not load clubs"));
      setClubs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClubs();
  }, [loadClubs]);

  useEffect(() => {
    if (!newClubForm.logo) {
      setLogoPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(newClubForm.logo);
    setLogoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [newClubForm.logo]);

  useEffect(() => {
    if (!presidentTarget) {
      setClubMembersRaw([]);
      setPresidentPickerLoading(false);
      setPresidentSearch("");
      setSelectedPresidentId("");
      return;
    }
    let cancelled = false;
    setPresidentPickerLoading(true);
    clubApi
      .getClubMembers(presidentTarget.publicId)
      .then((rows) => {
        if (cancelled) return;
        const normalized = (Array.isArray(rows) ? rows : [])
          .filter((r) => r?.id != null && r?.userId != null && r?.user?.email)
          .map((r) => {
            const rawRole = String(r.role ?? "member");
            return {
              id: Number(r.id),
              userId: Number(r.userId),
              role: isClubMemberRole(rawRole) ? rawRole : "member",
              user: {
                firstName: String(r.user.firstName ?? ""),
                lastName: String(r.user.lastName ?? ""),
                email: String(r.user.email),
              },
            } as ClubMemberRow;
          });
        setClubMembersRaw(normalized);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(apiErrorMessage(err, "Could not load president list"));
          setClubMembersRaw([]);
        }
      })
      .finally(() => {
        if (!cancelled) setPresidentPickerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [presidentTarget?.publicId]);

  useEffect(() => {
    if (!leaderTarget) {
      setLeaderLoading(false);
      setLeaderMembersRaw([]);
      setRoleSavingMembershipId(null);
      return;
    }
    let cancelled = false;
    setLeaderLoading(true);
    clubApi
      .getClubMembers(leaderTarget.publicId)
      .then((rows) => {
        if (cancelled) return;
        const normalized = (Array.isArray(rows) ? rows : [])
          .filter((r) => r?.id != null && r?.userId != null && r?.user?.email)
          .map((r) => {
            const rawRole = String(r.role ?? "member");
            return {
              id: Number(r.id),
              userId: Number(r.userId),
              role: isClubMemberRole(rawRole) ? rawRole : "member",
              user: {
                firstName: String(r.user.firstName ?? ""),
                lastName: String(r.user.lastName ?? ""),
                email: String(r.user.email),
              },
            } as ClubMemberRow;
          });
        setLeaderMembersRaw(normalized);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(apiErrorMessage(err, "Could not load members for role management"));
          setLeaderMembersRaw([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLeaderLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leaderTarget?.publicId]);

  const filteredClubs = clubs.filter((club) => {
    const q = searchQuery.toLowerCase();
    return (
      club.name.toLowerCase().includes(q) ||
      (club.category || "").toLowerCase().includes(q) ||
      (club.publicId || "").toLowerCase().includes(q) ||
      (club.presidentName || "").toLowerCase().includes(q) ||
      (club.coLeaderNames || "").toLowerCase().includes(q)
    );
  });

  /** Leaders and current president are the usual president pool; fallback to all approved if none. */
  const presidentPickPool = useMemo(() => {
    if (!presidentTarget) return [];
    const pid = presidentTarget.presidentId;
    const leadersOrCurrent = clubMembersRaw.filter(
      (m) => m.role === "leader" || (pid != null && m.userId === pid),
    );
    return leadersOrCurrent.length > 0 ? leadersOrCurrent : clubMembersRaw;
  }, [clubMembersRaw, presidentTarget]);

  const presidentListIsLeaderOnly = useMemo(() => {
    if (!presidentTarget) return true;
    const pid = presidentTarget.presidentId;
    return clubMembersRaw.some(
      (m) => m.role === "leader" || (pid != null && m.userId === pid),
    );
  }, [clubMembersRaw, presidentTarget]);

  const presidentOptions = useMemo(() => {
    const q = presidentSearch.trim().toLowerCase();
    return presidentPickPool
      .filter((m) => {
        if (!q) return true;
        const name = `${m.user.firstName} ${m.user.lastName}`.trim().toLowerCase();
        return name.includes(q) || m.user.email.toLowerCase().includes(q);
      })
      .map((m) => ({
        id: m.userId,
        label: `${m.user.firstName} ${m.user.lastName}`.trim() || m.user.email,
        email: m.user.email,
      }));
  }, [presidentPickPool, presidentSearch]);

  const twoCharFallback = (name: string) => (name.trim().length >= 2 ? name.trim().slice(0, 2) : "?");
  const getStatusBadge = (status: string) => (
    <StatusBadge status={status} className="whitespace-nowrap flex-shrink-0 text-xs" />
  );

  const updateClubInState = useCallback((publicId: string, patch: Partial<Club>) => {
    setClubs((prev) => prev.map((c) => (c.publicId === publicId ? { ...c, ...patch } : c)));
  }, []);

  const handleSubmitNewClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubForm.name || !newClubForm.category) {
      toast.error("Please fill in required fields");
      return;
    }

    setSubmitting(true);
    try {
      const created = await clubApi.createClub({
        name: newClubForm.name,
        category: newClubForm.category,
        description: newClubForm.description || undefined,
        status: newClubForm.status,
        logo: newClubForm.logo || undefined,
      });
      setClubs((prev) => [created, ...prev]);
      toast.success(`Club "${created.name}" created successfully.`);
      setNewClubForm({ name: "", category: "", description: "", status: "pending", logo: null });
      setIsNewClubOpen(false);
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Could not create club"));
    } finally {
      setSubmitting(false);
    }
  };

  const submitChangeStatus = async () => {
    if (!statusTarget) return;
    setStatusSaving(true);
    try {
      await clubApi.patchClubLifecycleStatus(statusTarget.publicId, nextStatus);
      updateClubInState(statusTarget.publicId, { status: nextStatus });
      toast.success("Club status updated");
      setStatusTarget(null);
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Could not update club status"));
    } finally {
      setStatusSaving(false);
    }
  };

  const submitChangePresident = async () => {
    if (!presidentTarget || !selectedPresidentId) return;
    const uid = Number(selectedPresidentId);
    if (!Number.isFinite(uid) || uid < 1) {
      toast.error("Please select a valid president");
      return;
    }
    setPresidentSaving(true);
    try {
      const updated = await clubApi.patchClubPresident(presidentTarget.publicId, uid);
      updateClubInState(updated.publicId, {
        presidentId: updated.presidentId,
        presidentName: updated.presidentName,
        presidentEmail: updated.presidentEmail,
        status: updated.status,
      });
      toast.success("President updated");
      setPresidentTarget(null);
      void loadClubs();
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Could not change president"));
    } finally {
      setPresidentSaving(false);
    }
  };

  const submitClearPresident = async () => {
    if (!clearPresidentTarget) return;
    setClearPresidentSaving(true);
    try {
      const updated = await clubApi.patchClubPresident(clearPresidentTarget.publicId, null);
      updateClubInState(updated.publicId, {
        presidentId: updated.presidentId,
        presidentName: updated.presidentName,
        presidentEmail: updated.presidentEmail,
        status: updated.status,
      });
      toast.success("President removed");
      setClearPresidentTarget(null);
      void loadClubs();
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Could not remove president"));
    } finally {
      setClearPresidentSaving(false);
    }
  };

  const changeMemberRole = async (row: ClubMemberRow, nextRole: ClubMemberRole) => {
    if (!leaderTarget || nextRole === row.role) return;
    const club = clubs.find((c) => c.publicId === leaderTarget.publicId) ?? leaderTarget;
    const isPresidentRow = club.presidentId != null && row.userId === club.presidentId;
    if (isPresidentRow && nextRole !== "leader") {
      toast.error("President must stay as leader. Change/remove president first.");
      return;
    }
    setRoleSavingMembershipId(row.id);
    try {
      const updated = await clubApi.updateMemberRole(row.id, nextRole);
      const role = isClubMemberRole(String(updated.role ?? "")) ? String(updated.role) as ClubMemberRole : nextRole;
      setLeaderMembersRaw((prev) => prev.map((m) => (m.id === row.id ? { ...m, role } : m)));
      toast.success("Leader role updated");
      void loadClubs();
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Could not update role"));
    } finally {
      setRoleSavingMembershipId(null);
    }
  };

  const submitDeleteClub = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await clubApi.deleteClub(deleteTarget.publicId);
      setClubs((prev) => prev.filter((c) => c.publicId !== deleteTarget.publicId));
      setDeleteTarget(null);
      toast.success("Club removed successfully");
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Could not remove club"));
    } finally {
      setDeleteSaving(false);
    }
  };

  const stats = {
    total: clubs.length,
    active: clubs.filter((c) => c.status === "active").length,
    pending: clubs.filter((c) => c.status === "pending").length,
    inactive: clubs.filter((c) => c.status === "inactive").length,
  };

  return (
    <PageChrome
      title="Manage Club"
      description="Single page for club management, leadership and club actions."
      actions={
        <Dialog open={isNewClubOpen} onOpenChange={setIsNewClubOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New club
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create club</DialogTitle>
              <DialogDescription>Admin only</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitNewClub} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="club-name">Name *</Label>
                <Input
                  id="club-name"
                  value={newClubForm.name}
                  onChange={(e) => setNewClubForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="club-category">Category *</Label>
                <Select
                  value={newClubForm.category}
                  onValueChange={(value) => setNewClubForm((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="club-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arts & Music">Arts & Music</SelectItem>
                    <SelectItem value="Arts & Media">Arts & Media</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Community Service">Community Service</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Language & Culture">Language & Culture</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="club-description">Description</Label>
                <Textarea
                  id="club-description"
                  rows={3}
                  value={newClubForm.description}
                  onChange={(e) => setNewClubForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="club-logo">Logo (optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">PNG, JPG, WEBP, GIF up to 2MB</p>
                  <Input
                    id="club-logo"
                    type="file"
                    accept="image/*"
                    className="mt-2"
                    onChange={(e) => setNewClubForm((prev) => ({ ...prev, logo: e.target.files?.[0] || null }))}
                  />
                  {newClubForm.logo && (
                    <div className="mt-3 flex items-center gap-3 justify-center">
                      {logoPreviewUrl && (
                        <img src={logoPreviewUrl} alt="preview" className="h-10 w-10 rounded object-cover border" />
                      )}
                      <span className="text-xs text-muted-foreground">{newClubForm.logo.name}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setNewClubForm((p) => ({ ...p, logo: null }))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="club-status">Initial status</Label>
                <Select
                  value={newClubForm.status}
                  onValueChange={(value: Club["status"]) => setNewClubForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger id="club-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
                <Button type="button" variant="outline" disabled={submitting} onClick={() => setIsNewClubOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatsCard title="Total" value={stats.total} description="Registered" />
        <StatsCard title="Active" value={stats.active} valueClassName="text-green-600" />
        <StatsCard title="Pending" value={stats.pending} valueClassName="text-yellow-600" />
        <StatsCard title="Inactive" value={stats.inactive} valueClassName="text-red-600" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <SearchInput
            placeholder="Search by public_id, name, president, leader..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </CardContent>
      </Card>

      <AsyncBoundary loading={loading} loadingText="Loading clubs...">
        <Card>
          <CardHeader>
            <CardTitle>Clubs</CardTitle>
            <CardDescription>{filteredClubs.length} club(s)</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Club Id</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>View</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClubs.map((club) => (
                    <TableRow key={club.publicId}>
                      <TableCell><code className="text-xs bg-slate-100 px-2 py-1 rounded">{club.publicId}</code></TableCell>
                      <TableCell>
                        <div className="flex items-start gap-3 min-w-0">
                          <Avatar className="shrink-0">
                            <AvatarImage src={clubApi.getLogoUrl(club.logo)} alt={club.name} />
                            <AvatarFallback>{twoCharFallback(club.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium break-words">{club.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{club.presidentName || "No president"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{club.category || "—"}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{club.memberCount ?? 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(club.status)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {club.createdAt ? new Date(club.createdAt).toLocaleDateString("en-GB") : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 text-black hover:bg-transparent hover:text-black"
                          onClick={() => setSelectedClub(club)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 p-0 text-black hover:bg-transparent hover:text-black"
                              aria-label="Open actions menu"
                            >
                              <EllipsisVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-52"
                          >
                            <DropdownMenuItem
                              className="px-3 py-2 text-sm"
                              onClick={() => {
                                setStatusTarget(club);
                                setNextStatus(club.status);
                              }}
                            >
                              Change status
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="px-3 py-2 text-sm"
                              onClick={() => setPresidentTarget(club)}
                            >
                              Change president
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="px-3 py-2 text-sm"
                              onClick={() => setLeaderTarget(club)}
                            >
                              Change leader
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="px-3 py-2 text-sm"
                              onClick={() => setClearPresidentTarget(club)}
                              disabled={!club.presidentId}
                            >
                              Remove president
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              className="px-3 py-2 text-sm text-red-600"
                              onClick={() => setDeleteTarget(club)}
                            >
                              Remove club
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </AsyncBoundary>

      <Dialog open={!!selectedClub} onOpenChange={() => setSelectedClub(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedClub && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 shrink-0">
                    <AvatarImage src={clubApi.getLogoUrl(selectedClub.logo)} alt={selectedClub.name} />
                    <AvatarFallback>{twoCharFallback(selectedClub.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <DialogTitle className="truncate">{selectedClub.name}</DialogTitle>
                    <DialogDescription className="mt-2">Club overview</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><Label>Name</Label><p className="mt-1">{selectedClub.name}</p></div>
                <div><Label>public_id</Label><p className="mt-1"><code>{selectedClub.publicId}</code></p></div>
                <div><Label>Category</Label><p className="mt-1">{selectedClub.category || "—"}</p></div>
                <div><Label>Status</Label><p className="mt-1">{getStatusBadge(selectedClub.status)}</p></div>
                <div><Label>President</Label><p className="mt-1">{selectedClub.presidentName || "Unassigned"}</p></div>
                <div><Label>Leader</Label><p className="mt-1">{selectedClub.coLeaderNames || "—"}</p></div>
                <div><Label>Member</Label><p className="mt-1">{selectedClub.memberCount ?? 0}</p></div>
                <div><Label>Created</Label><p className="mt-1">{selectedClub.createdAt ? new Date(selectedClub.createdAt).toLocaleDateString("en-GB") : "—"}</p></div>
              </div>
              <div>
                <Label>Description</Label>
                <p className="mt-1 text-sm text-muted-foreground">{selectedClub.description || "—"}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusTarget} onOpenChange={() => setStatusTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
            <DialogDescription>{statusTarget?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={nextStatus} onValueChange={(v: Club["status"]) => setNextStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="inactive">inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button className="flex-1" disabled={statusSaving} onClick={() => void submitChangeStatus()}>
                {statusSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setStatusTarget(null)} disabled={statusSaving}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!presidentTarget} onOpenChange={() => setPresidentTarget(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change president</DialogTitle>
            <DialogDescription>
              {presidentTarget?.name}
              <span className="block text-xs font-normal text-muted-foreground mt-1 leading-snug">
                President is chosen from club leaders (and the current president). If there are no leaders yet, all
                approved members are shown.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search president by name or email"
              value={presidentSearch}
              onChange={(e) => setPresidentSearch(e.target.value)}
            />
            {!presidentPickerLoading && clubMembersRaw.length > 0 && !presidentListIsLeaderOnly ? (
              <p className="text-xs text-muted-foreground rounded-md border border-dashed px-3 py-2">
                This club has no leaders yet. Showing all approved members until at least one member has the leader
                role.
              </p>
            ) : null}
            {presidentPickerLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading president list...
              </div>
            ) : clubMembersRaw.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-2">
                This club has no approved members yet. Approve members first, then assign leaders if you want a
                president-only list.
              </p>
            ) : presidentOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-2">
                No president candidates match your search. Try another name or email, or use Change leader to add
                leaders first.
              </p>
            ) : (
              <Select value={selectedPresidentId} onValueChange={setSelectedPresidentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select president..." />
                </SelectTrigger>
                <SelectContent>
                  {presidentOptions.map((opt) => (
                    <SelectItem key={opt.id} value={String(opt.id)}>
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{opt.email}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={
                  presidentSaving ||
                  presidentPickerLoading ||
                  !selectedPresidentId ||
                  presidentOptions.length === 0
                }
                onClick={() => void submitChangePresident()}
              >
                {presidentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setPresidentTarget(null)} disabled={presidentSaving}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!leaderTarget} onOpenChange={() => setLeaderTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Change leader</DialogTitle>
            <DialogDescription>{leaderTarget?.name}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto">
            {leaderLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading members...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderMembersRaw.map((row) => {
                    const club = clubs.find((c) => c.publicId === leaderTarget?.publicId) ?? leaderTarget;
                    const isPresidentRow = club?.presidentId != null && row.userId === club.presidentId;
                    const displayName = `${row.user.firstName} ${row.user.lastName}`.trim() || row.user.email;
                    const saving = roleSavingMembershipId === row.id;
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{displayName}</p>
                          <p className="text-xs text-muted-foreground">{row.user.email}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={row.role}
                              disabled={saving}
                              onValueChange={(v) => { if (isClubMemberRole(v)) void changeMemberRole(row, v); }}
                            >
                              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member" disabled={isPresidentRow}>member</SelectItem>
                                <SelectItem value="staff" disabled={isPresidentRow}>staff</SelectItem>
                                <SelectItem value="leader">leader</SelectItem>
                              </SelectContent>
                            </Select>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!clearPresidentTarget} onOpenChange={(o) => { if (!o) setClearPresidentTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove president</AlertDialogTitle>
            <AlertDialogDescription>
              Remove president from club "{clearPresidentTarget?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearPresidentSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void submitClearPresident(); }} disabled={clearPresidentSaving}>
              {clearPresidentSaving ? "Removing..." : "Remove president"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove club</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}" and related records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => { e.preventDefault(); void submitDeleteClub(); }}
              disabled={deleteSaving}
            >
              {deleteSaving ? "Removing..." : "Remove club"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageChrome>
  );
}
