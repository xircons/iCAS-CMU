import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "../ui/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  iconClassName?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  iconClassName,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "text-center py-8 text-muted-foreground",
        className
      )}
    >
      <Icon className={cn("h-12 w-12 mx-auto mb-2 opacity-50", iconClassName)} />
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
    </div>
  );
}

