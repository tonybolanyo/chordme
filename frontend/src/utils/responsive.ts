/**
 * Responsive utilities and viewport detection functions
 */
import { useState, useEffect } from 'react';

// Breakpoint constants
export const BREAKPOINTS = {
  xs: 320,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1200,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Get current viewport width
 */
export const getViewportWidth = (): number => {
  if (typeof window === 'undefined') return 0;
  return window.innerWidth;
};

/**
 * Get current viewport height
 */
export const getViewportHeight = (): number => {
  if (typeof window === 'undefined') return 0;
  return window.innerHeight;
};

/**
 * Check if current viewport matches a breakpoint
 */
export const isBreakpoint = (breakpoint: Breakpoint): boolean => {
  const width = getViewportWidth();
  return width >= BREAKPOINTS[breakpoint];
};

/**
 * Check if current viewport is mobile (below md breakpoint)
 */
export const isMobile = (): boolean => {
  return !isBreakpoint('md');
};

/**
 * Check if current viewport is tablet (md to lg)
 */
export const isTablet = (): boolean => {
  const width = getViewportWidth();
  return width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
};

/**
 * Check if current viewport is desktop (lg and above)
 */
export const isDesktop = (): boolean => {
  return isBreakpoint('lg');
};

/**
 * Get current breakpoint name
 */
export const getCurrentBreakpoint = (): Breakpoint => {
  const width = getViewportWidth();

  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

/**
 * Hook for responsive behavior with viewport detection
 */
export interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export const useViewport = (): ViewportInfo => {
  const [viewport, setViewport] = useState<ViewportInfo>(() => ({
    width: getViewportWidth(),
    height: getViewportHeight(),
    breakpoint: getCurrentBreakpoint(),
    isMobile: isMobile(),
    isTablet: isTablet(),
    isDesktop: isDesktop(),
  }));

  useEffect(() => {
    const handleResize = () => {
      const width = getViewportWidth();
      const height = getViewportHeight();

      setViewport({
        width,
        height,
        breakpoint: getCurrentBreakpoint(),
        isMobile: isMobile(),
        isTablet: isTablet(),
        isDesktop: isDesktop(),
      });
    };

    window.addEventListener('resize', handleResize);

    // Call immediately to set initial state
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return viewport;
};

/**
 * Hook for media query detection
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
};

/**
 * Hook for touch device detection
 */
export const useIsTouchDevice = (): boolean => {
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTouchSupport = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        ((navigator as unknown as { msMaxTouchPoints?: number })
          ?.msMaxTouchPoints ?? 0) > 0
      );
    };

    setIsTouchDevice(checkTouchSupport());
  }, []);

  return isTouchDevice;
};

/**
 * Responsive grid column calculator
 */
export const getResponsiveColumns = (
  mobile: number = 1,
  tablet: number = 2,
  desktop: number = 3
): number => {
  const width = getViewportWidth();

  if (width >= BREAKPOINTS.lg) return desktop;
  if (width >= BREAKPOINTS.md) return tablet;
  return mobile;
};

/**
 * Calculate optimal touch target size
 */
export const getTouchTargetSize = (baseSize: number = 44): number => {
  const isTouchDevice = 'ontouchstart' in window;
  return isTouchDevice ? Math.max(baseSize, 44) : baseSize;
};

/**
 * Debounced resize observer for performance
 */
export const createResizeObserver = (
  callback: (width: number, height: number) => void,
  debounceMs: number = 150
) => {
  let timeoutId: NodeJS.Timeout;

  const debouncedCallback = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback(getViewportWidth(), getViewportHeight());
    }, debounceMs);
  };

  const observer = {
    observe: () => {
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', debouncedCallback);
        // Call immediately
        debouncedCallback();
      }
    },
    disconnect: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', debouncedCallback);
        clearTimeout(timeoutId);
      }
    },
  };

  return observer;
};
