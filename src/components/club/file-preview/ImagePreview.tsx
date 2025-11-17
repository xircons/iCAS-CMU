import React, { useState, useCallback, useRef } from "react";
import { ZoomIn, ZoomOut, Maximize2, RotateCw, Move } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";

interface ImagePreviewProps {
  fileUrl: string;
  fileName?: string;
  onFullscreen?: () => void;
}

export function ImagePreview({ fileUrl, fileName, onFullscreen }: ImagePreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset loading state when fileUrl changes
  React.useEffect(() => {
    setIsLoading(true);
    setError(null);
    setPosition({ x: 0, y: 0 });
    setZoom(100);
  }, [fileUrl]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setError('Failed to load image');
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 300));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const newZoom = Math.max(prev - 25, 25);
      if (newZoom <= 100) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(100);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 100) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 100) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Prevent event propagation to avoid dialog closing
  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Image Controls */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 25}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 300}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetZoom}
            aria-label="Reset zoom"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          {zoom > 100 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
              <Move className="h-3 w-3" />
              <span>Drag to pan</span>
            </div>
          )}
        </div>
        {onFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onFullscreen}
            aria-label="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Image Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative flex items-center justify-center p-4 sm:p-6"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={stopPropagation}
        onContextMenu={stopPropagation}
        onMouseDown={stopPropagation}
        onPointerDown={stopPropagation}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="text-sm text-muted-foreground">Loading image...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        )}
        <img
          ref={imageRef}
          src={fileUrl}
          alt={fileName || 'Image preview'}
          className={cn(
            "max-w-full max-h-full object-contain rounded-lg border transition-transform duration-200",
            zoom > 100 && "cursor-move"
          )}
          style={{
            transform: `scale(${zoom / 100}) translate(${position.x / (zoom / 100)}px, ${position.y / (zoom / 100)}px)`,
            transformOrigin: 'center center'
          }}
          onLoad={handleLoad}
          onError={handleError}
          onMouseDown={handleMouseDown}
          onClick={stopPropagation}
          onContextMenu={stopPropagation}
        />
      </div>
    </div>
  );
}

