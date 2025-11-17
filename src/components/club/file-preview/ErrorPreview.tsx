import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "../../ui/button";

interface ErrorPreviewProps {
  fileName?: string;
  error?: string;
  onRetry?: () => void;
}

export function ErrorPreview({ fileName, error, onRetry }: ErrorPreviewProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
      <AlertCircle className="h-16 w-16 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">Failed to load file</h3>
      {fileName && (
        <p className="text-muted-foreground text-sm mb-2">
          {fileName}
        </p>
      )}
      {error && (
        <p className="text-destructive text-sm mb-4 max-w-md text-center">
          {error}
        </p>
      )}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}

