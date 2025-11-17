import { useRef, useCallback } from 'react';

export interface UseFilePreviewDialogOptions {
  onClose?: () => void;
}

export interface UseFilePreviewDialogReturn {
  handleOpenChange: (open: boolean) => void;
  handleInteractOutside: (e: Event) => void;
  handlePointerDownOutside: (e: Event) => void;
  handleClose: () => void;
}

/**
 * Hook for managing file preview dialog interactions
 * Prevents accidental closes when clicking inside dialog content
 */
export function useFilePreviewDialog(
  open: boolean,
  onOpenChange: (open: boolean) => void,
  options: UseFilePreviewDialogOptions = {}
): UseFilePreviewDialogReturn {
  const isClosingRef = useRef(false);

  const handleClose = useCallback(() => {
    isClosingRef.current = true;
    onOpenChange(false);
    options.onClose?.();
    // Reset after a short delay
    setTimeout(() => {
      isClosingRef.current = false;
    }, 100);
  }, [onOpenChange, options]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Only allow close if it was explicitly requested (button click, ESC, or clicking outside)
      // The isClosingRef is set when button is clicked
      // For ESC and outside clicks, we allow them through onInteractOutside/onEscapeKeyDown
      if (isClosingRef.current) {
        // Button was clicked
        onOpenChange(newOpen);
        options.onClose?.();
      } else {
        // Check if this is from ESC or clicking outside (not from clicking inside)
        // We'll allow it if onInteractOutside didn't prevent it
        onOpenChange(newOpen);
        options.onClose?.();
      }
    } else {
      // Always allow opening
      onOpenChange(newOpen);
    }
  }, [onOpenChange, options]);

  const handleInteractOutside = useCallback((e: Event) => {
    // Only prevent closing if clicking inside dialog content
    const target = e.target as HTMLElement;
    const dialogContent = target.closest('[data-slot="dialog-content"]');
    if (dialogContent) {
      // Click was inside dialog, prevent close
      e.preventDefault();
    }
    // Otherwise, allow closing (click was on overlay)
  }, []);

  const handlePointerDownOutside = useCallback((e: Event) => {
    // Only prevent closing if clicking inside dialog content
    const target = e.target as HTMLElement;
    const dialogContent = target.closest('[data-slot="dialog-content"]');
    if (dialogContent) {
      // Click was inside dialog, prevent close
      e.preventDefault();
    }
    // Otherwise, allow closing (click was on overlay)
  }, []);

  return {
    handleOpenChange,
    handleInteractOutside,
    handlePointerDownOutside,
    handleClose
  };
}

