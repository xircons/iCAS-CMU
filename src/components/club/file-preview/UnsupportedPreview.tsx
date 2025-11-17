import React from "react";
import { FileText, ExternalLink, Download } from "lucide-react";
import { Button } from "../../ui/button";

interface UnsupportedPreviewProps {
  fileName?: string;
  fileUrl?: string | null;
  onDownload?: () => void;
}

export function UnsupportedPreview({ 
  fileName, 
  fileUrl, 
  onDownload 
}: UnsupportedPreviewProps) {
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenInTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
      <FileText className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
      <p className="text-muted-foreground mb-4 text-center">
        Preview not available for this file type
      </p>
      {fileName && (
        <p className="text-sm text-muted-foreground mb-6">
          File: {fileName}
        </p>
      )}
      {fileUrl && (
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            onClick={handleOpenInTab}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          <Button
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      )}
    </div>
  );
}

