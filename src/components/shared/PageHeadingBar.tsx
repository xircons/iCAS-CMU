import React from "react";
import { cn } from "../ui/utils";
import { PageHeader } from "./PageHeader";

interface PageHeadingBarProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeadingBar({
  title,
  description,
  actions,
  className,
}: PageHeadingBarProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <PageHeader title={title} description={description} className="flex-1 min-w-0" />
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}
