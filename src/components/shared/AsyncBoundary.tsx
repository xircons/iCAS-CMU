import React from "react";
import { AlertCircle } from "lucide-react";
import { LoadingSpinner } from "./LoadingSpinner";
import { cn } from "../ui/utils";

interface AsyncBoundaryProps {
  loading?: boolean;
  error?: string | null;
  /** When true, renders a full-page centered spinner. Default: inline (py-12). */
  fullPage?: boolean;
  loadingText?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standardized async state wrapper.
 * Shows a spinner while loading, an error strip on failure, and children otherwise.
 */
export function AsyncBoundary({
  loading,
  error,
  fullPage = false,
  loadingText,
  children,
  className,
}: AsyncBoundaryProps) {
  if (loading) {
    return (
      <div
        className={cn(
          fullPage && "flex min-h-[60vh] items-center justify-center",
          className
        )}
      >
        <LoadingSpinner size={fullPage ? "lg" : "md"} text={loadingText} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive",
          className
        )}
      >
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return <>{children}</>;
}
