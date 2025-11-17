import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { assignmentApi, AssignmentSubmission, AssignmentAttachment } from "../../features/assignment/api/assignmentApi";
import { Download, ExternalLink } from "lucide-react";
import { useFilePreviewDialog } from "../../hooks/useFilePreviewDialog";
import { getFileType, getFileTypeInfo, formatFileSize, canPreview } from "../../utils/fileUtils";
import { PdfPreview } from "./file-preview/PdfPreview";
import { ImagePreview } from "./file-preview/ImagePreview";
import { TextPreview } from "./file-preview/TextPreview";
import { UnsupportedPreview } from "./file-preview/UnsupportedPreview";
import { LoadingPreview } from "./file-preview/LoadingPreview";
import { ErrorPreview } from "./file-preview/ErrorPreview";

// Unified interface for file preview sources
export type FilePreviewSource = 
  | { type: 'submission'; data: AssignmentSubmission }
  | { type: 'attachment'; data: AssignmentAttachment };

interface FilePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: FilePreviewSource;
}

export function FilePreview({ open, onOpenChange, source }: FilePreviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Extract file information based on source type
  const fileInfo = useMemo(() => {
    if (source.type === 'submission') {
      const submission = source.data;
      return {
        fileUrl: submission.filePath ? assignmentApi.getFileUrl(submission.filePath) : null,
        fileName: submission.fileName,
        fileMimeType: submission.fileMimeType,
        fileSize: submission.fileSize,
        isText: submission.submissionType === 'text',
        textContent: submission.textContent,
        userFirstName: submission.userFirstName,
        userLastName: submission.userLastName,
      };
    } else {
      const attachment = source.data;
      return {
        fileUrl: assignmentApi.getFileUrl(attachment.filePath),
        fileName: attachment.fileName,
        fileMimeType: attachment.fileMimeType,
        fileSize: attachment.fileSize,
        isText: false,
        textContent: undefined,
        userFirstName: undefined,
        userLastName: undefined,
      };
    }
  }, [source]);

  const fileType = useMemo(() => getFileType(fileInfo.fileMimeType), [fileInfo.fileMimeType]);
  const fileTypeInfo = useMemo(() => getFileTypeInfo(fileInfo.fileMimeType), [fileInfo.fileMimeType]);
  const canPreviewFile = useMemo(() => {
    if (fileInfo.isText) return true;
    return canPreview(fileInfo.fileMimeType);
  }, [fileInfo.isText, fileInfo.fileMimeType]);

  // Dialog interaction handlers
  const { handleOpenChange, handleInteractOutside, handlePointerDownOutside, handleClose } = 
    useFilePreviewDialog(open, onOpenChange, {
      onClose: () => {
        setIsLoading(false);
        setError(null);
        setIsFullscreen(false);
      }
    });

  // Reset loading state when dialog opens or source changes
  useEffect(() => {
    if (open) {
      setIsLoading(false);
      setError(null);
    }
  }, [open, source]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!fileInfo.fileUrl) return;
    
    const link = document.createElement('a');
    link.href = fileInfo.fileUrl;
    link.download = fileInfo.fileName || 'file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [fileInfo.fileUrl, fileInfo.fileName]);

  // Handle open in new tab
  const handleOpenInTab = useCallback(() => {
    if (fileInfo.fileUrl) {
      window.open(fileInfo.fileUrl, '_blank');
    }
  }, [fileInfo.fileUrl]);

  // Handle fullscreen
  const handleFullscreen = useCallback(() => {
    setIsFullscreen(true);
    // TODO: Implement fullscreen mode
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC is handled by Dialog component
      // Add other shortcuts here if needed
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleClose]);

  // Render preview content
  const renderPreview = () => {
    // Text submission - no loading state needed
    if (fileInfo.isText && fileInfo.textContent) {
      return <TextPreview content={fileInfo.textContent} fileName={fileInfo.fileName} />;
    }

    // PDF preview - handles its own loading state
    if (fileType === 'pdf' && fileInfo.fileUrl) {
      return (
        <PdfPreview
          fileUrl={fileInfo.fileUrl}
          fileName={fileInfo.fileName}
          onFullscreen={handleFullscreen}
        />
      );
    }

    // Image preview - handles its own loading state
    if (fileType === 'image' && fileInfo.fileUrl) {
      return (
        <ImagePreview
          fileUrl={fileInfo.fileUrl}
          fileName={fileInfo.fileName}
          onFullscreen={handleFullscreen}
        />
      );
    }

    // Unsupported file type
    return (
      <UnsupportedPreview
        fileName={fileInfo.fileName}
        fileUrl={fileInfo.fileUrl}
        onDownload={handleDownload}
      />
    );
  };

  // Get dialog title
  const getDialogTitle = () => {
    if (fileInfo.isText) {
      return 'Text Submission';
    }
    return 'File Preview';
  };

  // Get dialog description
  const getDialogDescription = () => {
    if (fileInfo.isText) {
      const name = fileInfo.userFirstName || fileInfo.userLastName
        ? `${fileInfo.userFirstName || ''} ${fileInfo.userLastName || ''}`.trim()
        : 'User';
      return `Submission by ${name}`;
    }
    return fileInfo.fileName || 'File preview';
  };

  return (
    <Dialog 
      open={open} 
      modal={true}
      onOpenChange={handleOpenChange}
    >
      <DialogContent 
        className="max-w-[95vw] sm:max-w-7xl max-h-[95vh] overflow-hidden flex flex-col w-[95vw] sm:w-full"
        onInteractOutside={handleInteractOutside}
        onPointerDownOutside={handlePointerDownOutside}
        onEscapeKeyDown={() => {
          // Allow ESC to close
          handleClose();
        }}
        aria-describedby="file-preview-description"
      >
        <DialogHeader>
          <DialogTitle id="file-preview-title">
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription id="file-preview-description">
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        <div 
          className="flex-1 overflow-hidden min-h-0 flex flex-col"
          role="region"
          aria-label="File preview content"
          style={{ minHeight: '400px' }}
        >
          {renderPreview()}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center pt-4 border-t shrink-0 gap-2 sm:gap-0">
          <div className="text-xs sm:text-sm text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 sm:flex-1">
            {fileInfo.fileSize && (
              <span>Size: {formatFileSize(fileInfo.fileSize)}</span>
            )}
            {fileInfo.fileMimeType && (
              <span>Type: {fileTypeInfo.label}</span>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto sm:justify-end">
            {!fileInfo.isText && fileInfo.fileUrl && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenInTab}
                  aria-label="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Tab
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  aria-label="Download file"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClose}
              aria-label="Close dialog"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Convenience wrapper for submission preview (backward compatibility)
interface SubmissionPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: AssignmentSubmission;
}

export function SubmissionPreview({ open, onOpenChange, submission }: SubmissionPreviewProps) {
  return (
    <FilePreview
      open={open}
      onOpenChange={onOpenChange}
      source={{ type: 'submission', data: submission }}
    />
  );
}

// Convenience wrapper for attachment preview
interface AttachmentPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachment: AssignmentAttachment;
}

export function AttachmentPreview({ open, onOpenChange, attachment }: AttachmentPreviewProps) {
  return (
    <FilePreview
      open={open}
      onOpenChange={onOpenChange}
      source={{ type: 'attachment', data: attachment }}
    />
  );
}
