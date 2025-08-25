import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getViewportWidth,
  getViewportHeight,
  isBreakpoint,
  isMobile,
  isTablet,
  isDesktop,
  getCurrentBreakpoint,
  getResponsiveColumns,
  getTouchTargetSize,
  BREAKPOINTS,
} from './responsive';

// Mock window and navigator objects for testing

beforeEach(() => {
  // Reset window mock
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768,
  });
  Object.defineProperty(window, 'addEventListener', {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window, 'removeEventListener', {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });

  Object.defineProperty(navigator, 'maxTouchPoints', {
    writable: true,
    configurable: true,
    value: 0,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Responsive Utilities', () => {
  describe('Viewport Detection', () => {
    it('should get viewport width and height', () => {
      expect(getViewportWidth()).toBe(1024);
      expect(getViewportHeight()).toBe(768);
    });

    it('should return 0 for viewport dimensions when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing undefined window
      delete global.window;

      expect(getViewportWidth()).toBe(0);
      expect(getViewportHeight()).toBe(0);

      global.window = originalWindow;
    });
  });

  describe('Breakpoint Detection', () => {
    it('should detect breakpoints correctly', () => {
      // Desktop (1024px)
      expect(isBreakpoint('lg')).toBe(true);
      expect(isBreakpoint('md')).toBe(true);
      expect(isBreakpoint('sm')).toBe(true);
      expect(isBreakpoint('xs')).toBe(true);
      expect(isBreakpoint('xl')).toBe(false);
    });

    it('should detect mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', { value: 600 });
      expect(isMobile()).toBe(true);

      Object.defineProperty(window, 'innerWidth', { value: 800 });
      expect(isMobile()).toBe(false);
    });

    it('should detect tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', { value: 900 });
      expect(isTablet()).toBe(true);

      Object.defineProperty(window, 'innerWidth', { value: 600 });
      expect(isTablet()).toBe(false);

      Object.defineProperty(window, 'innerWidth', { value: 1200 });
      expect(isTablet()).toBe(false);
    });

    it('should detect desktop viewport', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      expect(isDesktop()).toBe(true);

      Object.defineProperty(window, 'innerWidth', { value: 600 });
      expect(isDesktop()).toBe(false);
    });

    it('should get current breakpoint correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 320 });
      expect(getCurrentBreakpoint()).toBe('xs');

      Object.defineProperty(window, 'innerWidth', { value: 480 });
      expect(getCurrentBreakpoint()).toBe('sm');

      Object.defineProperty(window, 'innerWidth', { value: 768 });
      expect(getCurrentBreakpoint()).toBe('md');

      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      expect(getCurrentBreakpoint()).toBe('lg');

      Object.defineProperty(window, 'innerWidth', { value: 1200 });
      expect(getCurrentBreakpoint()).toBe('xl');
    });
  });

  describe('Responsive Helpers', () => {
    it('should calculate responsive columns correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 400 });
      expect(getResponsiveColumns(1, 2, 3)).toBe(1);

      Object.defineProperty(window, 'innerWidth', { value: 800 });
      expect(getResponsiveColumns(1, 2, 3)).toBe(2);

      Object.defineProperty(window, 'innerWidth', { value: 1200 });
      expect(getResponsiveColumns(1, 2, 3)).toBe(3);
    });

    it('should calculate touch target size correctly', () => {
      // Mock touch device
      Object.defineProperty(window, 'ontouchstart', { value: true });
      expect(getTouchTargetSize(30)).toBe(44);
      expect(getTouchTargetSize(50)).toBe(50);

      // Mock non-touch device
      delete (window as unknown as { ontouchstart?: unknown }).ontouchstart;
      expect(getTouchTargetSize(30)).toBe(30);
    });
  });

  describe('BREAKPOINTS constants', () => {
    it('should have correct breakpoint values', () => {
      expect(BREAKPOINTS.xs).toBe(320);
      expect(BREAKPOINTS.sm).toBe(480);
      expect(BREAKPOINTS.md).toBe(768);
      expect(BREAKPOINTS.lg).toBe(1024);
      expect(BREAKPOINTS.xl).toBe(1200);
    });
  });
});
