import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { assignmentApi, AssignmentSubmission } from "../../features/assignment/api/assignmentApi";
import { Download, FileText, ExternalLink } from "lucide-react";

interface FilePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: AssignmentSubmission;
}

export function FilePreview({ open, onOpenChange, submission }: FilePreviewProps) {
  const fileUrl = submission.filePath ? assignmentApi.getFileUrl(submission.filePath) : null;
  const isPdf = submission.fileMimeType?.includes('pdf');
  const isText = submission.submissionType === 'text';
  const isImage = submission.fileMimeType?.startsWith('image/');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isText ? 'Text Submission' : 'File Preview'}
          </DialogTitle>
          <DialogDescription>
            {isText 
              ? `Submission by ${submission.userFirstName} ${submission.userLastName}`
              : submission.fileName || 'File submission'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Text Submission */}
          {isText && submission.textContent && (
            <div className="p-6 bg-muted rounded-lg">
              <div 
                className="prose prose-sm md:prose-base max-w-none"
                dangerouslySetInnerHTML={{ __html: submission.textContent }}
              />
            </div>
          )}

          {/* PDF Preview */}
          {!isText && isPdf && fileUrl && (
            <div className="h-[70vh]">
              <iframe
                src={fileUrl}
                className="w-full h-full border rounded-lg"
                title="PDF Preview"
              />
            </div>
          )}

          {/* Image Preview */}
          {!isText && isImage && fileUrl && (
            <div className="flex items-center justify-center p-6">
              <img
                src={fileUrl}
                alt={submission.fileName || 'Image preview'}
                className="max-w-full max-h-[70vh] object-contain rounded-lg border"
              />
            </div>
          )}

          {/* Non-PDF, Non-Image File */}
          {!isText && !isPdf && !isImage && (
            <div className="py-12 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Preview not available for this file type
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                File: {submission.fileName}
              </p>
              {fileUrl && (
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => window.open(fileUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                  <Button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = fileUrl;
                      link.download = submission.fileName || 'file';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {submission.fileSize && (
              <span>Size: {(submission.fileSize / 1024 / 1024).toFixed(2)} MB</span>
            )}
          </div>
          <div className="flex gap-2">
            {!isText && fileUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = fileUrl;
                  link.download = submission.fileName || 'file';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

