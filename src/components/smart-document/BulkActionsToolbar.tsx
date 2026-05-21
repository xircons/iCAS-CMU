import React, { useState } from "react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Checkbox } from "../ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage, getDiceBearAvatar } from "../ui/avatar";
import { toast } from "sonner";
import { MoreVertical, Trash2, Users, FileDown, Tag } from "lucide-react";
import { documentApi, type BulkUpdateStatusRequest, type BulkAssignRequest, type BulkDeleteRequest, type BulkExportRequest } from "../../features/smart-document/api/documentApi";
import type { DocumentStatus } from "./types";
import { clubApi, type Club } from "../../features/club/api/clubApi";

interface BulkActionsToolbarProps {
  selectedDocumentIds: Set<number>;
  documents: Array<{ id: number; clubId: number; clubPublicId?: string }>;
  onSuccess: () => void;
  onClearSelection: () => void;
}

interface ClubMember {
  id: number;
  userId: number;
  role: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
}

export function BulkActionsToolbar({ selectedDocumentIds, documents, onSuccess, onClearSelection }: BulkActionsToolbarProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus>("Open");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set());
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const selectedCount = selectedDocumentIds.size;
  const selectedDocuments = documents.filter(doc => selectedDocumentIds.has(doc.id));
  
  const clubPublicIds = Array.from(
    new Set(
      selectedDocuments.map((d) => d.clubPublicId).filter((id): id is string => Boolean(id)),
    ),
  );

  const handleBulkUpdateStatus = async () => {
    if (clubPublicIds.length === 0) {
      toast.error("ไม่พบรหัสชมรมสำหรับเอกสารที่เลือก");
      return;
    }
    
    try {
      setIsLoading(true);
      
      const documentsByClub = new Map<string, number[]>();
      selectedDocuments.forEach(doc => {
        const key = doc.clubPublicId;
        if (!key) return;
        if (!documentsByClub.has(key)) {
          documentsByClub.set(key, []);
        }
        documentsByClub.get(key)!.push(doc.id);
      });

      const promises = Array.from(documentsByClub.entries()).map(([clubPublicId, docIds]) =>
        documentApi.bulkUpdateStatus(clubPublicId, {
          documentIds: docIds,
          status: selectedStatus,
        })
      );

      await Promise.all(promises);
      
      toast.success(`อัปเดตสถานะ ${selectedCount} เอกสารแล้ว`);
      setIsStatusDialogOpen(false);
      onSuccess();
      onClearSelection();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถอัปเดตสถานะได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkAssign = async () => {
    if (clubPublicIds.length === 0 || selectedMemberIds.size === 0) {
      if (clubPublicIds.length === 0) toast.error("ไม่พบรหัสชมรมสำหรับเอกสารที่เลือก");
      return;
    }

    try {
      setIsLoading(true);
      
      const documentsByClub = new Map<string, number[]>();
      selectedDocuments.forEach(doc => {
        const key = doc.clubPublicId;
        if (!key) return;
        if (!documentsByClub.has(key)) {
          documentsByClub.set(key, []);
        }
        documentsByClub.get(key)!.push(doc.id);
      });

      const promises = Array.from(documentsByClub.entries()).map(([clubPublicId, docIds]) =>
        documentApi.bulkAssign(clubPublicId, {
          documentIds: docIds,
          memberIds: Array.from(selectedMemberIds),
        })
      );

      await Promise.all(promises);
      
      toast.success(`มอบหมายสมาชิกให้ ${selectedCount} เอกสารแล้ว`);
      setIsAssignDialogOpen(false);
      setSelectedMemberIds(new Set());
      onSuccess();
      onClearSelection();
    } catch (error: any) {
      console.error("Error assigning members:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถมอบหมายสมาชิกได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (clubPublicIds.length === 0) {
      toast.error("ไม่พบรหัสชมรมสำหรับเอกสารที่เลือก");
      return;
    }

    try {
      setIsLoading(true);
      
      const documentsByClub = new Map<string, number[]>();
      selectedDocuments.forEach(doc => {
        const key = doc.clubPublicId;
        if (!key) return;
        if (!documentsByClub.has(key)) {
          documentsByClub.set(key, []);
        }
        documentsByClub.get(key)!.push(doc.id);
      });

      const promises = Array.from(documentsByClub.entries()).map(([clubPublicId, docIds]) =>
        documentApi.bulkDelete(clubPublicId, {
          documentIds: docIds,
        })
      );

      await Promise.all(promises);
      
      toast.success(`ลบ ${selectedCount} เอกสารแล้ว`);
      setIsDeleteDialogOpen(false);
      onSuccess();
      onClearSelection();
    } catch (error: any) {
      console.error("Error deleting documents:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถลบเอกสารได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkExport = async (format: 'json' | 'csv' = 'csv') => {
    if (clubPublicIds.length === 0) {
      toast.error("ไม่พบรหัสชมรมสำหรับเอกสารที่เลือก");
      return;
    }

    try {
      setIsLoading(true);
      
      const firstClubPublicId = clubPublicIds[0];
      const docIds = selectedDocuments.filter(doc => doc.clubPublicId === firstClubPublicId).map(doc => doc.id);
      
      const result = await documentApi.bulkExport(firstClubPublicId, {
        documentIds: docIds,
        format,
      });

      if (format === 'csv' && result instanceof Blob) {
        const url = window.URL.createObjectURL(result);
        const a = document.createElement('a');
        a.href = url;
        a.download = `documents-export-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("ส่งออกข้อมูลสำเร็จ");
      } else {
        // JSON export
        const dataStr = JSON.stringify(result, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `documents-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("ส่งออกข้อมูลสำเร็จ");
      }
    } catch (error: any) {
      console.error("Error exporting documents:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถส่งออกข้อมูลได้");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async (clubPublicId: string | number) => {
    try {
      setIsLoadingMembers(true);
      const clubMembers = await clubApi.getClubMembers(clubPublicId);
      setMembers(clubMembers);
    } catch (error: any) {
      console.error("Error fetching members:", error);
      toast.error("ไม่สามารถโหลดข้อมูลสมาชิกได้");
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleAssignDialogOpen = (open: boolean) => {
    setIsAssignDialogOpen(open);
    if (open && clubPublicIds.length > 0) {
      fetchMembers(clubPublicIds[0]);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="sticky top-0 z-10 bg-background border-b p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            เลือกแล้ว {selectedCount} รายการ
          </span>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            ยกเลิกการเลือกทั้งหมด
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <MoreVertical className="h-4 w-4 mr-2" />
              การดำเนินการ
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>การดำเนินการกลุ่ม</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsStatusDialogOpen(true)}>
              <Tag className="h-4 w-4 mr-2" />
              อัปเดตสถานะ
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAssignDialogOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              มอบหมายสมาชิก
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkExport('csv')}>
              <FileDown className="h-4 w-4 mr-2" />
              ส่งออกเป็น CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkExport('json')}>
              <FileDown className="h-4 w-4 mr-2" />
              ส่งออกเป็น JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              ลบเอกสาร
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>อัปเดตสถานะ</DialogTitle>
            <DialogDescription>
              เลือกสถานะใหม่สำหรับ {selectedCount} เอกสาร
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedStatus} onValueChange={(value: DocumentStatus) => setSelectedStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">เปิด</SelectItem>
                <SelectItem value="In Progress">กำลังดำเนินการ</SelectItem>
                <SelectItem value="Completed">เสร็จสมบูรณ์</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleBulkUpdateStatus} disabled={isLoading}>
                {isLoading ? "กำลังอัปเดต..." : "อัปเดต"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Members Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={handleAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>มอบหมายสมาชิก</DialogTitle>
            <DialogDescription>
              เลือกสมาชิกที่จะมอบหมายให้ {selectedCount} เอกสาร
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {isLoadingMembers ? (
              <div className="text-center py-8 text-muted-foreground">
                กำลังโหลดสมาชิก...
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer"
                    onClick={() => {
                      setSelectedMemberIds(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(member.userId)) {
                          newSet.delete(member.userId);
                        } else {
                          newSet.add(member.userId);
                        }
                        return newSet;
                      });
                    }}
                  >
                    <Checkbox
                      checked={selectedMemberIds.has(member.userId)}
                      onCheckedChange={(checked) => {
                        setSelectedMemberIds(prev => {
                          const newSet = new Set(prev);
                          if (checked) {
                            newSet.add(member.userId);
                          } else {
                            newSet.delete(member.userId);
                          }
                          return newSet;
                        });
                      }}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.user.avatar} />
                      <AvatarFallback>
                        {getDiceBearAvatar(`${member.user.firstName} ${member.user.lastName}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {member.user.firstName} {member.user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleAssignDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleBulkAssign} 
              disabled={isLoading || selectedMemberIds.size === 0}
            >
              {isLoading ? "กำลังมอบหมาย..." : "มอบหมาย"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบ {selectedCount} เอกสารหรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isLoading}
            >
              {isLoading ? "กำลังลบ..." : "ลบ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

