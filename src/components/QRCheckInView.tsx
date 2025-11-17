import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { QrCode, CheckCircle, Wifi, WifiOff, Clock, Users, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import QRCodeReact from "react-qr-code";
import type { User } from "../App";
import { checkinApi, type CheckedInMember } from "../features/checkin/api/checkinApi";
import { useCheckInSocket } from "../features/checkin/hooks/useCheckInSocket";

interface QRCheckInViewProps {
  user: User;
}

export function QRCheckInView({ user }: QRCheckInViewProps) {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const parsedEventId = eventId ? parseInt(eventId, 10) : null;

  const [qrStartTime, setQRStartTime] = useState("");
  const [qrExpireTime, setQRExpireTime] = useState("");
  const [checkedInMembers, setCheckedInMembers] = useState<CheckedInMember[]>([]);
  const [qrCodeGenerated, setQrCodeGenerated] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [qrCodeStartTime, setQrCodeStartTime] = useState<Date | null>(null);
  const [qrCodeExpireTime, setQrCodeExpireTime] = useState<Date | null>(null);
  const [sessionPasscode, setSessionPasscode] = useState<string>("");
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // WebSocket hook for real-time updates
  const { isConnected, checkedInMembers: socketMembers, addMember, clearMembers } = useCheckInSocket(parsedEventId);

  // Update current time every second when QR check-in is active
  useEffect(() => {
    if (qrCodeGenerated && qrCodeExpireTime) {
      // Initialize current time immediately
      setCurrentTime(new Date());
      
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [qrCodeGenerated, qrCodeExpireTime]);

  // Load existing session and members when component mounts
  useEffect(() => {
    if (parsedEventId) {
      const loadData = async () => {
        await loadExistingSession(parsedEventId);
        await loadCheckedInMembers(parsedEventId);
      };
      loadData();
    }
  }, [parsedEventId]);

  // Sync WebSocket members with local state - merge new members from WebSocket
  useEffect(() => {
    // When WebSocket receives new members, merge them with existing list
    socketMembers.forEach((socketMember) => {
      setCheckedInMembers((prev) => {
        // Check if member already exists (prevent duplicates)
        const exists = prev.some((m) => m.userId === socketMember.userId);
        if (exists) return prev;
        return [socketMember, ...prev];
      });
    });
  }, [socketMembers]);

  const loadExistingSession = async (eventId: number) => {
    try {
      const response = await checkinApi.getCheckInSession(eventId);
      if (response.data) {
        // Session exists, restore it
        setSessionPasscode(response.data.passcode);
        setQrCodeData(response.data.qrCodeData);
        // Parse expiration time - ensure it's a proper Date object
        const expireTime = new Date(response.data.expiresAt);
        if (isNaN(expireTime.getTime())) {
          console.error('Invalid expiration time:', response.data.expiresAt);
          setQrCodeGenerated(false);
          return;
        }
        setQrCodeExpireTime(expireTime);
        // Initialize current time for timer calculation
        setCurrentTime(new Date());
        setQrCodeGenerated(true);
      } else {
        // No active session, reset state
        setQrCodeGenerated(false);
        setSessionPasscode("");
        setQrCodeData("");
        setQrCodeExpireTime(null);
        setQrCodeStartTime(null);
      }
    } catch (error: any) {
      console.error('Failed to load existing session:', error);
      // If error, assume no session exists
      setQrCodeGenerated(false);
      setSessionPasscode("");
      setQrCodeData("");
      setQrCodeExpireTime(null);
      setQrCodeStartTime(null);
    }
  };

  const loadCheckedInMembers = async (eventId?: number) => {
    const targetEventId = eventId || parsedEventId;
    if (!targetEventId) return;
    try {
      const response = await checkinApi.getCheckedInMembers(targetEventId);
      setCheckedInMembers(response.data.members);
    } catch (error: any) {
      console.error('Failed to load checked-in members:', error);
    }
  };

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!qrCodeExpireTime) return null;
    
    // Use current time and expiration time
    const now = currentTime.getTime();
    const expire = qrCodeExpireTime.getTime();
    
    // Validate dates
    if (isNaN(now) || isNaN(expire)) {
      console.error('Invalid date in timer calculation', { now, expire, currentTime, qrCodeExpireTime });
      return null;
    }
    
    const remaining = expire - now;
    
    if (remaining <= 0) return { expired: true, minutes: 0, seconds: 0 };
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return { expired: false, minutes, seconds };
  };

  const handleEndCheckIn = async () => {
    if (!parsedEventId) return;
    try {
      await checkinApi.endCheckInSession(parsedEventId);
      toast.success(`Check-in completed! ${checkedInMembers.length} members attended.`);
      navigate("/calendar");
    } catch (error: any) {
      toast.error(error.message || "Failed to end check-in session");
    }
  };

  if (!parsedEventId) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => navigate("/calendar")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calendar
          </Button>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Invalid event ID</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-8 space-y-4 md:space-y-6 touch-auto" style={{ touchAction: 'manipulation' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex-1">
          <Button variant="ghost" onClick={() => navigate("/calendar")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calendar
          </Button>
          <h1 className="text-xl sm:text-2xl mb-2">เช็คอินด้วย QR Code</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            สร้าง QR code สำหรับสมาชิกเช็คอินเข้าร่วมกิจกรรม
          </p>
        </div>
      </div>

        {/* QR Settings - Only shown before generation */}
        {!qrCodeGenerated && (
          <div className="bg-white rounded-lg border p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time" className="text-sm">เวลาเริ่มต้น (ไม่บังคับ)</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={qrStartTime}
                  onChange={(e) => setQRStartTime(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expire-time" className="text-sm">เวลาหมดอายุ (ไม่บังคับ)</Label>
                <Input
                  id="expire-time"
                  type="time"
                  value={qrExpireTime}
                  onChange={(e) => setQRExpireTime(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            <Button
              className="w-full h-10 sm:h-11 text-sm sm:text-base"
              onClick={async () => {
                if (!parsedEventId) return;
                setIsLoadingSession(true);
                try {
                  const response = await checkinApi.startCheckInSession(parsedEventId);
                  setSessionPasscode(response.data.passcode);
                  setQrCodeData(response.data.qrCodeData);
                  
                  // Parse expiration time - ensure it's a proper Date object
                  const expireTime = new Date(response.data.expiresAt);
                  if (isNaN(expireTime.getTime())) {
                    toast.error("Invalid expiration time received from server");
                    return;
                  }
                  setQrCodeExpireTime(expireTime);
                  setQrCodeStartTime(new Date());
                  // Initialize current time for timer calculation
                  setCurrentTime(new Date());
                  setQrCodeGenerated(true);
                  // Clear local member list and reload from API after creating new session
                  setCheckedInMembers([]);
                  clearMembers(); // Also clear WebSocket hook's state
                  await loadCheckedInMembers(parsedEventId);
                  toast.success("Check-in session started successfully!");
                } catch (error: any) {
                  toast.error(error.message || "Failed to start check-in session");
                } finally {
                  setIsLoadingSession(false);
                }
              }}
              disabled={isLoadingSession}
            >
              <QrCode className="h-4 w-4 mr-2" />
              {isLoadingSession ? "กำลังสร้าง..." : "สร้าง QR Code และ Passcode"}
            </Button>
          </div>
        )}

        {/* QR Code and Member List - Only shown after generation */}
        {qrCodeGenerated && (
          <>
            <Separator className="my-4 sm:my-6" />
            {/* Connection Status */}
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm px-2 mb-4 mt-4">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 mt-8 sm:h-4 sm:w-4 text-green-600" />
                  <span className="text-green-600">เชื่อมต่อเรียบร้อย - อัปเดตแบบเรียลไทม์</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mt-8 sm:h-4 sm:w-4 text-red-600" />
                  <span className="text-red-600">ไม่สามารถเชื่อมต่อได้ - กำลังโหลดข้อมูลใหม่</span>
                </>
              )}
            </div>
            {/* Time Count Display */}
            <div className="text-center py-2 sm:py-3 bg-slate-50 rounded-lg border mb-4">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                {(() => {
                  const timeRemaining = getTimeRemaining();
                  if (!timeRemaining) {
                    return (
                      <span className="text-base sm:text-lg font-semibold">
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
                      <span className="text-base sm:text-lg font-semibold text-red-600">
                        หมดเวลาแล้ว
                      </span>
                    );
                  }
                  return (
                    <span className="text-base sm:text-lg font-semibold">
                      เหลือเวลา: {String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
                    </span>
                  );
                })()}
              </div>
            </div>
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              {/* QR Code and Passcode Section */}
              <div className="space-y-3 sm:space-y-4 order-1 shrink-0">
                <div className="text-center">
                  <div className="flex justify-center">
                    <div className="inline-block p-2 sm:p-3 md:p-4 lg:p-6 bg-white border-2 rounded-lg w-[160px] sm:w-[160px] md:w-[180px] lg:w-[220px] box-border">
                      <div className="w-full aspect-square flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
                        <QRCodeReact
                          value={qrCodeData}
                          size={220}
                          level="H"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Passcode Display */}
                <div className="space-y-2">
                  <div className="text-center">
                    <div className="flex justify-center">
                      <div className="inline-block px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4 lg:py-5 bg-slate-100 rounded-lg border-2 border-dashed w-[160px] sm:w-[160px] md:w-[180px] lg:w-[220px] box-border">
                        <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-widest text-slate-900">
                          {sessionPasscode}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checked-in Members List */}
              <div className="space-y-3 sm:space-y-4 order-2 flex flex-col">
                <div className="flex items-center justify-between shrink-0">
                  <h4 className="text-xs sm:text-sm md:text-base font-medium">สมาชิกที่เช็คอินแล้ว</h4>
                  <Badge variant="secondary" className="text-xs">{checkedInMembers.length}</Badge>
                </div>
                <div className="border rounded-lg h-[180px] sm:h-[220px] md:h-[280px] lg:h-auto lg:flex-1 lg:max-h-none overflow-y-auto bg-slate-50 custom-scrollbar touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {checkedInMembers.length === 0 ? (
                    <div className="p-4 sm:p-6 md:p-8 text-center text-muted-foreground">
                      <Users className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-xs sm:text-sm">ยังไม่มีสมาชิกเช็คอิน</p>
                      <p className="text-xs mt-1">สมาชิกจะปรากฏที่นี่หลังจากเช็คอิน</p>
                    </div>
                  ) : (
                    <div className="divide-y bg-white">
                      {checkedInMembers.map((member) => (
                        <div key={member.userId} className="p-2 sm:p-2.5 md:p-3 flex items-center justify-between hover:bg-slate-50 transition-colors gap-2">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(member.checkInTime).toLocaleString('th-TH', { 
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`shrink-0 ${
                              member.method === 'qr' 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {member.method === 'qr' ? 'QR' : 'Passcode'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <Button
                className="flex-1 w-full text-sm sm:text-base h-10 sm:h-11"
                onClick={handleEndCheckIn}
                disabled={!qrCodeGenerated}
              >
                เสร็จสิ้นการเช็คอิน
              </Button>
              <Button
                variant="outline"
                className="flex-1 w-full text-sm sm:text-base h-10 sm:h-11"
                onClick={() => navigate("/calendar")}
              >
                ยกเลิก
              </Button>
            </div>
          </>
        )}
    </div>
  );
}

