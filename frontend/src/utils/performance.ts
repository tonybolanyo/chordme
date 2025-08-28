/**
 * Performance monitoring utilities for ChordMe frontend.
 * Provides performance metrics collection, monitoring, and reporting.
 */

// Extended interfaces for performance entries with browser-specific properties
/**
 * Extends the standard PerformanceEntry with browser-specific properties for Web Vitals.
 * Represents a layout shift entry as reported by browsers supporting the Layout Instability API.
 * @see https://web.dev/cls/
 * @property hadRecentInput - Indicates if the layout shift occurred shortly after user input.
 * @property value - The layout shift score for this entry.
 */
interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

/**
 * Extends the standard PerformanceEntry with browser-specific properties for Web Vitals.
 * Represents a first input entry as reported by browsers supporting the Event Timing API.
 * @see https://web.dev/fid/
 * @property processingStart - The timestamp when event processing started.
 */
interface FirstInputEntry extends PerformanceEntry {
  processingStart: number;
}

export interface PerformanceMetrics {
  navigationTiming: PerformanceTiming | null;
  paintMetrics: { [key: string]: number };
  resourceTiming: PerformanceResourceTiming[];
  userInteractionMetrics: { [key: string]: number };
  customMetrics: { [key: string]: number };
}

/**
 * Summary of key performance metrics for a page load.
 *
 * Timing-related fields represent durations (in milliseconds) for different phases of page loading:
 * - domainLookup: Time spent performing DNS lookup.
 * - connection: Time spent establishing a connection to the server.
 * - request: Time from sending the request to the server until the first byte is received.
 * - response: Time taken to receive the full response from the server.
 * - domProcessing: Time spent processing and parsing the DOM.
 * - domContentLoaded: Time until the DOMContentLoaded event is fired.
 * - loadComplete: Time until the load event is fired (page is fully loaded).
 *
 * Other fields:
 * - vitals: Core web vitals metrics (FCP, LCP, FID, CLS, TTFB).
 * - paintMetrics: Paint timing metrics (e.g., first-paint, first-contentful-paint).
 * - resourceCount: Number of resources loaded by the page.
 * - customMetrics: Custom performance metrics recorded by the application.
 * - userInteractions: Number of user interactions recorded.
 * - error: Optional error message if metrics collection failed.
 */
interface PerformanceSummary {
  /** Time spent performing DNS lookup (ms) */
  domainLookup?: number;
  /** Time spent establishing a connection to the server (ms) */
  connection?: number;
  /** Time from sending the request until the first byte is received (ms) */
  request?: number;
  /** Time taken to receive the full response from the server (ms) */
  response?: number;
  /** Time spent processing and parsing the DOM (ms) */
  domProcessing?: number;
  /** Time until the DOMContentLoaded event is fired (ms) */
  domContentLoaded?: number;
  /** Time until the load event is fired (page is fully loaded) (ms) */
  loadComplete?: number;
  /** Core web vitals metrics (FCP, LCP, FID, CLS, TTFB) */
  vitals: VitalMetrics;
  /** Paint timing metrics (e.g., first-paint, first-contentful-paint) */
  paintMetrics: { [key: string]: number };
  /** Number of resources loaded by the page */
  resourceCount: number;
  /** Custom performance metrics recorded by the application */
  customMetrics: { [key: string]: number };
  /** Number of user interactions recorded */
  userInteractions: number;
  /** Optional error message if metrics collection failed */
  error?: string;
}

export interface VitalMetrics {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private vitals: VitalMetrics;
  private observers: PerformanceObserver[];

  constructor() {
    this.metrics = {
      navigationTiming: null,
      paintMetrics: {},
      resourceTiming: [],
      userInteractionMetrics: {},
      customMetrics: {},
    };
    this.vitals = {};
    this.observers = [];

    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Initialize performance observers when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () =>
        this.setupObservers()
      );
    } else {
      this.setupObservers();
    }
  }

  private setupObservers(): void {
    try {
      // Observe navigation timing
      this.observeNavigationTiming();

      // Observe paint metrics
      this.observePaintMetrics();

      // Observe largest contentful paint
      this.observeLCP();

      // Observe cumulative layout shift
      this.observeCLS();

      // Observe first input delay
      this.observeFID();

      // Observe resource timing
      this.observeResourceTiming();
    } catch (error) {
      console.warn('Performance monitoring setup failed:', error);
    }
  }

  private observeNavigationTiming(): void {
    if ('performance' in window && 'timing' in performance) {
      this.metrics.navigationTiming = performance.timing;

      // Calculate TTFB
      const ttfb =
        performance.timing.responseStart - performance.timing.navigationStart;
      this.vitals.TTFB = ttfb;
    }
  }

  private observePaintMetrics(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'paint') {
              this.metrics.paintMetrics[entry.name] = entry.startTime;

              if (entry.name === 'first-contentful-paint') {
                this.vitals.FCP = entry.startTime;
              }
            }
          }
        });

        observer.observe({ entryTypes: ['paint'] });
        this.observers.push(observer);
      } catch (error) {
        console.warn('Paint metrics observation failed:', error);
      }
    }
  }

  private observeLCP(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.vitals.LCP = lastEntry.startTime;
        });

        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(observer);
      } catch (error) {
        console.warn('LCP observation failed:', error);
      }
    }
  }

  private observeCLS(): void {
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShiftEntry = entry as LayoutShiftEntry;
            if (!layoutShiftEntry.hadRecentInput) {
              clsValue += layoutShiftEntry.value;
              this.vitals.CLS = clsValue;
            }
          }
        });

        observer.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(observer);
      } catch (error) {
        console.warn('CLS observation failed:', error);
      }
    }
  }

  private observeFID(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const firstInputEntry = entry as FirstInputEntry;
            this.vitals.FID = firstInputEntry.processingStart - entry.startTime;
          }
        });

        observer.observe({ entryTypes: ['first-input'] });
        this.observers.push(observer);
      } catch (error) {
        console.warn('FID observation failed:', error);
      }
    }
  }

  private observeResourceTiming(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          this.metrics.resourceTiming.push(
            ...(list.getEntries() as PerformanceResourceTiming[])
          );
        });

        observer.observe({ entryTypes: ['resource'] });
        this.observers.push(observer);
      } catch (error) {
        console.warn('Resource timing observation failed:', error);
      }
    }
  }

  /**
   * Record a custom performance metric
   */
  recordCustomMetric(name: string, value: number): void {
    this.metrics.customMetrics[name] = value;
  }

  /**
   * Record user interaction timing
   */
  recordUserInteraction(action: string, duration: number): void {
    this.metrics.userInteractionMetrics[action] = duration;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get Web Vitals metrics
   */
  getVitals(): VitalMetrics {
    return { ...this.vitals };
  }

  /**
   * Get performance summary for logging
   */
  getPerformanceSummary(): PerformanceSummary {
    const navigation = this.metrics.navigationTiming;

    if (!navigation) {
      return {
        error: 'Navigation timing not available',
        vitals: this.vitals,
        paintMetrics: this.metrics.paintMetrics,
        resourceCount: this.metrics.resourceTiming.length,
        customMetrics: this.metrics.customMetrics,
        userInteractions: Object.keys(this.metrics.userInteractionMetrics)
          .length,
      };
    }

    return {
      // Navigation timing
      domainLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
      connection: navigation.connectEnd - navigation.connectStart,
      request: navigation.responseStart - navigation.requestStart,
      response: navigation.responseEnd - navigation.responseStart,
      domProcessing: navigation.domComplete - navigation.domLoading,
      domContentLoaded:
        navigation.domContentLoadedEventEnd - navigation.navigationStart,
      loadComplete: navigation.loadEventEnd - navigation.navigationStart,

      // Web Vitals
      vitals: this.vitals,

      // Paint metrics
      paintMetrics: this.metrics.paintMetrics,

      // Resource counts
      resourceCount: this.metrics.resourceTiming.length,

      // Custom metrics
      customMetrics: this.metrics.customMetrics,

      // User interactions
      userInteractions: Object.keys(this.metrics.userInteractionMetrics).length,
    };
  }

  /**
   * Send performance data to monitoring endpoint
   */
  async sendMetrics(): Promise<void> {
    try {
      const summary = this.getPerformanceSummary();

      // Add additional context
      const data = {
        ...summary,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
      };

      // Send to backend monitoring endpoint (if available)
      await fetch('/api/v1/monitoring/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }).catch(() => {
        // Silently fail if monitoring endpoint is not available
        console.info('Performance metrics sent to monitoring endpoint');
      });
    } catch (error) {
      console.warn('Failed to send performance metrics:', error);
    }
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

// Utility functions for performance monitoring
export const performanceUtils = {
  /**
   * Measure function execution time
   */
  measureFunction: <T>(fn: () => T, name: string): T => {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    performanceMonitor.recordCustomMetric(name, duration);

    return result;
  },

  /**
   * Measure async function execution time
   */
  measureAsyncFunction: async <T>(
    fn: () => Promise<T>,
    name: string
  ): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    performanceMonitor.recordCustomMetric(name, duration);

    return result;
  },

  /**
   * Mark user interaction start
   */
  markInteractionStart: (action: string): (() => void) => {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      performanceMonitor.recordUserInteraction(action, duration);
    };
  },
};

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Automatically send metrics when page is about to unload
window.addEventListener('beforeunload', () => {
  performanceMonitor.sendMetrics();
  performanceMonitor.cleanup();
});

// Send metrics periodically (every 30 seconds)
setInterval(() => {
  performanceMonitor.sendMetrics();
}, 30000);

export default performanceMonitor;
