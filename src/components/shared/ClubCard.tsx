import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Users, Calendar, MapPin, LucideIcon } from "lucide-react";
import { cn } from "../ui/utils";
import { StatusBadge } from "./StatusBadge";

interface ClubCardProps {
  club: {
    id: number | string;
    name: string;
    category?: string;
    description?: string;
    logo?: string;
    memberCount?: number;
    meetingDay?: string;
    location?: string;
    status?: "active" | "pending" | "inactive";
    presidentName?: string;
    role?: string;
  };
  onClick?: () => void;
  actionButton?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: "default" | "outline" | "destructive" | "ghost" | "link";
    disabled?: boolean;
  };
  showStatus?: boolean;
  showRole?: boolean;
  className?: string;
}

export function ClubCard({
  club,
  onClick,
  actionButton,
  showStatus = false,
  showRole = false,
  className,
}: ClubCardProps) {
  const initials = club.name.substring(4, 6) || club.name.substring(0, 2);

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <Avatar className="h-12 w-12">
            <AvatarImage src={club.logo} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-end gap-2">
            {showStatus && club.status && (
              <StatusBadge status={club.status} />
            )}
            {showRole && club.role && (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                {club.role === "leader" ? "หัวหน้า" : "สมาชิก"}
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-base mt-3">{club.name}</CardTitle>
        {club.category && (
          <CardDescription>
            <Badge variant="outline" className="text-xs">
              {club.category}
            </Badge>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {club.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {club.description}
          </p>
        )}
        <div className="space-y-2 text-sm text-muted-foreground">
          {club.memberCount !== undefined && (
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3" />
              <span>{club.memberCount} {club.memberCount === 1 ? "คน" : "คน"}</span>
            </div>
          )}
          {club.meetingDay && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>{club.meetingDay}</span>
            </div>
          )}
          {club.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              <span>{club.location}</span>
            </div>
          )}
        </div>
        {actionButton && (
          <Button
            className="w-full mt-2"
            variant={actionButton.variant || "default"}
            onClick={(e) => {
              e.stopPropagation();
              actionButton.onClick();
            }}
            disabled={actionButton.disabled}
          >
            {actionButton.icon && (
              <actionButton.icon className="h-4 w-4 mr-2" />
            )}
            {actionButton.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

