import { useState, createContext, useContext, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
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
import { Toaster } from "./components/ui/sonner";
import { getToken, clearToken } from "./features/auth/hooks/useAuth";
import { authApi } from "./features/auth/api/authApi";

export type UserRole = "member" | "leader" | "admin";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  major: string;
  role: UserRole;
  clubId?: string;
  clubName?: string;
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
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: UserRole[] }) {
  const { user } = useUser();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Layout Component
function AppLayout() {
  const { user, setUser } = useUser();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    setUser(null);
    navigate("/login");
  };

  if (!user) {
    return <Navigate to="/login" replace />;
    }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar 
          user={user}
          onLogout={handleLogout}
        />
        <main 
          className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50" 
          style={{ paddingLeft: isMobile ? '3rem' : '0', minWidth: 0 }}
        >
          <Routes>
            {/* Admin Routes */}
            <Route 
              path="/create-clubs" 
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <CreateClubsView user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manage-owners" 
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ManageClubOwnersView user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user-oversight" 
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <LeaderUserOversightView user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/assignments" 
              element={
                user.role === "admin" ? (
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AssignmentCenterView user={user} />
                  </ProtectedRoute>
                ) : user.role === "leader" ? (
                  <ProtectedRoute allowedRoles={["leader"]}>
                    <LeaderAssignmentsView user={user} />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } 
            />
            <Route 
              path="/report-inbox" 
              element={
                <ProtectedRoute allowedRoles={["leader", "admin"]}>
                  <ReportInboxView user={user} />
                </ProtectedRoute>
              } 
            />

            {/* Leader Routes */}
            <Route 
              path="/budget" 
              element={
                <ProtectedRoute allowedRoles={["leader"]}>
                  <BudgetManagementView user={user} />
                </ProtectedRoute>
              } 
            />

            {/* Common Routes */}
            <Route path="/dashboard" element={<DashboardView user={user} />} />
            <Route path="/calendar" element={<CalendarView user={user} />} />
            <Route path="/clubs" element={
              user.role === "leader" ? (
                <ClubLeaderView user={user} />
              ) : (
                <JoinClubsView user={user} />
              )
            } />
            <Route path="/report" element={<ReportView user={user} />} />
            <Route path="/feedback" element={<FeedbackView user={user} />} />
            <Route 
              path="/check-in" 
              element={
                <ProtectedRoute allowedRoles={["member"]}>
                  <CheckInView user={user} />
                </ProtectedRoute>
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
      try {
        const token = getToken();
        if (token) {
          const response = await authApi.verify(token);
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
          });
        }
      } catch (error) {
        // Token is invalid or expired, clear it
        clearToken();
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
    <UserContext.Provider value={{ user, setUser }}>
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
  );
}

export default App;
