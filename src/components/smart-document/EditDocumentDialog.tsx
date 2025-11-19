import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { toast } from "sonner";
import { useUser } from "../../App";
import { Loader2, Trash2 } from "lucide-react";
import type { SmartDocument, Priority, DocumentType } from "./types";
import { documentApi, type UpdateDocumentRequest } from "../../features/smart-document/api/documentApi";

interface EditDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: SmartDocument | null;
  onSuccess: (document: SmartDocument) => void;
  onDelete?: () => void;
}

export function EditDocumentDialog({ open, onOpenChange, document, onSuccess, onDelete }: EditDocumentDialogProps) {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<UpdateDocumentRequest>({
    title: "",
    description: "",
    priority: "Medium",
    type: "Report",
    dueDate: "",
    status: "Open",
  });

  // Initialize form data when document changes
  useEffect(() => {
    if (document && open) {
      setFormData({
        title: document.title,
        description: document.description,
        priority: document.priority,
        type: document.type,
        dueDate: document.dueDate.split('T')[0], // Convert to date input format
        status: document.status,
      });
    }
  }, [document, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!document) return;

    if (!formData.title?.trim()) {
      toast.error("กรุณากรอกหัวข้อเอกสาร");
      return;
    }

    if (!formData.description?.trim()) {
      toast.error("กรุณากรอกคำอธิบาย");
      return;
    }

    if (!formData.dueDate) {
      toast.error("กรุณาเลือกวันครบกำหนด");
      return;
    }

    try {
      setIsLoading(true);
      // Don't update assignedMemberIds - keep existing assignments
      const { assignedMemberIds, ...updateData } = formData;
      const updatedDoc = await documentApi.updateDocument(
        document.clubId,
        document.id,
        updateData
      );
      toast.success("อัปเดตเอกสารสำเร็จ");
      onSuccess(updatedDoc);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating document:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถอัปเดตเอกสารได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!document) return;

    try {
      setIsDeleting(true);
      await documentApi.deleteDocument(document.clubId, document.id);
      toast.success("ลบเอกสารสำเร็จ");
      setIsDeleteDialogOpen(false);
      onOpenChange(false);
      if (onDelete) {
        onDelete();
      }
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถลบเอกสารได้");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!document) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ไขเอกสาร</DialogTitle>
          <DialogDescription>
            อัปเดตข้อมูลเอกสาร
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">หัวข้อเอกสาร *</Label>
              <Input
                id="title"
                placeholder="เช่น รายงานกิจกรรมประจำเดือน"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">คำอธิบาย *</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="กรอกคำอธิบายเอกสาร..."
                className="resize-y border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 w-full rounded-md border bg-input-background px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm min-h-[100px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">ระดับความสำคัญ</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: Priority) => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">ต่ำ</SelectItem>
                    <SelectItem value="Medium">ปานกลาง</SelectItem>
                    <SelectItem value="High">สูง</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">ประเภทเอกสาร</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: DocumentType) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Report">รายงาน</SelectItem>
                    <SelectItem value="Checklist">รายการตรวจสอบ</SelectItem>
                    <SelectItem value="Request Form">แบบฟอร์มคำขอ</SelectItem>
                    <SelectItem value="Contract">สัญญา</SelectItem>
                    <SelectItem value="Letter">จดหมาย</SelectItem>
                    <SelectItem value="Other">อื่นๆ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">วันครบกำหนด *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">สถานะ</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'Open' | 'In Progress' | 'Completed') => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">เปิด</SelectItem>
                    <SelectItem value="In Progress">กำลังดำเนินการ</SelectItem>
                    <SelectItem value="Completed">เสร็จสมบูรณ์</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isLoading || isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              ลบเอกสาร
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading || isDeleting}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isLoading || isDeleting}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึก"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบเอกสาร</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบ "{document.title}"? 
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                การดำเนินการนี้ไม่สามารถยกเลิกได้ และจะลบเอกสารและข้อมูลที่เกี่ยวข้องทั้งหมด
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  ลบเอกสาร
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

