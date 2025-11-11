import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { Plus, Calendar as CalendarIcon, Clock, MapPin, Users, Bell, QrCode, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import QRCodeReact from "react-qr-code";
import type { User } from "../App";

interface CalendarViewProps {
  user: User;
}

interface Event {
  id: number;
  title: string;
  type: "practice" | "meeting" | "performance" | "workshop" | "other";
  date: Date;
  time: string;
  location: string;
  description: string;
  attendees?: number;
  reminderEnabled: boolean;
}

export function CalendarView({ user }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isQRCheckinOpen, setIsQRCheckinOpen] = useState(false);
  const [qrEventId, setQREventId] = useState<number | null>(null);
  const [qrStartTime, setQRStartTime] = useState("");
  const [qrExpireTime, setQRExpireTime] = useState("");
  const [checkedInMembers, setCheckedInMembers] = useState<string[]>([]);
  const [qrCodeGenerated, setQrCodeGenerated] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [qrCodeStartTime, setQrCodeStartTime] = useState<Date | null>(null);
  const [qrCodeExpireTime, setQrCodeExpireTime] = useState<Date | null>(null);

  const [events] = useState<Event[]>([
    {
      id: 1,
      title: "Weekly Practice Session",
      type: "practice",
      date: new Date(2025, 10, 9),
      time: "14:00 - 17:00",
      location: "Music Room 301",
      description: "Regular weekly practice for upcoming concert",
      attendees: 32,
      reminderEnabled: true,
    },
    {
      id: 2,
      title: "Monthly Committee Meeting",
      type: "meeting",
      date: new Date(2025, 10, 10),
      time: "18:00 - 20:00",
      location: "Meeting Room A",
      description: "Discuss upcoming events",
      attendees: 8,
      reminderEnabled: true,
    },
    {
      id: 3,
      title: "Community Concert",
      type: "performance",
      date: new Date(2025, 10, 15),
      time: "19:00 - 21:00",
      location: "University Auditorium",
      description: "Public performance for community outreach",
      attendees: 45,
      reminderEnabled: true,
    },
    {
      id: 4,
      title: "Beginner Workshop",
      type: "workshop",
      date: new Date(2025, 10, 12),
      time: "13:00 - 16:00",
      location: "Music Room 302",
      description: "Teaching basics to new members",
      attendees: 20,
      reminderEnabled: true,
    },
    {
      id: 5,
      title: "Equipment Maintenance",
      type: "other",
      date: new Date(2025, 10, 8),
      time: "10:00 - 12:00",
      location: "Storage Room",
      description: "Regular instrument maintenance and inventory check",
      attendees: 5,
      reminderEnabled: false,
    },
  ]);

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "practice":
        return "bg-blue-100 text-blue-700 hover:bg-blue-100";
      case "meeting":
        return "bg-purple-100 text-purple-700 hover:bg-purple-100";
      case "performance":
        return "bg-red-100 text-red-700 hover:bg-red-100";
      case "workshop":
        return "bg-green-100 text-green-700 hover:bg-green-100";
      case "other":
        return "bg-gray-100 text-gray-700 hover:bg-gray-100";
      default:
        return "";
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case "practice":
        return "Practice";
      case "meeting":
        return "Meeting";
      case "performance":
        return "Performance";
      case "workshop":
        return "Workshop";
      case "other":
        return "Other";
      default:
        return type;
    }
  };

  const selectedDateEvents = events.filter(
    (event) =>
      selectedDate &&
      event.date.getDate() === selectedDate.getDate() &&
      event.date.getMonth() === selectedDate.getMonth() &&
      event.date.getFullYear() === selectedDate.getFullYear()
  );

  const upcomingEvents = events
    .filter((event) => event.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const eventDates = events.map((event) => event.date);

  const handleSubmitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Event created successfully! Reminders will be sent to all members.");
    setIsNewEventOpen(false);
  };

  // Update current time every second when QR check-in is open
  useEffect(() => {
    if (isQRCheckinOpen && qrCodeGenerated) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isQRCheckinOpen, qrCodeGenerated]);

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!qrCodeExpireTime) return null;
    const now = currentTime.getTime();
    const expire = qrCodeExpireTime.getTime();
    const remaining = expire - now;
    
    if (remaining <= 0) return { expired: true, minutes: 0, seconds: 0 };
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return { expired: false, minutes, seconds };
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="mb-2">Calendar & Events</h1>
          <p className="text-muted-foreground">
            Schedule and manage club activities with automatic reminders
          </p>
        </div>
        {(user.role === "leader" || user.role === "admin") && (
          <Dialog open={isNewEventOpen} onOpenChange={setIsNewEventOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                สร้างกิจกรรมใหม่
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>สร้างกิจกรรมใหม่</DialogTitle>
              <DialogDescription>
                กำหนดกิจกรรมใหม่และแจ้งเตือนสมาชิกทั้งหมด
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitEvent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event-title">หัวข้อกิจกรรม</Label>
                <Input
                  id="event-title"
                  placeholder="กรอกหัวข้อกิจกรรม"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-type">ประเภทกิจกรรม</Label>
                <Select required>
                  <SelectTrigger id="event-type">
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="practice">การซ้อม</SelectItem>
                    <SelectItem value="meeting">การประชุม</SelectItem>
                    <SelectItem value="performance">การแสดง</SelectItem>
                    <SelectItem value="workshop">เวิร์คช็อป</SelectItem>
                    <SelectItem value="other">อื่นๆ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-date">วันที่</Label>
                  <Input
                    id="event-date"
                    type="date"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-time">เวลา</Label>
                  <Input
                    id="event-time"
                    type="time"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-location">สถานที่</Label>
                <Input
                  id="event-location"
                  placeholder="กรอกสถานที่"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-description">คำอธิบาย</Label>
                <Textarea
                  id="event-description"
                  placeholder="รายละเอียดและบันทึกกิจกรรม"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="reminder">เปิดการแจ้งเตือน LINE Notify</Label>
                  <p className="text-sm text-muted-foreground">
                    ส่งการแจ้งเตือนอัตโนมัติไปยังสมาชิกทั้งหมด
                  </p>
                </div>
                <Switch id="reminder" defaultChecked />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">สร้างกิจกรรม</Button>
                <Button type="button" variant="outline" onClick={() => setIsNewEventOpen(false)}>
                  ยกเลิก
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ปฏิทินกิจกรรม</CardTitle>
            <CardDescription>เลือกวันที่เพื่อดูกิจกรรมที่กำหนดไว้</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                eventDay: eventDates,
              }}
              modifiersClassNames={{
                eventDay: "bg-blue-100 text-blue-900",
              }}
            />
            {selectedDateEvents.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-sm">
                  Events on {selectedDate?.toLocaleDateString('th-TH')}
                </h4>
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4>{event.title}</h4>
                      <Badge className={getEventTypeColor(event.type)}>
                        {getEventTypeLabel(event.type)}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{event.location}</span>
                      </div>
                      {event.attendees && (
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          <span>{event.attendees} คน</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>กิจกรรมที่กำลังจะมาถึง</CardTitle>
              <CardDescription>กิจกรรม 5 รายการถัดไป</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="space-y-2 pb-4 border-b last:border-0 last:pb-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.date.toLocaleDateString('th-TH')}
                        </p>
                      </div>
                      <Badge className={getEventTypeColor(event.type)} variant="outline">
                        {getEventTypeLabel(event.type)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{event.time}</span>
                    </div>
                    {event.reminderEnabled && (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <Bell className="h-3 w-3" />
                        <span>Reminder enabled</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>สถิติด่วน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl">{events.filter(e => e.date.getMonth() === new Date().getMonth()).length}</p>
                <p className="text-xs text-muted-foreground">Events scheduled</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Event</p>
                <p className="text-2xl">2 days</p>
                <p className="text-xs text-muted-foreground">Until next activity</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Attendance</p>
                <p className="text-2xl">85%</p>
                <p className="text-xs text-muted-foreground">Last 10 events</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle>{selectedEvent.title}</DialogTitle>
                    <DialogDescription>
                      {selectedEvent.date.toLocaleDateString('th-TH')} at {selectedEvent.time}
                    </DialogDescription>
                  </div>
                  <Badge className={getEventTypeColor(selectedEvent.type)}>
                    {getEventTypeLabel(selectedEvent.type)}
                  </Badge>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm">Date & Time</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvent.date.toLocaleDateString('th-TH')} • {selectedEvent.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm">Location</p>
                      <p className="text-sm text-muted-foreground">{selectedEvent.location}</p>
                    </div>
                  </div>
                  {selectedEvent.attendees && (
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm">Expected Attendees</p>
                        <p className="text-sm text-muted-foreground">{selectedEvent.attendees} members</p>
                      </div>
                    </div>
                  )}
                  {selectedEvent.reminderEnabled && (
                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-green-50">
                      <Bell className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-green-900">LINE Notify Reminder</p>
                        <p className="text-sm text-green-700">
                          Members will receive automatic reminders
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {selectedEvent.description && (
                  <div>
                    <Label>Description</Label>
                    <p className="mt-2 text-sm text-muted-foreground">{selectedEvent.description}</p>
                  </div>
                )}
                {(user.role === "leader" || user.role === "admin") && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" className="flex-1">Edit Event</Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setQREventId(selectedEvent.id);
                        setIsQRCheckinOpen(true);
                        setSelectedEvent(null);
                      }}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Check-in Members
                    </Button>
                    <Button variant="outline">Send Reminder</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Check-in Dialog */}
      <Dialog open={isQRCheckinOpen} onOpenChange={() => {
        setIsQRCheckinOpen(false);
        setQREventId(null);
        setQRStartTime("");
        setQRExpireTime("");
        setCheckedInMembers([]);
        setQrCodeGenerated(false);
        setQrCodeStartTime(null);
        setQrCodeExpireTime(null);
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-hidden">
          <DialogHeader>
            <DialogTitle>เช็คอินด้วย QR Code</DialogTitle>
            <DialogDescription>
              สร้าง QR code สำหรับสมาชิกเช็คอินเข้าร่วมกิจกรรม
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* QR Settings - Only shown before generation */}
            {!qrCodeGenerated && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">เวลาเริ่มต้น (ไม่บังคับ)</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={qrStartTime}
                      onChange={(e) => setQRStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expire-time">เวลาหมดอายุ (ไม่บังคับ)</Label>
                    <Input
                      id="expire-time"
                      type="time"
                      value={qrExpireTime}
                      onChange={(e) => setQRExpireTime(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    const now = new Date();
                    setQrCodeStartTime(now);
                    
                    // Calculate expire time
                    let expireTime: Date;
                    if (qrStartTime && qrExpireTime) {
                      // Use provided times
                      const [startHour, startMinute] = qrStartTime.split(':').map(Number);
                      const [expireHour, expireMinute] = qrExpireTime.split(':').map(Number);
                      expireTime = new Date(now);
                      expireTime.setHours(expireHour, expireMinute, 0, 0);
                      
                      // If expire time is before start time, assume next day
                      if (expireTime < now) {
                        expireTime.setDate(expireTime.getDate() + 1);
                      }
                    } else {
                      // Default to 15 minutes from now
                      expireTime = new Date(now.getTime() + 15 * 60 * 1000);
                    }
                    
                    setQrCodeExpireTime(expireTime);
                    setQrCodeGenerated(true);
                    setCurrentTime(now);
                    toast.success("QR Code generated successfully!");
                  }}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  สร้าง QR Code
                </Button>
              </div>
            )}

            {/* QR Code and Member List - Only shown after generation */}
            {qrCodeGenerated && (
              <>
                <Separator />
                {/* Time Count Display */}
                <div className="text-center py-3 bg-slate-50 rounded-lg border">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {(() => {
                      const timeRemaining = getTimeRemaining();
                      if (!timeRemaining) {
                        return (
                          <span className="text-lg font-semibold">
                            {currentTime.toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        );
                      }
                      if (timeRemaining.expired) {
                        return (
                          <span className="text-lg font-semibold text-red-600">
                            หมดเวลาแล้ว
                          </span>
                        );
                      }
                      return (
                        <span className="text-lg font-semibold">
                          เหลือเวลา: {String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_1fr] gap-8">
                  {/* QR Code Section */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-sm font-medium mb-4">Scan to Check In</h4>
                      <div className="flex justify-center">
                        <div className="inline-block p-4 bg-white border-2 rounded-lg">
                          <QRCodeReact
                            value={`checkin-event-${qrEventId}-${Date.now()}`}
                            size={180}
                            level="H"
                          />
                        </div>
                      </div>
                      <Button
                        className="mt-4 w-full"
                        variant="outline"
                        onClick={() => {
                          // Simulate a member scanning
                          const mockMembers = [
                            "สมชาย ใจดี",
                            "สมหญิง รักดี",
                            "ประภาส มั่นคง",
                            "วิชัย สุขใจ",
                            "นภา สว่างใจ",
                            "ธนพล แข็งแรง",
                            "พิมพ์ใจ ดีงาม",
                            "ศิริพร รุ่งเรือง",
                          ];
                          const randomMember = mockMembers[Math.floor(Math.random() * mockMembers.length)];
                          if (!checkedInMembers.includes(randomMember)) {
                            setCheckedInMembers([...checkedInMembers, randomMember]);
                            toast.success(`${randomMember} checked in successfully!`);
                          } else {
                            toast.info(`${randomMember} already checked in`);
                          }
                        }}
                      >
                        Simulate Scan
                      </Button>
                    </div>
                  </div>

                  {/* Checked-in Members List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">สมาชิกที่เช็คอินแล้ว</h4>
                      <Badge variant="secondary">{checkedInMembers.length}</Badge>
                    </div>
                    <div className="border rounded-lg max-h-[220px] overflow-y-auto bg-slate-50 custom-scrollbar">
                      {checkedInMembers.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No members checked in yet</p>
                          <p className="text-xs mt-1">Members will appear here after scanning</p>
                        </div>
                      ) : (
                        <div className="divide-y bg-white">
                          {checkedInMembers.map((member, index) => (
                            <div key={index} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{member}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date().toLocaleTimeString('th-TH', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="bg-green-50 text-green-700 shrink-0">
                                Checked In
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button
                className="flex-1"
                onClick={() => {
                  toast.success(`Check-in completed! ${checkedInMembers.length} members attended.`);
                  setIsQRCheckinOpen(false);
                  setQREventId(null);
                  setQRStartTime("");
                  setQRExpireTime("");
                  setCheckedInMembers([]);
                  setQrCodeGenerated(false);
                  setQrCodeStartTime(null);
                  setQrCodeExpireTime(null);
                }}
                disabled={!qrCodeGenerated}
              >
                เสร็จสิ้นการเช็คอิน
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsQRCheckinOpen(false);
                  setQREventId(null);
                  setQRStartTime("");
                  setQRExpireTime("");
                  setCheckedInMembers([]);
                  setQrCodeGenerated(false);
                }}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
