import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const SCROLL_POSITION_KEY = 'scrollPositions';
const DEBOUNCE_DELAY = 100;

interface ScrollPositions {
  [pathname: string]: number;
}

/**
 * Custom hook to preserve scroll position when window loses/gains focus
 * Prevents auto-scroll-to-top when switching between applications
 */
export function useScrollPreservation() {
  const location = useLocation();
  const isRestoringRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPathnameRef = useRef<string>(location.pathname);

  // Save scroll position to sessionStorage
  const saveScrollPosition = (pathname: string) => {
    if (isRestoringRef.current) return;
    
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    
    try {
      const stored = sessionStorage.getItem(SCROLL_POSITION_KEY);
      const positions: ScrollPositions = stored ? JSON.parse(stored) : {};
      positions[pathname] = scrollY;
      sessionStorage.setItem(SCROLL_POSITION_KEY, JSON.stringify(positions));
    } catch (error) {
      console.warn('Failed to save scroll position:', error);
    }
  };

  // Restore scroll position from sessionStorage
  // This must restore IMMEDIATELY to prevent other handlers from resetting scroll
  const restoreScrollPosition = (pathname: string) => {
    try {
      const stored = sessionStorage.getItem(SCROLL_POSITION_KEY);
      if (!stored) return;

      const positions: ScrollPositions = JSON.parse(stored);
      const savedPosition = positions[pathname];

      if (savedPosition !== undefined && savedPosition > 0) {
        isRestoringRef.current = true;
        
        // Restore immediately - don't wait for requestAnimationFrame
        // This prevents other focus handlers from resetting scroll first
        window.scrollTo({
          top: savedPosition,
          behavior: 'auto' // Instant scroll, not smooth
        });
        
        // Also use requestAnimationFrame as backup in case DOM isn't ready
        requestAnimationFrame(() => {
          const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
          // Only restore if scroll was reset (current position is different from saved)
          if (Math.abs(currentScroll - savedPosition) > 10) {
            window.scrollTo({
              top: savedPosition,
              behavior: 'auto'
            });
          }
          
          // Reset flag after a short delay to allow scroll to complete
          setTimeout(() => {
            isRestoringRef.current = false;
          }, 100);
        });
      }
    } catch (error) {
      console.warn('Failed to restore scroll position:', error);
      isRestoringRef.current = false;
    }
  };

  // Debounced save function
  const debouncedSave = (pathname: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveScrollPosition(pathname);
    }, DEBOUNCE_DELAY);
  };

  // Handle window focus - restore scroll position IMMEDIATELY
  // This must run before any other focus handlers to prevent scroll reset
  useEffect(() => {
    const handleFocus = () => {
      // Only restore if we're on the same pathname
      if (location.pathname === lastPathnameRef.current) {
        // Restore immediately with high priority to prevent other handlers from resetting scroll
        restoreScrollPosition(location.pathname);
      }
    };

    // Use capture phase to run before other focus handlers
    window.addEventListener('focus', handleFocus, true);
    return () => {
      window.removeEventListener('focus', handleFocus, true);
    };
  }, [location.pathname]);

  // Handle window blur - save scroll position
  useEffect(() => {
    const handleBlur = () => {
      saveScrollPosition(location.pathname);
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [location.pathname]);

  // Save scroll position on scroll (debounced)
  useEffect(() => {
    const handleScroll = () => {
      if (!isRestoringRef.current) {
        debouncedSave(location.pathname);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [location.pathname]);

  // Handle route changes - save current position
  // Note: We don't restore on route change to allow React Router's default behavior
  // Scroll position will be restored only when window regains focus
  useEffect(() => {
    if (lastPathnameRef.current !== location.pathname) {
      // Save position of previous route before navigation
      saveScrollPosition(lastPathnameRef.current);
      lastPathnameRef.current = location.pathname;
    }
  }, [location.pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
}

