import React from "react";
import { cn } from "../ui/utils";
import { PageContainer } from "./PageContainer";
import { PageHeader } from "./PageHeader";

interface PageChromeProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * PageChrome = PageContainer (shared padding + vertical rhythm) plus an optional
 * title/description/actions header row above children.
 */
export function PageChrome({
  title,
  description,
  actions,
  children,
  className,
}: PageChromeProps) {
  return (
    <PageContainer className={cn(className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4">
          {title && (
            <PageHeader
              title={title}
              description={description}
              className="flex-1 min-w-0"
            />
          )}
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </PageContainer>
  );
}
