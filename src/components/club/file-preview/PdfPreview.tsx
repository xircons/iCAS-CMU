import React, { useState, useCallback, useRef } from "react";
import { ZoomIn, ZoomOut, Maximize2, RotateCw } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";

interface PdfPreviewProps {
  fileUrl: string;
  fileName?: string;
  onFullscreen?: () => void;
}

export function PdfPreview({ fileUrl, fileName, onFullscreen }: PdfPreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset loading state when fileUrl changes
  React.useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Fallback timeout - if PDF doesn't load in 5 seconds, hide loading (PDF might still be loading in background)
    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fileUrl]);

  const handleLoad = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLoading(false);
    setError('Failed to load PDF');
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 50));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(100);
  }, []);

  // Prevent event propagation to avoid dialog closing
  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-2 sm:p-3 border-b bg-muted/50 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            aria-label="Zoom out"
            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
          >
            <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <span className="text-xs sm:text-sm font-medium min-w-[50px] sm:min-w-[60px] text-center">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            aria-label="Zoom in"
            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
          >
            <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetZoom}
            aria-label="Reset zoom"
            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
          >
            <RotateCw className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
        {onFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onFullscreen}
            aria-label="Fullscreen"
            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
          >
            <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        )}
      </div>

      {/* PDF Container */}
      <div 
        className="flex-1 overflow-auto relative min-h-0"
        style={{ 
          minHeight: '400px',
          maxHeight: '100%'
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 pointer-events-none">
            <div className="flex flex-col items-center gap-2 px-4">
              <div className="h-8 w-8 sm:h-10 sm:w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="text-xs sm:text-sm text-muted-foreground text-center">Loading PDF...</div>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="text-xs sm:text-sm text-destructive px-4 text-center">{error}</div>
          </div>
        )}
        <div
          className={cn(
            "w-full h-full",
            "transition-transform duration-200"
          )}
          style={{ 
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
            width: `${100 / (zoom / 100)}%`,
            height: `${100 / (zoom / 100)}%`
          }}
          onClick={stopPropagation}
          onContextMenu={stopPropagation}
          onMouseDown={stopPropagation}
          onPointerDown={stopPropagation}
        >
          <iframe
            ref={iframeRef}
            key={fileUrl}
            src={fileUrl}
            className="w-full border-0"
            title={fileName || 'PDF Preview'}
            style={{ 
              pointerEvents: 'auto',
              minHeight: '400px',
              height: '100%',
              display: 'block'
            }}
            onLoad={handleLoad}
            onError={handleError}
            onClick={stopPropagation}
            onContextMenu={stopPropagation}
            onMouseDown={stopPropagation}
            onPointerDown={stopPropagation}
          />
        </div>
      </div>
    </div>
  );
}

