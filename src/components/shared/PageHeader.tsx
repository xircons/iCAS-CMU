import React from "react";
import { cn } from "../ui/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function PageHeader({
  title,
  description,
  className,
  titleClassName,
  descriptionClassName,
}: PageHeaderProps) {
  return (
    <div className={cn("", className)}>
      <h1 className={cn("mb-2 text-xl md:text-2xl", titleClassName)}>
        {title}
      </h1>
      {description && (
        <p
          className={cn(
            "text-sm md:text-base text-muted-foreground",
            descriptionClassName
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}

