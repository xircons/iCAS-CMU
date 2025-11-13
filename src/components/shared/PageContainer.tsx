import React from "react";
import { cn } from "../ui/utils";

interface PageContainerProps {
  children?: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("p-4 md:p-8 space-y-4 md:space-y-6", className)}>
      {children}
    </div>
  );
}

