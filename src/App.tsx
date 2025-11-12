import React, { useState, createContext, useContext, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { LoginHub } from "./components/LoginHub";
import { AppSidebar } from "./components/AppSidebar";
import { SidebarProvider } from "./components/ui/sidebar";
import { useIsMobile } from "./components/ui/use-mobile";
import { DashboardView } from "./components/DashboardView";
import { CalendarView } from "./components/CalendarView";
import { BudgetManagementView } from "./components/BudgetManagementView";
import { ClubManagementView } from "./components/ClubManagementView";
import { ClubLeaderView } from "./components/ClubLeaderView";
import { JoinClubsView } from "./components/JoinClubsView";
import { ReportView } from "./components/ReportView";
import { FeedbackView } from "./components/FeedbackView";
import { CreateClubsView } from "./components/CreateClubsView";
import { ManageClubOwnersView } from "./components/ManageClubOwnersView";
import { ReportInboxView } from "./components/ReportInboxView";
import { LeaderUserOversightView } from "./components/LeaderUserOversightView";
import { AssignmentCenterView } from "./components/AssignmentCenterView";
import { LeaderAssignmentsView } from "./components/LeaderAssignmentsView";
import { CheckInView } from "./components/CheckInView";
import { QRCheckInView } from "./components/QRCheckInView";
import { ClubSidebar } from "./components/ClubSidebar";
import { ClubProvider } from "./contexts/ClubContext";
import { ClubHomeView } from "./components/club/ClubHomeView";
import { ClubAssignmentsView } from "./components/club/ClubAssignmentsView";
import { AssignmentDetailView } from "./components/club/AssignmentDetailView";
import { MemberSubmissionDetailView } from "./components/club/MemberSubmissionDetailView";
import { ClubCalendarView } from "./components/club/ClubCalendarView";
import { ClubChatView } from "./components/club/ClubChatView";
import { ClubMembersView } from "./components/club/ClubMembersView";
import { Toaster } from "./components/ui/sonner";
import { authApi } from "./features/auth/api/authApi";
import { disconnectSocket } from "./config/websocket";
import { toast } from "sonner";
import { WebSocketProvider, useWebSocket } from "./contexts/WebSocketContext";
import { useAuth } from "./features/auth/hooks/useAuth";
import { getMenuItemsForRole } from "./components/AppSidebar";

export type UserRole = "member" | "leader" | "admin";

export interface ClubMembership {
  id: number;
  clubId: number;
  clubName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'left';
  role?: 'member' | 'staff' | 'leader';
  requestDate: string;
  approvedDate?: string;
  createdAt: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  major: string;
  role: UserRole;
  // Deprecated: kept for backward compatibility
  clubId?: string;
  clubName?: string;
  // New: multiple club memberships
  memberships?: ClubMembership[];
  avatar?: string;
  email: string;
}

// User Context
interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children?: React.ReactNode; allowedRoles?: UserRole[] }) {
  const { user } = useUser();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Sidebar Protected Route - Only allows routes that are in the user's sidebar
function SidebarProtectedRoute({ children, path }: { children?: React.ReactNode; path: string }) {
  const { user } = useUser();
  const location = useLocation();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Get allowed routes from sidebar
  const menuItems = getMenuItemsForRole(user.role);
  const allowedPaths = menuItems.map(item => item.path);
  
  // Check if the provided path is in the sidebar
  // Also allow club routes (they're in club sidebar, not main sidebar)
  const isClubRoute = location.pathname.startsWith('/club/');
  const isAllowed = allowedPaths.includes(path) || isClubRoute;
  
  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Layout Component
function AppLayout() {
  const { user, setUser } = useUser();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    disconnectSocket();
  };

  if (!user) {
    return <Navigate to="/login" replace />;
    }

  // Check if we're on a club route
  const isClubRoute = location.pathname.startsWith('/club/');

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Hide main sidebar on mobile when on club routes */}
        {!(isMobile && isClubRoute) && (
          <AppSidebar 
            user={user}
            onLogout={handleLogout}
          />
        )}
        {isClubRoute && (
          <ClubProvider>
            <ClubSidebar />
          </ClubProvider>
        )}
        <main 
          className={`flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 ${
            isMobile 
              ? '' 
              : isClubRoute 
                ? 'md:ml-[16.5rem] lg:ml-[18.5rem] xl:ml-[20.5rem]'
                : ''
          }`}
          style={{ 
            minWidth: 0,
            ...(isMobile 
              ? { marginLeft: '3rem' }
              : isClubRoute 
                ? { marginLeft: '16.5rem' }
                : { marginLeft: '3rem' }
            )
          }}
        >
          <Routes>
            {/* Admin Routes */}
            <Route 
              path="/create-clubs" 
              element={
                <SidebarProtectedRoute path="/create-clubs">
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <CreateClubsView user={user} />
                  </ProtectedRoute>
                </SidebarProtectedRoute>
              } 
            />
            <Route 
              path="/manage-owners" 
              element={
                <SidebarProtectedRoute path="/manage-owners">
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <ManageClubOwnersView user={user} />
                  </ProtectedRoute>
                </SidebarProtectedRoute>
              } 
            />
            <Route 
              path="/user-oversight" 
              element={
                <SidebarProtectedRoute path="/user-oversight">
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <LeaderUserOversightView user={user} />
                  </ProtectedRoute>
                </SidebarProtectedRoute>
              } 
            />
            <Route 
              path="/assignments" 
              element={
                user.role === "admin" ? (
                  <SidebarProtectedRoute path="/assignments">
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AssignmentCenterView user={user} />
                    </ProtectedRoute>
                  </SidebarProtectedRoute>
                ) : user.role === "leader" ? (
                  <SidebarProtectedRoute path="/assignments">
                    <ProtectedRoute allowedRoles={["leader"]}>
                      <LeaderAssignmentsView user={user} />
                    </ProtectedRoute>
                  </SidebarProtectedRoute>
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } 
            />
            <Route 
              path="/report-inbox" 
              element={
                <SidebarProtectedRoute path="/report-inbox">
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <ReportInboxView user={user} />
                  </ProtectedRoute>
                </SidebarProtectedRoute>
              } 
            />

            {/* Leader Routes */}
            <Route 
              path="/budget" 
              element={
                <SidebarProtectedRoute path="/budget">
                  <ProtectedRoute allowedRoles={["leader"]}>
                    <BudgetManagementView user={user} />
                  </ProtectedRoute>
                </SidebarProtectedRoute>
              } 
            />

            {/* Common Routes */}
            <Route path="/dashboard" element={<DashboardView user={user} onUserUpdate={setUser} />} />
            <Route 
              path="/calendar" 
              element={
                <SidebarProtectedRoute path="/calendar">
                  <CalendarView user={user} />
                </SidebarProtectedRoute>
              } 
            />
            <Route 
              path="/clubs" 
              element={
                <SidebarProtectedRoute path="/clubs">
                  {user.role === "leader" ? (
                    <ClubLeaderView user={user} />
                  ) : (
                    <JoinClubsView user={user} />
                  )}
                </SidebarProtectedRoute>
              } 
            />
            <Route 
              path="/report" 
              element={
                <SidebarProtectedRoute path="/report">
                  <ReportView user={user} />
                </SidebarProtectedRoute>
              } 
            />
            <Route 
              path="/feedback" 
              element={
                <SidebarProtectedRoute path="/feedback">
                  <FeedbackView user={user} />
                </SidebarProtectedRoute>
              } 
            />
            <Route 
              path="/check-in" 
              element={
                <SidebarProtectedRoute path="/check-in">
                  <ProtectedRoute allowedRoles={["member"]}>
                    <CheckInView user={user} />
                  </ProtectedRoute>
                </SidebarProtectedRoute>
              } 
            />
            <Route 
              path="/qr-code/:eventId" 
              element={
                <ProtectedRoute allowedRoles={["leader", "admin"]}>
                  <QRCheckInView user={user} />
                </ProtectedRoute>
              } 
            />

            {/* Club Routes */}
            <Route 
              path="/club/:clubId" 
              element={<Navigate to="home" replace />} 
            />
            <Route 
              path="/club/:clubId/home" 
              element={
                <ClubProvider>
                  <ClubHomeView />
                </ClubProvider>
              } 
            />
            <Route 
              path="/club/:clubId/assignments" 
              element={
                <ClubProvider>
                  <ClubAssignmentsView />
                </ClubProvider>
              } 
            />
            <Route 
              path="/club/:clubId/assignment/:assignmentId" 
              element={
                <ClubProvider>
                  <AssignmentDetailView />
                </ClubProvider>
              } 
            />
            <Route 
              path="/club/:clubId/assignment/:assignmentId/submission/:submissionId" 
              element={
                <ClubProvider>
                  <MemberSubmissionDetailView />
                </ClubProvider>
              } 
            />
            <Route 
              path="/club/:clubId/calendar" 
              element={
                <ClubProvider>
                  <ClubCalendarView />
                </ClubProvider>
              } 
            />
            <Route 
              path="/club/:clubId/chat" 
              element={
                <ClubProvider>
                  <ClubChatView />
                </ClubProvider>
              } 
            />
            <Route 
              path="/club/:clubId/members" 
              element={
                <ClubProvider>
                  <ClubMembersView />
                </ClubProvider>
              } 
            />
            <Route 
              path="/club/:clubId/budget" 
              element={
                <ClubProvider>
                  <BudgetManagementView user={user} />
                </ClubProvider>
              } 
            />
            <Route 
              path="/club/:clubId/report" 
              element={
                <ClubProvider>
                  <ReportView user={user} />
                </ClubProvider>
              } 
            />

            {/* Default redirect based on role */}
            <Route 
              path="/" 
              element={
                user.role === "admin" ? (
                  <Navigate to="/create-clubs" replace />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } 
            />
          </Routes>
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set default view based on role after login
  const getDefaultPath = (role: UserRole) => {
    if (role === "admin") return "/create-clubs";
    return "/dashboard";
  };

  // Verify token on app load
  useEffect(() => {
    const verifyTokenOnLoad = async () => {
      // Create a timeout promise that rejects after 2 seconds for faster failure
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auth check timeout')), 2000);
      });

      try {
        // Race between API call and timeout - fail fast if no response
        const response = await Promise.race([
          authApi.getMe(),
          timeoutPromise
        ]) as any;
        
        setUser({
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
      } catch (error: any) {
        // Any error (401, timeout, network) - set user to null and redirect immediately
        disconnectSocket();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyTokenOnLoad();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <WebSocketProvider enabled={!!user}>
      <UserContext.Provider value={{ user, setUser }}>
        <UserRoleUpdateListener user={user} setUser={setUser} />
        <Routes>
          <Route 
            path="/login" 
            element={
              user ? (
                <Navigate to={getDefaultPath(user.role)} replace />
              ) : (
                <LoginHub />
              )
            } 
          />
          <Route 
            path="/*" 
            element={
              user ? (
                <AppLayout />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
        </Routes>
        <Toaster />
      </UserContext.Provider>
    </WebSocketProvider>
  );
}

// Component to listen for user role updates
function UserRoleUpdateListener({ user, setUser }: { user: User | null; setUser: (user: User | null) => void }) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribe('user-role-updated', async (data: { userId: number; newRole: string; message: string }) => {
      // Only handle if it's for the current user
      if (data.userId !== parseInt(user.id)) return;
      
      try {
        // Refresh user data using getMe (cookies sent automatically)
        const response = await authApi.getMe();
        setUser({
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
        toast.success('บทบาทของคุณได้รับการอัปเดตแล้ว');
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    });

    return unsubscribe;
  }, [user, subscribe, setUser]);

  return null;
}

export default App;
