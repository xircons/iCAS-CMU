import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { User, Shield, Users } from "lucide-react";
import { useUser } from "../App";
import type { UserRole } from "../App";

export function LoginHub() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useUser();
  const navigate = useNavigate();

  // Mock users for demonstration
  const mockUsers = {
    member: {
      id: "1",
      name: "สมชาย นักศึกษา",
      role: "member" as const,
      email: "member@cmu.ac.th",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Member",
    },
    leader: {
      id: "2",
      name: "สมหญิง หัวหน้า",
      role: "leader" as const,
      clubId: "club-1",
      clubName: "ชมรมดนตรีสากล",
      email: "leader@cmu.ac.th",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Leader",
    },
    admin: {
      id: "3",
      name: "ประภาส ผู้ดูแล",
      role: "admin" as const,
      email: "admin@cmu.ac.th",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin",
    },
  };

  const getDefaultPath = (role: UserRole) => {
    if (role === "admin") return "/create-clubs";
    return "/dashboard";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple mock authentication
    if (email === "member@cmu.ac.th" && password === "member") {
      setUser(mockUsers.member);
      navigate(getDefaultPath("member"));
    } else if (email === "leader@cmu.ac.th" && password === "leader") {
      setUser(mockUsers.leader);
      navigate(getDefaultPath("leader"));
    } else if (email === "admin@cmu.ac.th" && password === "admin") {
      setUser(mockUsers.admin);
      navigate(getDefaultPath("admin"));
    } else {
      alert("ข้อมูลประจำตัวไม่ถูกต้อง ลอง:\nmember@cmu.ac.th / member\nleader@cmu.ac.th / leader\nadmin@cmu.ac.th / admin");
    }
  };

  const handleQuickLogin = (role: "member" | "leader" | "admin") => {
    console.log("Quick login clicked for role:", role);
    console.log("User data:", mockUsers[role]);
    setUser(mockUsers[role]);
    navigate(getDefaultPath(role));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4 p-10">
            <img 
              src="/logo/logopng.png" 
              alt="iCAS-CMU HUB" 
              className="h-24 md:h-32 w-auto object-contain"
            />
          </div>
          <p className="text-xl text-muted-foreground">
            ระบบจัดการชมรมแบบบูรณาการ
          </p>
          <p className="text-muted-foreground">
            ทำให้การจัดการเอกสาร การเบิกจ่าย และการมีส่วนร่วมของสมาชิกง่ายขึ้น
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Login Form */}
          <Card>
            <CardHeader>
              <CardTitle>เข้าสู่ระบบ</CardTitle>
              <CardDescription>
                กรอกข้อมูลประจำตัวเพื่อเข้าถึงระบบ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@cmu.ac.th"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="กรอกรหัสผ่านของคุณ"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  เข้าสู่ระบบ
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Access Demo */}
          <Card>
            <CardHeader>
              <CardTitle>เข้าถึงด่วน (ทดลอง)</CardTitle>
              <CardDescription>
                ลองใช้บทบาทผู้ใช้ต่างๆ เพื่อสำรวจระบบ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => handleQuickLogin("member")}
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium">บัญชีสมาชิก</p>
                    <p className="text-sm text-muted-foreground">
                      member@cmu.ac.th / member
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                    </p>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => handleQuickLogin("leader")}
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium">บัญชีหัวหน้าชมรม</p>
                    <p className="text-sm text-muted-foreground">
                      leader@cmu.ac.th / leader
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                    </p>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => handleQuickLogin("admin")}
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium">บัญชีผู้ดูแลระบบ</p>
                    <p className="text-sm text-muted-foreground">
                      admin@cmu.ac.th / admin
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                    </p>
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Overview */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">เอกสารอัจฉริยะ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                ส่งเอกสารออนไลน์พร้อมติดตามแบบเรียลไทม์
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">ติดตามสมาชิก</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                ประเมินการเข้าร่วมและอัตราการใช้งานอัตโนมัติ
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">ปฏิทินอัจฉริยะ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                กิจกรรมรวมศูนย์พร้อมการแจ้งเตือนผ่าน LINE Notify
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">ระบบข้อเสนอแนะ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                ช่องทางการสื่อสารโดยตรงกับหัวหน้าชมรม
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
