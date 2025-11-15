import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Plus, Search, Edit, Trash2, Tag, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "./ui/alert";
import type { User } from "../App";

interface ClubCategoryManagementViewProps {
  user: User;
}

export interface ClubCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  clubCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export function ClubCategoryManagementView({ user }: ClubCategoryManagementViewProps) {
  const [categories, setCategories] = useState<ClubCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ClubCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6", // Default blue color
  });

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      // const response = await categoryApi.getAllCategories();
      // setCategories(response.data.categories);
      
      // Mock data for now
      const mockCategories: ClubCategory[] = [
        {
          id: 1,
          name: "กีฬา",
          description: "ชมรมที่เกี่ยวข้องกับกีฬาและการออกกำลังกาย",
          color: "#ef4444",
          clubCount: 12,
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          name: "ดนตรี",
          description: "ชมรมที่เกี่ยวข้องกับดนตรีและการแสดง",
          color: "#8b5cf6",
          clubCount: 8,
          createdAt: new Date().toISOString(),
        },
        {
          id: 3,
          name: "เทคโนโลยี",
          description: "ชมรมที่เกี่ยวข้องกับเทคโนโลยีและนวัตกรรม",
          color: "#06b6d4",
          clubCount: 15,
          createdAt: new Date().toISOString(),
        },
        {
          id: 4,
          name: "จิตอาสา",
          description: "ชมรมที่เกี่ยวข้องกับการช่วยเหลือสังคม",
          color: "#10b981",
          clubCount: 10,
          createdAt: new Date().toISOString(),
        },
      ];
      setCategories(mockCategories);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('ไม่สามารถโหลดข้อมูลประเภทชมรมได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (category?: ClubCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || "",
        color: category.color || "#3b82f6",
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        description: "",
        color: "#3b82f6",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      color: "#3b82f6",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('กรุณากรอกชื่อประเภทชมรม');
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (editingCategory) {
        // TODO: Replace with actual API call
        // await categoryApi.updateCategory(editingCategory.id, formData);
        toast.success('อัปเดตประเภทชมรมสำเร็จ');
        
        // Update local state
        setCategories(categories.map(cat => 
          cat.id === editingCategory.id 
            ? { ...cat, ...formData, updatedAt: new Date().toISOString() }
            : cat
        ));
      } else {
        // TODO: Replace with actual API call
        // const response = await categoryApi.createCategory(formData);
        // setCategories([...categories, response.data.category]);
        toast.success('สร้างประเภทชมรมสำเร็จ');
        
        // Add to local state (mock)
        const newCategory: ClubCategory = {
          id: categories.length + 1,
          ...formData,
          clubCount: 0,
          createdAt: new Date().toISOString(),
        };
        setCategories([...categories, newCategory]);
      }
      
      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.error?.message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (categoryId: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบประเภทชมรมนี้?')) {
      return;
    }

    try {
      // TODO: Replace with actual API call
      // await categoryApi.deleteCategory(categoryId);
      toast.success('ลบประเภทชมรมสำเร็จ');
      
      // Update local state
      setCategories(categories.filter(cat => cat.id !== categoryId));
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.error?.message || 'ไม่สามารถลบข้อมูลได้');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="mb-2 text-xl md:text-2xl">จัดการประเภทชมรม</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            เพิ่ม แก้ไข และลบประเภทชมรมสำหรับระบบแนะนำชมรม
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มประเภทชมรม
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'แก้ไขประเภทชมรม' : 'เพิ่มประเภทชมรมใหม่'}
              </DialogTitle>
              <DialogDescription>
                {editingCategory 
                  ? 'แก้ไขข้อมูลประเภทชมรม' 
                  : 'สร้างประเภทชมรมใหม่สำหรับใช้ในการจำแนกชมรม'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อประเภทชมรม *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น กีฬา, ดนตรี, เทคโนโลยี"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">คำอธิบาย</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="อธิบายเกี่ยวกับประเภทชมรมนี้..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="color">สีประจำประเภท</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  เลือกสีสำหรับแสดงในระบบแนะนำชมรม
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    editingCategory ? 'อัปเดต' : 'สร้าง'
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
                  ยกเลิก
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          ประเภทชมรมจะถูกใช้ในระบบแนะนำชมรมและการค้นหา ชมรมสามารถเลือกประเภทได้หลายประเภท
        </AlertDescription>
      </Alert>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาประเภทชมรม..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>ประเภทชมรมทั้งหมด</CardTitle>
            <CardDescription>
              พบ {filteredCategories.length} ประเภท
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>ไม่พบประเภทชมรม</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>คำอธิบาย</TableHead>
                      <TableHead>จำนวนชมรม</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="font-medium">{category.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {category.description || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {category.clubCount || 0} ชมรม
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(category.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

