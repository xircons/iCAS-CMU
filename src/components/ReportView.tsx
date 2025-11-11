import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarImage, AvatarFallback, getDiceBearAvatar } from "./ui/avatar";
import { Calendar, Users, Wallet, TrendingUp, Download, FileText } from "lucide-react";
import { Progress } from "./ui/progress";
import type { User } from "../App";

interface ReportViewProps {
  user: User;
}

export function ReportView({ user }: ReportViewProps) {
  const isLeaderOrAdmin = user.role === "leader" || user.role === "admin";

  // Mock data - would come from backend in real application
  const clubData = {
    totalMembers: 48,
    activeMembers: 41,
    activeRate: 85,
    totalEvents: 20,
    completedEvents: 15,
    upcomingEvents: 5,
  };

  const monthlyActivity = [
    { month: "มิ.ย.", events: 3, attendance: 82 },
    { month: "ก.ค.", events: 4, attendance: 85 },
    { month: "ส.ค.", events: 3, attendance: 80 },
    { month: "ก.ย.", events: 5, attendance: 88 },
    { month: "ต.ค.", events: 4, attendance: 90 },
    { month: "พ.ย.", events: 1, attendance: 85 },
  ];

  const topPerformers = [
    { name: "สมชาย ใจดี", attendance: 95, contributions: 12 },
    { name: "สมหญิง รักดี", attendance: 90, contributions: 10 },
    { name: "ประภาส มั่นคง", attendance: 88, contributions: 9 },
    { name: "วิชัย สุขใจ", attendance: 85, contributions: 8 },
    { name: "นภา สว่างใจ", attendance: 82, contributions: 7 },
  ];

  const recentActivities = [
    { date: "2025-11-07", activity: "Weekly Practice Session", attendees: 32 },
    { date: "2025-11-05", activity: "Monthly Committee Meeting", attendees: 8 },
    { date: "2025-11-02", activity: "Community Concert", attendees: 45 },
    { date: "2025-10-30", activity: "Workshop Planning", attendees: 15 },
    { date: "2025-10-28", activity: "Instrument Maintenance", attendees: 12 },
  ];

  // Members cannot access Reports & Analytics
  if (user.role === "member") {
    return (
      <div className="p-4 md:p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl mb-2">Reports & Analytics</h2>
              <p className="text-muted-foreground">
                ฟีเจอร์นี้ไม่พร้อมใช้งานสำหรับสมาชิก
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            ภาพรวมครบถ้วนของประสิทธิภาพและกิจกรรมชมรม
          </p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          ส่งออกรายงาน
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">สมาชิกทั้งหมด</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{clubData.totalMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {clubData.activeMembers} คนใช้งานอยู่
            </p>
            <Progress value={clubData.activeRate} className="h-1 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">กิจกรรม</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{clubData.totalEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              เสร็จแล้ว {clubData.completedEvents}, กำลังจะมาถึง {clubData.upcomingEvents}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">อัตราการใช้งาน</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">{clubData.activeRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              สูงกว่าค่าเฉลี่ย
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Activity */}
        <Card>
          <CardHeader>
            <CardTitle>แนวโน้มกิจกรรมรายเดือน</CardTitle>
            <CardDescription>กิจกรรมและการเข้าร่วมในช่วง 6 เดือนที่ผ่านมา</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyActivity.map((month) => (
                <div key={month.month} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{month.month}</span>
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">{month.events} กิจกรรม</span>
                      <span>{month.attendance}% การเข้าร่วม</span>
                    </div>
                  </div>
                  <Progress value={month.attendance} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle>สมาชิกที่ใช้งานมากที่สุด</CardTitle>
            <CardDescription>สมาชิกที่มีอัตราการมีส่วนร่วมสูงสุด</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((member, index) => (
                <div key={member.name} className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-8 w-8 text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getDiceBearAvatar(member.name)} />
                    <AvatarFallback>
                      {member.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{member.attendance}% การเข้าร่วม</span>
                      <span>{member.contributions} การมีส่วนร่วม</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-medium">{member.attendance}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>กิจกรรมล่าสุด</CardTitle>
          <CardDescription>กิจกรรมชมรมและการเข้าร่วมล่าสุด</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm">{activity.activity}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.date).toLocaleDateString('th-TH')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm">{activity.attendees}</p>
                  <p className="text-xs text-muted-foreground">ผู้เข้าร่วม</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
