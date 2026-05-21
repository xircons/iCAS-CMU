import React from "react";
import { cn } from "../ui/utils";

interface PageContainerProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standard club-style page inset (matches Assignments). Asymmetric padding comes
 * from `.page-shell-standard` in globals.css; many Tailwind spacing utilities are
 * not emitted in the bundled index.css, so JSX-only classes would no-op there.
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("page-shell-standard space-y-6", className)}>
      {children}
    </div>
  );
}
