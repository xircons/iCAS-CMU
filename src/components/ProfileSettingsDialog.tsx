import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Settings, Trash2, AlertTriangle, User as UserIcon, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "../features/auth/api/authApi";
import { useNavigate } from "react-router-dom";
import { useUser } from "../App";
import { disconnectSocket } from "../config/websocket";
import type { User } from "../App";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { cn } from "./ui/utils";

interface ProfileSettingsDialogProps {
  user: User;
  onUserUpdate?: (user: User) => void;
}

export function ProfileSettingsDialog({ user, onUserUpdate }: ProfileSettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "delete">("profile");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useUser();
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber || "",
    email: user.email, // Read-only
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Delete account form state
  const [deleteForm, setDeleteForm] = useState({
    password: "",
    confirmText: "",
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileForm.firstName || !profileForm.lastName) {
      toast.error("กรุณากรอกชื่อและนามสกุล");
      return;
    }

    try {
      setIsLoading(true);
      const response = await authApi.updateProfile({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phoneNumber: profileForm.phoneNumber || undefined,
      });

      // Update user in parent component
      if (onUserUpdate) {
        onUserUpdate({
          id: String(response.user.id),
          email: response.user.email,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          phoneNumber: response.user.phoneNumber,
          major: response.user.major,
          role: response.user.role,
          clubId: response.user.clubId ? String(response.user.clubId) : undefined,
          clubName: response.user.clubName,
          avatar: response.user.avatar,
          memberships: response.user.memberships || [],
        });
      }

      toast.success("อัปเดตข้อมูลส่วนตัวสำเร็จ");
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || "ไม่สามารถอัปเดตข้อมูลได้ กรุณาลองอีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }

    try {
      setIsLoading(true);
      await authApi.changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      try {
        await authApi.logout();
      } catch {
        // Prefer clearing session even if revoke request fails (cookies cleared client-side flows still need setUser + navigate).
      }

      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsOpen(false);
      setUser(null);
      disconnectSocket();
      navigate("/login");
      toast.success("เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่ด้วยรหัสผ่านใหม่");
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองอีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deleteForm.password) {
      toast.error("กรุณากรอกรหัสผ่านเพื่อยืนยันการลบบัญชี");
      return;
    }

    if (deleteForm.confirmText !== "ลบ") {
      toast.error("กรุณาพิมพ์คำว่า 'ลบ' เพื่อยืนยัน");
      return;
    }

    try {
      setIsLoading(true);
      await authApi.deleteAccount(deleteForm.password);

      // Clear user state and disconnect socket
      setUser(null);
      disconnectSocket();
      
      // Navigate to login
      navigate('/login');
      toast.success("ลบบัญชีสำเร็จ");
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.response?.data?.message || "ไม่สามารถลบบัญชีได้ กรุณาลองอีกครั้ง");
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
      setDeleteForm({ password: "", confirmText: "" });
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setActiveTab("profile");
          setShowDeleteConfirm(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ตั้งค่าบัญชี</DialogTitle>
          <DialogDescription>
            แก้ไขข้อมูลส่วนตัว เปลี่ยนรหัสผ่าน หรือลบบัญชี
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const next = v as "profile" | "password" | "delete";
            setActiveTab(next);
            if (next !== "delete") {
              setShowDeleteConfirm(false);
            }
          }}
          className={cn("gap-4", "profile-settings-dialog-tabs")}
        >
          <TabsList aria-label="หมวดการตั้งค่าบัญชี">
            <TabsTrigger value="profile" className="flex-1">
              <UserIcon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="leading-tight">ข้อมูลส่วนตัว</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="flex-1">
              <KeyRound className="h-4 w-4 shrink-0" aria-hidden />
              <span className="leading-tight">เปลี่ยนรหัสผ่าน</span>
            </TabsTrigger>
            <TabsTrigger value="delete" className="flex-1">
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
              <span className="leading-tight">ลบบัญชี</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="profile" className="mt-0 outline-none">
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                value={profileForm.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">ไม่สามารถเปลี่ยนอีเมลได้</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">ชื่อ</Label>
              <Input
                id="firstName"
                value={profileForm.firstName}
                onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                placeholder="ชื่อ"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">นามสกุล</Label>
              <Input
                id="lastName"
                value={profileForm.lastName}
                onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                placeholder="นามสกุล"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">เบอร์โทรศัพท์</Label>
              <Input
                id="phoneNumber"
                value={profileForm.phoneNumber}
                onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                placeholder="0XX-XXX-XXXX"
                pattern="0\d{2}-\d{3}-\d{4}"
              />
              <p className="text-xs text-muted-foreground">รูปแบบ: 0XX-XXX-XXXX</p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                ยกเลิก
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="password" className="mt-0 outline-none">
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">รหัสผ่านเดิม</Label>
              <Input
                id="oldPassword"
                type="password"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                placeholder="กรอกรหัสผ่านเดิม"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="ยืนยันรหัสผ่านใหม่"
                required
                minLength={6}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                ยกเลิก
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="delete" className="mt-0 outline-none">
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-destructive mb-1">คำเตือน: การลบบัญชี</h4>
                  <p className="text-sm text-muted-foreground">
                    การลบบัญชีจะไม่สามารถย้อนกลับได้ ข้อมูลทั้งหมดของคุณจะถูกลบถาวร รวมถึง:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
                    <li>ข้อมูลส่วนตัวและประวัติการใช้งาน</li>
                    <li>สมาชิกภาพในชมรมทั้งหมด</li>
                    <li>กิจกรรมและงานที่เกี่ยวข้อง</li>
                    <li>เอกสารและรายงานทั้งหมด</li>
                  </ul>
                </div>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">
                  หากคุณต้องการลบบัญชี กรุณากดปุ่มด้านล่างเพื่อยืนยัน
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  ยืนยันการลบบัญชี
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="w-full"
                >
                  ยกเลิก
                </Button>
              </div>
            ) : (
              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deletePassword">รหัสผ่าน</Label>
                  <Input
                    id="deletePassword"
                    type="password"
                    value={deleteForm.password}
                    onChange={(e) => setDeleteForm({ ...deleteForm, password: e.target.value })}
                    placeholder="กรอกรหัสผ่านเพื่อยืนยันการลบ"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันการลบบัญชี
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmText">พิมพ์คำว่า "ลบ" เพื่อยืนยัน</Label>
                  <Input
                    id="confirmText"
                    value={deleteForm.confirmText}
                    onChange={(e) => setDeleteForm({ ...deleteForm, confirmText: e.target.value })}
                    placeholder="พิมพ์คำว่า 'ลบ'"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? "กำลังลบ..." : "ลบบัญชีถาวร"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteForm({ password: "", confirmText: "" });
                    }}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    ยกเลิก
                  </Button>
                </div>
              </form>
            )}
          </div>
        </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

