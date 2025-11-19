import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Search, Upload, FileText, X, Eye, Edit, Trash2, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { documentApi } from "../../features/smart-document/api/documentApi";
import type { DocumentTemplate } from "./types";
import { useClubSafe } from "../../contexts/ClubContext";
import { useUser } from "../../App";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";

interface TemplateLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate?: (template: DocumentTemplate) => void;
  mode?: "select" | "manage"; // "select" for choosing template, "manage" for full management
}

export function TemplateLibrary({ open, onOpenChange, onSelectTemplate, mode = "select" }: TemplateLibraryProps) {
  const { user } = useUser();
  const { clubId } = useClubSafe();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);

  const categories: Array<{ value: string; label: string }> = [
    { value: "all", label: "ทั้งหมด" },
    { value: "Report", label: "รายงาน" },
    { value: "Form", label: "แบบฟอร์ม" },
    { value: "Contract", label: "สัญญา" },
    { value: "Letter", label: "จดหมาย" },
    { value: "Checklist", label: "รายการตรวจสอบ" },
    { value: "Other", label: "อื่นๆ" },
  ];

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open, categoryFilter]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const filters: any = {};
      if (categoryFilter !== "all") {
        filters.category = categoryFilter;
      }
      if (clubId) {
        filters.clubId = String(clubId);
      }
      const fetchedTemplates = await documentApi.getTemplates(filters);
      setTemplates(fetchedTemplates);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast.error("ไม่สามารถโหลดเทมเพลตได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete?.id) return;

    try {
      await documentApi.deleteTemplate(templateToDelete.id);
      toast.success("ลบเทมเพลตสำเร็จ");
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถลบเทมเพลตได้");
    }
  };

  const handlePreview = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleSelect = (template: DocumentTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
      onOpenChange(false);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const getCategoryLabel = (category?: string) => {
    const cat = categories.find((c) => c.value === category);
    return cat?.label || category || "อื่นๆ";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{mode === "select" ? "เลือกเทมเพลต" : "จัดการเทมเพลต"}</DialogTitle>
            <DialogDescription>
              {mode === "select"
                ? "เลือกเทมเพลตเอกสารที่ต้องการใช้"
                : "ดู จัดการ และอัปโหลดเทมเพลตเอกสาร"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาเทมเพลต..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="หมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Templates Grid */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  กำลังโหลดเทมเพลต...
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>ไม่พบเทมเพลต</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.id || template.name}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => mode === "select" && handleSelect(template)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base line-clamp-2 mb-2">
                              {template.name}
                            </CardTitle>
                            {template.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {template.description}
                              </p>
                            )}
                          </div>
                          {mode === "manage" && (
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreview(template);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {user?.role === "admin" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTemplateToDelete(template);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{getCategoryLabel(template.category)}</Badge>
                          {template.isPublic && (
                            <Badge variant="secondary" className="text-xs">
                              สาธารณะ
                            </Badge>
                          )}
                          {template.clubName && (
                            <Badge variant="outline" className="text-xs">
                              {template.clubName}
                            </Badge>
                          )}
                        </div>
                        {template.tags && template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.tags.slice(0, 3).map((tag, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs"
                              >
                                <TagIcon className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            {template.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        {mode === "select" && (
                          <Button
                            className="w-full mt-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(template);
                            }}
                          >
                            เลือกเทมเพลต
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="w-full h-[600px] border rounded-lg overflow-hidden bg-muted/30">
              <iframe
                src={documentApi.getFileUrl(selectedTemplate.filePath)}
                className="w-full h-full"
                title={selectedTemplate.name}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบเทมเพลต</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบเทมเพลต "{templateToDelete?.name}" หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTemplateToDelete(null)}>
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

