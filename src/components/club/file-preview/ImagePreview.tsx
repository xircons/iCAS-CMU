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
    console.log('ImagePreview: fileUrl changed to:', fileUrl);
  }, [fileUrl]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    const img = e.currentTarget;
    console.error('Image load error:', {
      src: img.src,
      fileName,
      fileUrl
    });
    setError(`Failed to load image: ${fileName || 'Unknown'}`);
  }, [fileName, fileUrl]);

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
    <div className="flex flex-col flex-1 min-h-0 h-full">
      {/* Image Controls */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50 shrink-0">
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
        className="flex-1 min-h-0 overflow-auto relative flex items-center justify-center p-4 sm:p-6 bg-muted/20"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={stopPropagation}
        onContextMenu={stopPropagation}
        onMouseDown={stopPropagation}
        onPointerDown={stopPropagation}
        style={{ 
          touchAction: 'none'
        }}
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
        <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
          {!error ? (
            <img
              ref={imageRef}
              src={fileUrl}
              alt={fileName || 'Image preview'}
              className={cn(
                "max-w-full max-h-full object-contain rounded-lg border transition-transform duration-200 select-none",
                zoom > 100 && "cursor-move"
              )}
              style={{
                transform: `scale(${zoom / 100}) translate(${position.x / (zoom / 100)}px, ${position.y / (zoom / 100)}px)`,
                transformOrigin: 'center center',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: zoom > 100 ? 'auto' : 'none',
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto'
              }}
              onLoad={handleLoad}
              onError={handleError}
              onMouseDown={handleMouseDown}
              onClick={stopPropagation}
              onContextMenu={stopPropagation}
              draggable={false}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-4xl mb-4">🖼️</div>
              <p className="text-sm text-destructive mb-2">{error}</p>
              <p className="text-xs text-muted-foreground mb-4">URL: {fileUrl}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  // Force reload by adding timestamp
                  const img = imageRef.current;
                  if (img) {
                    img.src = `${fileUrl}?t=${Date.now()}`;
                  }
                }}
              >
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

