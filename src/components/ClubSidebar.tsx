import React, { useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Home,
  ClipboardList,
  Calendar,
  MessageSquare,
  Users,
  ArrowLeft,
  Wallet,
  FileText,
} from "lucide-react";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "./ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage, getDiceBearAvatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { useClub } from "../contexts/ClubContext";
import { useIsMobile } from "./ui/use-mobile";
import { Sheet, SheetContent } from "./ui/sheet";
import { useState } from "react";
import { useUser } from "../App";

const getClubMenuItems = (isLeader: boolean, clubId: number) => {
  const baseItems = [
    {
      id: "home",
      path: "home",
      title: "Home",
      icon: Home,
      isExternal: false,
    },
    {
      id: "assignments",
      path: "assignments",
      title: "Assignments",
      icon: ClipboardList,
      isExternal: false,
    },
    {
      id: "calendar",
      path: "calendar",
      title: "Calendar",
      icon: Calendar,
      isExternal: false,
    },
    {
      id: "chat",
      path: "chat",
      title: "Chat",
      icon: MessageSquare,
      isExternal: false,
    },
    {
      id: "members",
      path: "members",
      title: "Member List",
      icon: Users,
      isExternal: false,
    },
  ];

  if (isLeader) {
    return [
      ...baseItems,
      {
        id: "smart-document",
        path: "budget",
        title: "Smart Document",
        icon: Wallet,
        isExternal: false,
      },
      {
        id: "summarize",
        path: "report",
        title: "Summarize",
        icon: FileText,
        isExternal: false,
      },
    ];
  }

  return baseItems;
};

export function ClubSidebar() {
  const { club, clubId, isLoading } = useClub();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = useState(false);

  // Don't render if we're not on a club route or clubId is not available
  if (!clubId && !isLoading) {
    return null;
  }

  // Extract clubId from pathname if not available yet
  const effectiveClubId = clubId || (() => {
    const match = location.pathname.match(/\/club\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  })();

  if (!effectiveClubId) {
    return null;
  }

  // Check if user is a leader of this club
  const isLeader = useMemo(() => {
    if (!user || !effectiveClubId) return false;
    if (user.role === 'admin') return true;
    const membership = user.memberships?.find(m => 
      String(m.clubId) === String(effectiveClubId) && m.status === 'approved'
    );
    return membership?.role === 'leader' || club?.presidentId === parseInt(user.id);
  }, [user, effectiveClubId, club?.presidentId]);

  const basePath = `/club/${effectiveClubId}`;
  const currentPath = location.pathname.replace(basePath, "").replace(/^\//, "") || "home";
  const clubMenuItems = getClubMenuItems(isLeader, effectiveClubId);

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const handleMenuItemClick = (item: typeof clubMenuItems[0]) => {
    if (item.isExternal) {
      navigate(item.path);
    } else {
      navigate(`/club/${effectiveClubId}/${item.path}`);
    }
    setOpenMobile(false);
  };

  // Mobile: icon-only sidebar with sheet overlay
  if (isMobile) {
    return (
      <>
        {/* Icon-only sidebar - always visible on mobile */}
        <div className="fixed left-[4rem] top-0 bottom-0 w-12 bg-sidebar border-r border-sidebar-border z-20 flex flex-col md:hidden">
          {/* Club logo/avatar */}
          <div className="p-2 border-b border-sidebar-border flex items-center justify-center">
            <Avatar className="h-8 w-8">
              <AvatarImage src={club?.logo} />
              <AvatarFallback>
                {club?.name?.substring(0, 2) || "CL"}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Navigation icons */}
          <div className="flex-1 overflow-y-auto py-2">
            {clubMenuItems.map((item) => {
              const isActive = item.isExternal 
                ? location.pathname === item.path
                : currentPath === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuItemClick(item)}
                  className={`w-full p-3 flex items-center justify-center transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Full sidebar overlay (expanded on icon click) */}
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent side="left" className="w-[18rem] p-0 bg-sidebar text-sidebar-foreground">
            <div className="flex h-full w-full flex-col">
              <SidebarHeader className="border-b p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={club?.logo} />
                      <AvatarFallback>
                        {club?.name?.substring(0, 2) || "CL"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{club?.name || "Club"}</p>
                    </div>
                  </div>
                </div>
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {clubMenuItems.map((item) => {
                        const isActive = item.isExternal 
                          ? location.pathname === item.path
                          : currentPath === item.path;
                        return (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              className={isActive ? "bg-gray-100 text-gray-900" : ""}
                            >
                              {item.isExternal ? (
                                <Link to={item.path} onClick={() => setOpenMobile(false)}>
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.title}</span>
                                </Link>
                              ) : (
                                <Link to={`/club/${effectiveClubId}/${item.path}`} onClick={() => setOpenMobile(false)}>
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.title}</span>
                                </Link>
                              )}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: full sidebar
  return (
    <div 
      style={{ position: 'fixed', left: '3rem', top: 0, bottom: 0, width: '18rem', backgroundColor: 'white' }} 
      className="hidden md:block border-r border-sidebar-border z-10 club-sidebar-enter"
    >
      <div className="flex h-full w-full flex-col">
        <div className="border-b p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={club?.logo} />
                <AvatarFallback>
                  {club?.name?.substring(0, 2) || "CL"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{club?.name || "Club"}</p>
                {club?.category && (
                  <p className="text-xs text-muted-foreground truncate">{club.category}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToDashboard}
              className="w-full justify-start"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-2">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-muted-foreground">Navigation</p>
            </div>
            <nav className="space-y-1">
              {clubMenuItems.map((item) => {
                const isActive = item.isExternal 
                  ? location.pathname === item.path
                  : currentPath === item.path;
                return item.isExternal ? (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                ) : (
                  <Link
                    key={item.id}
                    to={`/club/${effectiveClubId}/${item.path}`}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}

