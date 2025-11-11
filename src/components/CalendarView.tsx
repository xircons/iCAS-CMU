import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Calendar as CalendarIcon, Clock, MapPin, Users, Bell, QrCode, FileText } from "lucide-react";
import { toast } from "sonner";
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
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

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


  return (
    <div className="p-3 sm:p-4 md:p-8 space-y-4 md:space-y-6 touch-auto" style={{ touchAction: 'manipulation' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl mb-2">Calendar & Events</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Schedule and manage club activities with automatic reminders
          </p>
        </div>
        {(user.role === "leader" || user.role === "admin") && (
          <Dialog open={isNewEventOpen} onOpenChange={setIsNewEventOpen}>
            <DialogTrigger asChild>
              <Button className="touch-manipulation w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="text-sm sm:text-base">สร้างกิจกรรมใหม่</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">สร้างกิจกรรมใหม่</DialogTitle>
              <DialogDescription className="text-sm">
                กำหนดกิจกรรมใหม่และแจ้งเตือนสมาชิกทั้งหมด
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitEvent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event-title" className="text-sm">หัวข้อกิจกรรม</Label>
                <Input
                  id="event-title"
                  placeholder="กรอกหัวข้อกิจกรรม"
                  className="text-sm sm:text-base"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-type" className="text-sm">ประเภทกิจกรรม</Label>
                <Select required>
                  <SelectTrigger id="event-type" className="text-sm sm:text-base">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-date" className="text-sm">วันที่</Label>
                  <Input
                    id="event-date"
                    type="date"
                    className="text-sm sm:text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-time" className="text-sm">เวลา</Label>
                  <Input
                    id="event-time"
                    type="time"
                    className="text-sm sm:text-base"
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="reminder" className="text-sm">เปิดการแจ้งเตือน LINE Notify</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    ส่งการแจ้งเตือนอัตโนมัติไปยังสมาชิกทั้งหมด
                  </p>
                </div>
                <Switch id="reminder" defaultChecked />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button type="submit" className="flex-1 w-full sm:w-auto text-sm sm:text-base">สร้างกิจกรรม</Button>
                <Button type="button" variant="outline" className="w-full sm:w-auto text-sm sm:text-base" onClick={() => setIsNewEventOpen(false)}>
                  ยกเลิก
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">ปฏิทินกิจกรรม</CardTitle>
            <CardDescription className="text-xs sm:text-sm">เลือกวันที่เพื่อดูกิจกรรมที่กำหนดไว้</CardDescription>
          </CardHeader>
          <CardContent className="touch-manipulation p-4 sm:p-6">
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
              <div className="mt-4 sm:mt-6 space-y-3">
                <h4 className="text-sm font-medium">
                  Events on {selectedDate?.toLocaleDateString('th-TH')}
                </h4>
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 sm:p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer touch-manipulation"
                    onClick={() => setSelectedEvent(event)}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setSelectedEvent(event);
                    }}
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
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">กิจกรรมที่กำลังจะมาถึง</CardTitle>
              <CardDescription className="text-xs sm:text-sm">กิจกรรม 5 รายการถัดไป</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="space-y-2 pb-4 border-b last:border-0 last:pb-0 cursor-pointer hover:opacity-80 transition-opacity touch-manipulation"
                    onClick={() => setSelectedEvent(event)}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setSelectedEvent(event);
                    }}
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">สถิติด่วน</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
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
      <Dialog open={!!selectedEvent} onOpenChange={(open) => {
        if (!open) setSelectedEvent(null);
      }}>
        <DialogContent className="!w-[90vw] !max-w-[90vw] !h-[80vh] !max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          {selectedEvent && (
            <>
              <DialogHeader className="pb-4 border-b">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-xl sm:text-2xl font-bold break-words leading-tight">
                        {selectedEvent.title}
                      </DialogTitle>
                    </div>
                    <Badge className={getEventTypeColor(selectedEvent.type)}>
                      {getEventTypeLabel(selectedEvent.type)}
                    </Badge>
                  </div>
                  <DialogDescription className="text-base sm:text-lg font-medium text-foreground">
                    {selectedEvent.date.toLocaleDateString('th-TH', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} at {selectedEvent.time}
                  </DialogDescription>
                </div>
              </DialogHeader>
              <div className="space-y-5 pt-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0">
                      <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Date & Time
                      </p>
                      <p className="text-sm sm:text-base font-medium text-foreground">
                        {selectedEvent.date.toLocaleDateString('th-TH', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          weekday: 'long'
                        })}
                      </p>
                      <p className="text-sm sm:text-base text-muted-foreground mt-1">
                        {selectedEvent.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0">
                      <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Location
                      </p>
                      <p className="text-sm sm:text-base font-medium text-foreground">
                        {selectedEvent.location}
                      </p>
                    </div>
                  </div>
                  {selectedEvent.attendees && (
                    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0">
                        <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Expected Attendees
                        </p>
                        <p className="text-sm sm:text-base font-medium text-foreground">
                          {selectedEvent.attendees} members
                        </p>
                      </div>
                    </div>
                  )}
                  {/* {selectedEvent.reminderEnabled && (
                    <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl border-2 border-green-200">
                      <div className="p-2 bg-green-100 rounded-lg border border-green-300 shrink-0">
                        <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-green-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-green-900 uppercase tracking-wide mb-1">
                          LINE Notify Reminder
                        </p>
                        <p className="text-sm sm:text-base font-medium text-green-900">
                          Members will receive automatic reminders
                        </p>
                      </div>
                    </div>
                  )} */}
                </div>
                {selectedEvent.description && (
                  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0">
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Description
                      </p>
                      <p className="text-sm sm:text-base text-foreground leading-relaxed">
                        {selectedEvent.description}
                      </p>
                    </div>
                  </div>
                )}
                {(user.role === "leader" || user.role === "admin") && (
                  <div className="flex flex-col gap-3 pt-6 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full h-11 sm:h-10 text-sm sm:text-base font-medium touch-manipulation"
                    >
                      Edit Event
                    </Button>
                    <Button 
                      variant="default"
                      className="w-full h-11 sm:h-10 text-sm sm:text-base font-medium touch-manipulation"
                      onClick={() => {
                        const eventId = selectedEvent.id;
                        setSelectedEvent(null);
                        navigate(`/qr-code/${eventId}`);
                      }}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Check-in Members
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full h-11 sm:h-10 text-sm sm:text-base font-medium touch-manipulation"
                    >
                      Send Reminder
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
