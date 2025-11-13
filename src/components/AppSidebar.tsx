import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  Building2,
  UserPlus,
  FileText,
  MessageSquare,
  LogOut,
  PlusCircle,
  UserCog,
  Inbox,
  Users,
  ClipboardList,
  QrCode,
} from "lucide-react";

// Logo path - files in public folder are served from root
const logoPath = "/logo/logopng.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "./ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage, getDiceBearAvatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Sheet, SheetContent } from "./ui/sheet";
import { useIsMobile } from "./ui/use-mobile";
import type { User } from "../App";

interface AppSidebarProps {
  user: User;
  onLogout: () => void;
}

// Helper function to get full name
const getUserFullName = (user: User): string => {
  return `${user.firstName} ${user.lastName}`;
};

// Helper function to get initials
const getUserInitials = (user: User): string => {
  const firstInitial = user.firstName.charAt(0);
  const lastInitial = user.lastName.charAt(0);
  return `${firstInitial}${lastInitial}`;
};

export const getMenuItemsForRole = (role: string) => {
  if (role === "member") {
    return [
      {
        id: "dashboard",
        path: "/dashboard",
        title: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "check-in",
        path: "/check-in",
        title: "Check In",
        icon: QrCode,
      },
      {
        id: "clubs",
        path: "/clubs",
        title: "Join Clubs",
        icon: UserPlus,
      },
      {
        id: "feedback",
        path: "/feedback",
        title: "Feedback",
        icon: MessageSquare,
      },
    ];
  }

  const commonItems = [
    {
      id: "dashboard",
      path: "/dashboard",
      title: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "calendar",
      path: "/calendar",
      title: "Calendar",
      icon: Calendar,
    },
  ];

  if (role === "leader") {
    return [
      {
        id: "dashboard",
        path: "/dashboard",
        title: "Dashboard",
        icon: LayoutDashboard,
      },
    ];
  }

  if (role === "admin") {
    return [
      {
        id: "create-clubs",
        path: "/create-clubs",
        title: "Create Clubs",
        icon: PlusCircle,
      },
      {
        id: "manage-owners",
        path: "/manage-owners",
        title: "Manage Club",
        icon: UserCog,
      },
      {
        id: "report-inbox",
        path: "/report-inbox",
        title: "Report Inbox",
        icon: Inbox,
      },
      {
        id: "user-oversight",
        path: "/user-oversight",
        title: "Leader & User Oversight",
        icon: Users,
      },
      {
        id: "assignments",
        path: "/assignments",
        title: "Assignment Center",
        icon: ClipboardList,
      },
    ];
  }

  return commonItems;
};

export function AppSidebar({ user, onLogout }: AppSidebarProps) {
  const isMobile = useIsMobile();
  const { openMobile, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  // Ensure Sheet is closed on desktop initially
  React.useEffect(() => {
    if (!isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  // Local state to control Sheet on desktop - explicitly start as false
  // Use a ref to track if we've initialized to prevent any initial open state
  const [desktopSheetOpen, setDesktopSheetOpen] = React.useState(false);
  const hasInitialized = React.useRef(false);
  
  // Ensure desktop Sheet stays closed when switching from mobile to desktop
  React.useEffect(() => {
    if (!isMobile && !hasInitialized.current) {
      setDesktopSheetOpen(false);
      hasInitialized.current = true;
    } else if (!isMobile) {
      setDesktopSheetOpen(false);
    }
  }, [isMobile]);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Super Admin";
      case "leader":
        return "Club Leader";
      case "member":
        return "Member";
      default:
        return "User";
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700";
      case "leader":
        return "bg-green-100 text-green-700";
      case "member":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const menuItems = getMenuItemsForRole(user.role);

  const handleIconClick = async (path: string) => {
    navigate(path);
    // Don't open expanded sidebar, just change view
  };

  const handleLinkClick = async (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    // No special handling needed - let the Link component handle navigation
  };

  // Mobile icon-only sidebar (always visible)
  if (isMobile) {
    return (
      <>
        {/* Icon-only sidebar - always visible on mobile */}
        <div className="fixed left-0 top-0 bottom-0 w-12 md:hidden bg-sidebar border-r border-sidebar-border z-20 flex flex-col">
          {/* Logo icon */}
          <div className="p-2 border-b border-sidebar-border flex items-center justify-center">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setOpenMobile(true)}
                    className="w-full flex items-center justify-center hover:bg-sidebar-accent rounded transition-colors"
                  >
                    <img 
                      src={logoPath} 
                      alt="iCAS-CMU HUB" 
                      className="h-8 w-8 object-contain"
                      loading="eager"
                      onError={(e) => {
                        // Fallback: show text if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.logo-fallback')) {
                          const fallback = document.createElement('span');
                          fallback.className = 'logo-fallback text-xs font-bold text-sidebar-foreground';
                          fallback.textContent = 'iCAS';
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Open Menu</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Navigation icons */}
          <div className="flex-1 overflow-y-auto py-2">
            <TooltipProvider delayDuration={0}>
              {menuItems.map((item) => (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleIconClick(item.path)}
                      className={`w-full p-3 flex items-center justify-center transition-colors ${
                        location.pathname === item.path
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.title}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>

          {/* User avatar icon */}
          <div className="p-2 border-t border-sidebar-border">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setOpenMobile(true)}
                    className="w-full flex items-center justify-center"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar || getDiceBearAvatar(getUserFullName(user))} />
                      <AvatarFallback className="text-xs">{getUserInitials(user)}</AvatarFallback>
                    </Avatar>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{getUserFullName(user)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Full sidebar overlay (expanded on icon click) */}
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent side="left" className="w-[18rem] p-0 bg-sidebar text-sidebar-foreground">
            <div className="flex h-full w-full flex-col">
              <SidebarHeader className="border-b p-4">
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <Link 
                      to="/dashboard"
                      onClick={() => setOpenMobile(false)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <img 
                        src={logoPath} 
                        alt="iCAS-CMU HUB" 
                        className="h-12 w-auto object-contain"
                        loading="eager"
                        onError={(e) => {
                          // Fallback: show text if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.logo-fallback')) {
                            const fallback = document.createElement('span');
                            fallback.className = 'logo-fallback text-sm font-bold text-sidebar-foreground';
                            fallback.textContent = 'iCAS-CMU HUB';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </Link>
                  </div>
                </div>
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {menuItems.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            asChild
                            isActive={location.pathname === item.path || (user.role === 'leader' && item.path === '/dashboard' && location.pathname.startsWith('/club/'))}
                          >
                            <Link 
                              to={item.path} 
                              onClick={(e) => {
                                handleLinkClick(e, item.path);
                                setOpenMobile(false);
                              }}
                            >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter className="border-t p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar || getDiceBearAvatar(getUserFullName(user))} />
                    <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{getUserFullName(user)}</p>
                    <div className={`inline-block px-2 py-0.5 rounded text-xs mt-1 ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </div>
                    {user.clubName && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {user.clubName}
                      </p>
                    )}
                  </div>
                </div>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onLogout();
                    setOpenMobile(false);
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </SidebarFooter>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop sidebar (icon-only, like mobile)
  return (
    <>
      {/* Icon-only sidebar - always visible on desktop */}
      <div className="fixed left-0 top-0 bottom-0 w-12 hidden md:flex bg-sidebar border-r border-sidebar-border z-20 flex-col">
        {/* Logo icon */}
        <div className="p-2 border-b border-sidebar-border flex items-center justify-center">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setDesktopSheetOpen(true);
                  }}
                  className="w-full flex items-center justify-center hover:bg-sidebar-accent rounded transition-colors"
                >
                  <img 
                    src="/logo/logopng.png" 
                    alt="iCAS-CMU HUB" 
                    className="h-8 w-8 object-contain"
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Open Menu</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Navigation icons */}
        <div className="flex-1 overflow-y-auto py-2">
          <TooltipProvider delayDuration={0}>
            {menuItems.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleIconClick(item.path)}
                    className={`w-full p-3 flex items-center justify-center transition-colors ${
                      location.pathname === item.path
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.title}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        {/* User avatar icon */}
        <div className="p-2 border-t border-sidebar-border">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setDesktopSheetOpen(true);
                  }}
                  className="w-full flex items-center justify-center"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar || getDiceBearAvatar(getUserFullName(user))} />
                    <AvatarFallback className="text-xs">{getUserInitials(user)}</AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{getUserFullName(user)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Full sidebar overlay (expanded on icon click) - only render on desktop */}
      {isMobile === false && (
        <Sheet open={desktopSheetOpen} onOpenChange={setDesktopSheetOpen}>
        <SheetContent 
          side="left" 
          className="w-[18rem] md:w-[25rem] md:max-w-none p-0 bg-sidebar text-sidebar-foreground"
          style={{ maxWidth: isMobile ? undefined : '25rem' }}
        >
          <div className="flex h-full w-full flex-col">
            <SidebarHeader className="border-b p-4">
              <div className="space-y-2">
                <div className="flex justify-center">
                  <Link 
                    to="/dashboard"
                    onClick={() => setDesktopSheetOpen(false)}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <img 
                      src="/logo/logopng.png" 
                      alt="iCAS-CMU HUB" 
                      className="h-12 w-auto object-contain"
                    />
                  </Link>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={location.pathname === item.path || (user.role === 'leader' && item.path === '/dashboard' && location.pathname.startsWith('/club/'))}
                        >
                          <Link 
                            to={item.path} 
                            onClick={(e) => {
                              handleLinkClick(e, item.path);
                              setDesktopSheetOpen(false);
                            }}
                          >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.avatar || getDiceBearAvatar(getUserFullName(user))} />
                  <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{getUserFullName(user)}</p>
                  <div className={`inline-block px-2 py-0.5 rounded text-xs mt-1 ${getRoleBadgeColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </div>
                  {user.clubName && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user.clubName}
                    </p>
                  )}
                </div>
              </div>
              <Separator />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  onLogout();
                  setDesktopSheetOpen(false);
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </SidebarFooter>
          </div>
        </SheetContent>
      </Sheet>
      )}
    </>
  );
}
