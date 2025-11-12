import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { MonthCalendar } from "../MonthCalendar";
import { MonthCalendarNavigation } from "../MonthCalendarNavigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Plus, Calendar as CalendarIcon, Clock, MapPin, Users, Bell, QrCode, FileText, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useClub } from "../../contexts/ClubContext";
import { useUser } from "../../App";
import { eventApi, type Event, type EventStats } from "../../features/event/api/eventApi";
import { clubApi } from "../../features/club/api/clubApi";

export function ClubCalendarView() {
  const { club, clubId } = useClub();
  const { user } = useUser();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [clubMembers, setClubMembers] = useState<any[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Check if current user is a leader/admin of this club
  const isLeader = React.useMemo(() => {
    if (!user || !clubId) return false;
    if (user.role === "admin") return true;
    const membership = user.memberships?.find(m => 
      String(m.clubId) === String(clubId) && m.status === "approved"
    );
    return membership?.role === "leader" || club?.presidentId === parseInt(user.id);
  }, [user, clubId, club?.presidentId]);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    type: "" as Event["type"] | "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    description: "",
    reminderEnabled: true,
  });

  // Fetch club members to filter events (for both members and leaders)
  useEffect(() => {
    const fetchClubMembers = async () => {
      if (!clubId) return;
      try {
        const members = await clubApi.getClubMembers(clubId);
        setClubMembers(members);
      } catch (error) {
        console.error("Error fetching club members:", error);
      }
    };
    fetchClubMembers();
  }, [clubId]);

  // Fetch events and filter by club
  const fetchEvents = useCallback(async () => {
      if (!clubId) return;

      try {
      setLoading(true);
      // Get all events for user's clubs
        const allEvents = await eventApi.getEvents();
        
      // Get club member user IDs
      const memberUserIds = new Set<number>();
      if (clubMembers.length > 0) {
        clubMembers.forEach((member: any) => {
          const userId = member.userId || member.user?.id;
          if (userId) memberUserIds.add(userId);
        });
      } else {
        // If we haven't loaded members yet, fetch them (for both members and leaders)
        try {
          const members = await clubApi.getClubMembers(clubId);
          members.forEach((member: any) => {
            const userId = member.userId || member.user?.id;
            if (userId) memberUserIds.add(userId);
          });
          setClubMembers(members);
        } catch (error) {
          console.error("Error fetching members for filtering:", error);
        }
      }

      // Filter events: show events created by members of this club
        const clubEvents = allEvents.filter((event) => {
        return memberUserIds.has(event.createdBy);
        });
        
        setEvents(clubEvents);

      // Get stats (filtered by club events)
      try {
        const allStats = await eventApi.getEventStats();
        // Calculate stats for club events only
        const clubStats: EventStats = {
          eventsThisMonth: clubEvents.filter(e => {
            const eventDate = new Date(e.date);
            const now = new Date();
            return eventDate.getMonth() === now.getMonth() && 
                   eventDate.getFullYear() === now.getFullYear();
          }).length,
          daysUntilNextEvent: (() => {
            const upcoming = clubEvents
              .filter(e => new Date(e.date) >= new Date())
              .sort((a, b) => a.date.getTime() - b.date.getTime());
            if (upcoming.length === 0) return null;
            const nextEvent = upcoming[0];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const eventDate = new Date(nextEvent.date);
            eventDate.setHours(0, 0, 0, 0);
            const diffTime = eventDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
          })(),
          averageAttendance: clubEvents.length > 0
            ? Math.round(clubEvents.reduce((sum, e) => sum + (e.attendees || 0), 0) / clubEvents.length)
            : 0,
        };
        setStats(clubStats);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    } catch (error: any) {
      console.error("Failed to fetch events:", error);
      toast.error("ไม่สามารถโหลดข้อมูลกิจกรรมได้");
    } finally {
      setLoading(false);
    }
  }, [clubId, clubMembers, isLeader]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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
        return "การซ้อม";
      case "meeting":
        return "การประชุม";
      case "performance":
        return "การแสดง";
      case "workshop":
        return "เวิร์คช็อป";
      case "other":
        return "อื่นๆ";
      default:
        return type;
    }
  };

  // Filter events for selected date
  const selectedDateEvents = events.filter((event) => {
    if (!selectedDate) return false;
    const eventDate = new Date(event.date);
    return (
      eventDate.getDate() === selectedDate.getDate() &&
      eventDate.getMonth() === selectedDate.getMonth() &&
      eventDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  // Filter upcoming events only
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = events
    .filter((event) => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  // Check if event is past
  const isPastEvent = (event: Event): boolean => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  // Handle form submission for new event
  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.type || !formData.date || !formData.startTime || !formData.location) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      setSubmitting(true);
      
      // Format date to YYYY-MM-DD
      const dateObj = new Date(formData.date);
      const formattedDate = dateObj.toISOString().split('T')[0];
      
      // Format time: combine startTime and endTime if endTime exists
      const formattedTime = formData.endTime 
        ? `${formData.startTime.substring(0, 5)} - ${formData.endTime.substring(0, 5)}`
        : formData.startTime.substring(0, 5);

      await eventApi.createEvent({
        title: formData.title,
        type: formData.type as Event["type"],
        date: formattedDate,
        time: formattedTime,
        location: formData.location,
        description: formData.description || undefined,
        reminderEnabled: formData.reminderEnabled,
      });

      toast.success("สร้างกิจกรรมสำเร็จแล้ว!");
      
      // Reset form
      setFormData({
        title: "",
        type: "" as Event["type"] | "",
        date: "",
        startTime: "",
        endTime: "",
        location: "",
        description: "",
        reminderEnabled: true,
      });
      
      setIsNewEventOpen(false);
      await fetchEvents();
    } catch (error: any) {
      console.error("Failed to create event:", error);
      const errorMessage = error.response?.data?.message || error.message || "ไม่สามารถสร้างกิจกรรมได้";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit event
  const handleEditEvent = () => {
    if (!selectedEvent) return;
    
    // Parse time (could be "HH:mm" or "HH:mm - HH:mm")
    const timeParts = selectedEvent.time.split(' - ');
    const startTime = timeParts[0];
    const endTime = timeParts.length > 1 ? timeParts[1] : "";

    setFormData({
      title: selectedEvent.title,
      type: selectedEvent.type,
      date: selectedEvent.date.toISOString().split('T')[0],
      startTime: startTime.length === 5 ? startTime : startTime + ":00",
      endTime: endTime.length === 5 ? endTime : endTime ? endTime + ":00" : "",
      location: selectedEvent.location,
      description: selectedEvent.description || "",
      reminderEnabled: selectedEvent.reminderEnabled,
    });
    
    setIsEditEventOpen(true);
  };

  // Handle update event
  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEvent) return;
    if (!formData.title || !formData.type || !formData.date || !formData.startTime || !formData.location) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      setSubmitting(true);
      
      // Format date to YYYY-MM-DD
      const dateObj = new Date(formData.date);
      const formattedDate = dateObj.toISOString().split('T')[0];
      
      // Format time
      const formattedTime = formData.endTime 
        ? `${formData.startTime.substring(0, 5)} - ${formData.endTime.substring(0, 5)}`
        : formData.startTime.substring(0, 5);

      await eventApi.updateEvent(selectedEvent.id, {
        title: formData.title,
        type: formData.type as Event["type"],
        date: formattedDate,
        time: formattedTime,
        location: formData.location,
        description: formData.description || undefined,
        reminderEnabled: formData.reminderEnabled,
      });

      toast.success("อัปเดตกิจกรรมสำเร็จแล้ว!");
      setIsEditEventOpen(false);
      setSelectedEvent(null);
      await fetchEvents();
    } catch (error: any) {
      console.error("Failed to update event:", error);
      const errorMessage = error.response?.data?.message || error.message || "ไม่สามารถอัปเดตกิจกรรมได้";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete event
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรม "${selectedEvent.title}"?`)) {
      return;
    }

    try {
      setSubmitting(true);
      await eventApi.deleteEvent(selectedEvent.id);
      toast.success("ลบกิจกรรมสำเร็จแล้ว!");
      setSelectedEvent(null);
      await fetchEvents();
    } catch (error: any) {
      console.error("Failed to delete event:", error);
      const errorMessage = error.response?.data?.message || error.message || "ไม่สามารถลบกิจกรรมได้";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle send reminder
  const handleSendReminder = async () => {
    if (!selectedEvent) return;

    try {
      // TODO: Implement actual reminder API call
      // For now, just show a success message
      toast.success(`ส่งการแจ้งเตือนสำหรับ "${selectedEvent.title}" ไปยังสมาชิกทั้งหมดแล้ว`);
    } catch (error: any) {
      console.error("Failed to send reminder:", error);
      toast.error("ไม่สามารถส่งการแจ้งเตือนได้");
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 touch-auto" style={{ touchAction: 'manipulation' }}>
      {/* Header */}
      <div className="flex justify-between items-start">
      <div>
          <h1 className="mb-2 text-xl md:text-2xl">Calendar & Events</h1>
        <p className="text-sm md:text-base text-muted-foreground">
            {club?.name} - Schedule and manage club activities
          </p>
        </div>
        {isLeader && (
          <Dialog open={isNewEventOpen} onOpenChange={setIsNewEventOpen}>
            <DialogTrigger asChild>
              <Button className="touch-manipulation">
                <Plus className="h-4 w-4 mr-2" />
                <span>สร้างกิจกรรมใหม่</span>
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
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-type" className="text-sm">ประเภทกิจกรรม</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as Event["type"] })}
                    required
                    disabled={submitting}
                  >
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
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">เวลา</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="event-start-time" className="text-xs text-muted-foreground">เวลาเริ่มต้น</Label>
                        <Input
                          id="event-start-time"
                          type="time"
                          className="text-sm sm:text-base"
                          value={formData.startTime}
                          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                          required
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="event-end-time" className="text-xs text-muted-foreground">เวลาจบ (ไม่บังคับ)</Label>
                        <Input
                          id="event-end-time"
                          type="time"
                          className="text-sm sm:text-base"
                          value={formData.endTime}
                          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-location">สถานที่</Label>
                  <Input
                    id="event-location"
                    placeholder="กรอกสถานที่"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-description">คำอธิบาย</Label>
                  <Textarea
                    id="event-description"
                    placeholder="รายละเอียดและบันทึกกิจกรรม"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={submitting}
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="reminder" className="text-sm">เปิดการแจ้งเตือน LINE Notify</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      ส่งการแจ้งเตือนอัตโนมัติไปยังสมาชิกทั้งหมด
                    </p>
                  </div>
                  <Switch
                    id="reminder"
                    checked={formData.reminderEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, reminderEnabled: checked })}
                    disabled={submitting}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 w-full text-sm sm:text-base"
                    disabled={submitting}
                  >
                    {submitting ? "กำลังสร้าง..." : "สร้างกิจกรรม"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 w-full text-sm sm:text-base"
                    onClick={() => {
                      setIsNewEventOpen(false);
                      setFormData({
                        title: "",
                        type: "" as Event["type"] | "",
                        date: "",
                        startTime: "",
                        endTime: "",
                        location: "",
                        description: "",
                        reminderEnabled: true,
                      });
                    }}
                    disabled={submitting}
                  >
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
        <Card className="lg:col-span-2 gap-0">
          <CardHeader className="p-4 sm:p-6 pb-0">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-base sm:text-lg">ปฏิทินกิจกรรม</CardTitle>
                <CardDescription className="text-xs sm:text-sm">เลือกวันที่เพื่อดูกิจกรรมที่กำหนดไว้</CardDescription>
              </div>
              <MonthCalendarNavigation
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                onDateSelect={setSelectedDate}
              />
            </div>
          </CardHeader>
          <CardContent className="touch-manipulation p-4 sm:p-6 pt-0">
            <MonthCalendar 
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              events={events.map(event => ({
                id: event.id,
                date: event.date,
                type: event.type,
                title: event.title,
              }))}
              onMonthChange={setCurrentMonth}
              onDateSelect={setSelectedDate}
            />
            {selectedDateEvents.length > 0 && (
              <div className="mt-4 sm:mt-6 space-y-3">
                <h4 className="text-sm font-medium">
                  Events on {selectedDate?.toLocaleDateString('th-TH')}
                </h4>
                {selectedDateEvents.map((event) => {
                  const isPast = isPastEvent(event);
                  return (
                    <div
                      key={event.id}
                      className={`p-3 sm:p-4 border rounded-lg transition-colors cursor-pointer touch-manipulation ${
                        isPast 
                          ? "bg-gray-50 opacity-75 hover:bg-gray-100" 
                          : "hover:bg-slate-50"
                      }`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className={isPast ? "text-gray-600" : ""}>{event.title}</h4>
                        <Badge className={getEventTypeColor(event.type)}>
                          {getEventTypeLabel(event.type)}
                        </Badge>
                      </div>
                      <div className={`space-y-1 text-sm ${isPast ? "text-gray-500" : "text-muted-foreground"}`}>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>{event.location}</span>
                        </div>
                        {event.attendees != null && event.attendees > 0 && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span>{event.attendees} คน</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
          )}
        </CardContent>
      </Card>

        {/* Upcoming Events */}
        <div className="space-y-4 sm:space-y-6">
          <Card className="gap-0">
            <CardHeader className="p-4 sm:p-6 pb-0">
              <CardTitle className="text-base sm:text-lg">กิจกรรมที่กำลังจะมาถึง</CardTitle>
              <CardDescription className="text-xs sm:text-sm">กิจกรรม 5 รายการถัดไป</CardDescription>
        </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
              {loading ? (
                <div className="text-center text-sm text-muted-foreground py-4">กำลังโหลด...</div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-4">ไม่มีกิจกรรมที่กำลังจะมาถึง</div>
          ) : (
            <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="space-y-2 pb-4 border-b last:border-0 last:pb-0 cursor-pointer hover:opacity-80 transition-opacity touch-manipulation"
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
              )}
            </CardContent>
          </Card>

          <Card className="gap-0">
            <CardHeader className="p-4 sm:p-6 pb-0">
              <CardTitle className="text-base sm:text-lg">สถิติด่วน</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 space-y-4">
              {loading ? (
                <div className="text-center text-sm text-muted-foreground py-4">กำลังโหลด...</div>
              ) : stats ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl">{stats.eventsThisMonth}</p>
                    <p className="text-xs text-muted-foreground">Events scheduled</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Event</p>
                    <p className="text-2xl">
                      {stats.daysUntilNextEvent !== null ? `${stats.daysUntilNextEvent} days` : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">Until next activity</p>
                  </div>
                </>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-4">ไม่สามารถโหลดข้อมูลสถิติได้</div>
              )}
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
                  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
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
                        {selectedEvent.time.length === 5 && !selectedEvent.time.includes('-') && ' น.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
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
                  {selectedEvent.attendees != null && selectedEvent.attendees > 0 && (
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
                </div>
                {selectedEvent.description && (
                  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
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
                {isLeader && (
                  <div className="flex flex-col gap-3 pt-6 border-t">
                    {/* Row 1: Edit Event and Send Reminder */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        className="w-full h-11 sm:h-10 text-sm sm:text-base font-medium touch-manipulation"
                        onClick={handleEditEvent}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Event
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full h-11 sm:h-10 text-sm sm:text-base font-medium touch-manipulation"
                        onClick={handleSendReminder}
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        Send Reminder
                      </Button>
                    </div>
                    {/* Row 2: Check-in Members */}
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
                    {/* Row 3: Delete Event */}
                    <Button 
                      variant="destructive" 
                      className="w-full h-11 sm:h-10 text-sm sm:text-base font-medium touch-manipulation"
                      onClick={handleDeleteEvent}
                      disabled={submitting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Event
                    </Button>
                  </div>
                )}
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={isEditEventOpen} onOpenChange={setIsEditEventOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">แก้ไขกิจกรรม</DialogTitle>
            <DialogDescription className="text-sm">
              อัปเดตข้อมูลกิจกรรม
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateEvent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-event-title" className="text-sm">หัวข้อกิจกรรม</Label>
              <Input
                id="edit-event-title"
                placeholder="กรอกหัวข้อกิจกรรม"
                className="text-sm sm:text-base"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-event-type" className="text-sm">ประเภทกิจกรรม</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as Event["type"] })}
                required
                disabled={submitting}
              >
                <SelectTrigger id="edit-event-type" className="text-sm sm:text-base">
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
                <Label htmlFor="edit-event-date" className="text-sm">วันที่</Label>
                <Input
                  id="edit-event-date"
                  type="date"
                  className="text-sm sm:text-base"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">เวลา</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-event-start-time" className="text-xs text-muted-foreground">เวลาเริ่มต้น</Label>
                    <Input
                      id="edit-event-start-time"
                      type="time"
                      className="text-sm sm:text-base"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-event-end-time" className="text-xs text-muted-foreground">เวลาจบ (ไม่บังคับ)</Label>
                    <Input
                      id="edit-event-end-time"
                      type="time"
                      className="text-sm sm:text-base"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-event-location">สถานที่</Label>
              <Input
                id="edit-event-location"
                placeholder="กรอกสถานที่"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-event-description">คำอธิบาย</Label>
              <Textarea
                id="edit-event-description"
                placeholder="รายละเอียดและบันทึกกิจกรรม"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="edit-reminder" className="text-sm">เปิดการแจ้งเตือน LINE Notify</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  ส่งการแจ้งเตือนอัตโนมัติไปยังสมาชิกทั้งหมด
                </p>
              </div>
              <Switch
                id="edit-reminder"
                checked={formData.reminderEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, reminderEnabled: checked })}
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                type="submit"
                className="flex-1 w-full text-sm sm:text-base"
                disabled={submitting}
              >
                {submitting ? "กำลังอัปเดต..." : "อัปเดตกิจกรรม"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 w-full text-sm sm:text-base"
                onClick={() => {
                  setIsEditEventOpen(false);
                  setSelectedEvent(null);
                }}
                disabled={submitting}
              >
                ยกเลิก
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
