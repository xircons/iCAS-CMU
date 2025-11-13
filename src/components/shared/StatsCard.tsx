import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../ui/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  valueClassName?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function StatsCard({
  title,
  value,
  description,
  valueClassName,
  className,
  icon,
}: StatsCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs md:text-sm flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-xl md:text-2xl", valueClassName)}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

