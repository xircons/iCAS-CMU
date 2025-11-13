import React from "react";
import { cn } from "../ui/utils";

interface PageSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageSection({ children, className }: PageSectionProps) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

