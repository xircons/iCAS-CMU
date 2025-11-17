import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingPreviewProps {
  fileName?: string;
}

export function LoadingPreview({ fileName }: LoadingPreviewProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
      <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
      <p className="text-muted-foreground text-sm">
        Loading {fileName ? `"${fileName}"` : 'file'}...
      </p>
    </div>
  );
}

