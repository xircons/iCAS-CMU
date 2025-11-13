import React from "react";
import { Badge } from "../ui/badge";
import { STATUS_CONFIG, type StatusType } from "./utils";

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
  showIcon?: boolean;
  customLabel?: string;
}

export function StatusBadge({
  status,
  className,
  showIcon = true,
  customLabel,
}: StatusBadgeProps) {
  const statusKey = status.toLowerCase() as StatusType;
  const config = STATUS_CONFIG[statusKey];

  if (!config) {
    return (
      <Badge className={className} variant="outline">
        {customLabel || status}
      </Badge>
    );
  }

  const Icon = config.icon;

  return (
    <Badge className={`${config.className} ${className || ""}`}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {customLabel || config.label}
    </Badge>
  );
}

