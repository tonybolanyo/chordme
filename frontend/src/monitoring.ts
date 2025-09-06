/**
 * Frontend error reporting and monitoring configuration for ChordMe.
 * Provides centralized error tracking and performance monitoring.
 */

// Types for error reporting
export interface ErrorContext {
  userId?: string;
  userAgent?: string;
  url?: string;
  timestamp?: string;
  additional?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  url?: string;
  userId?: string;
}

export interface MonitoringConfig {
  sentryDsn?: string;
  apiEndpoint?: string;
  environment?: string;
  enablePerformanceTracking?: boolean;
  enableErrorBoundary?: boolean;
  sampleRate?: number;
}

class FrontendMonitoring {
  private config: MonitoringConfig;
  private errors: Array<any> = [];
  private performanceMetrics: Array<PerformanceMetric> = [];
  private userId?: string;

  constructor(config: MonitoringConfig = {}) {
    this.config = {
      environment: 'development',
      enablePerformanceTracking: true,
      enableErrorBoundary: true,
      sampleRate: 1.0,
      ...config
    };

    this.setupErrorHandlers();
    this.setupPerformanceTracking();
  }

  /**
   * Initialize Sentry for error tracking if DSN is provided
   */
  private async initializeSentry() {
    if (!this.config.sentryDsn) {
      return;
    }

    try {
      // Dynamic import to avoid bundling Sentry if not needed
      const Sentry = await import('@sentry/react');
      
      Sentry.init({
        dsn: this.config.sentryDsn,
        environment: this.config.environment,
        sampleRate: this.config.sampleRate,
        tracesSampleRate: this.config.environment === 'production' ? 0.1 : 1.0,
        integrations: [
          new Sentry.BrowserTracing(),
        ],
        beforeSend: (event) => this.filterSentryEvent(event),
      });

      console.log('Sentry initialized for frontend error tracking');
    } catch (error) {
      console.warn('Failed to initialize Sentry:', error);
      // Fall back to local error reporting
      this.setupLocalErrorReporting();
    }
  }

  /**
   * Setup local error reporting as fallback
   */
  private setupLocalErrorReporting() {
    // Store errors locally and send to backend
    window.addEventListener('error', (event) => {
      this.reportError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        message: 'Unhandled Promise Rejection',
        error: event.reason?.toString?.() || JSON.stringify(event.reason)
      });
    });
  }

  /**
   * Filter Sentry events to reduce noise
   */
  private filterSentryEvent(event: any): any {
    // Filter out development-only errors
    if (this.config.environment === 'development') {
      if (event.exception?.values?.[0]?.value?.includes('ResizeObserver loop limit exceeded')) {
        return null;
      }
    }

    // Filter out network errors that are not actionable
    if (event.exception?.values?.[0]?.value?.includes('Network Error')) {
      return null;
    }

    return event;
  }

  /**
   * Setup global error handlers
   */
  private setupErrorHandlers() {
    // Initialize Sentry if configured
    if (this.config.sentryDsn) {
      this.initializeSentry();
    } else {
      this.setupLocalErrorReporting();
    }
  }

  /**
   * Setup performance tracking
   */
  private setupPerformanceTracking() {
    if (!this.config.enablePerformanceTracking) {
      return;
    }

    // Track Core Web Vitals
    this.trackCoreWebVitals();

    // Track custom performance metrics
    this.trackCustomMetrics();
  }

  /**
   * Track Core Web Vitals (LCP, FID, CLS)
   */
  private trackCoreWebVitals() {
    try {
      // Use web-vitals library if available
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS((metric) => this.reportPerformanceMetric({
          name: 'CLS',
          value: metric.value,
          timestamp: new Date().toISOString(),
          url: window.location.href
        }));

        getFID((metric) => this.reportPerformanceMetric({
          name: 'FID',
          value: metric.value,
          timestamp: new Date().toISOString(),
          url: window.location.href
        }));

        getFCP((metric) => this.reportPerformanceMetric({
          name: 'FCP',
          value: metric.value,
          timestamp: new Date().toISOString(),
          url: window.location.href
        }));

        getLCP((metric) => this.reportPerformanceMetric({
          name: 'LCP',
          value: metric.value,
          timestamp: new Date().toISOString(),
          url: window.location.href
        }));

        getTTFB((metric) => this.reportPerformanceMetric({
          name: 'TTFB',
          value: metric.value,
          timestamp: new Date().toISOString(),
          url: window.location.href
        }));
      }).catch(() => {
        // Fallback to basic performance tracking
        this.trackBasicPerformance();
      });
    } catch {
      this.trackBasicPerformance();
    }
  }

  /**
   * Basic performance tracking fallback
   */
  private trackBasicPerformance() {
    // Track page load time
    window.addEventListener('load', () => {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      this.reportPerformanceMetric({
        name: 'PageLoadTime',
        value: loadTime,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
    });
  }

  /**
   * Track custom application metrics
   */
  private trackCustomMetrics() {
    // Track React component render times
    this.trackComponentPerformance();

    // Track API response times
    this.trackAPIPerformance();
  }

  /**
   * Track React component performance
   */
  private trackComponentPerformance() {
    // This would be implemented with React Profiler
    // For now, we'll create a placeholder
  }

  /**
   * Track API response times
   */
  private trackAPIPerformance() {
    // Intercept fetch requests to track API performance
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0]?.toString() || 'unknown';
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.reportPerformanceMetric({
          name: 'APIResponseTime',
          value: duration,
          timestamp: new Date().toISOString(),
          url: url
        });

        // Track error rates
        if (!response.ok) {
          this.reportError({
            message: `API Error: ${response.status} ${response.statusText}`,
            url: url,
            statusCode: response.status
          });
        }

        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.reportError({
          message: `API Request Failed: ${error}`,
          url: url,
          duration: duration
        });

        throw error;
      }
    };
  }

  /**
   * Report an error to the monitoring system
   */
  public reportError(errorInfo: any, context?: ErrorContext) {
    const errorReport = {
      ...errorInfo,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.userId,
      ...context
    };

    // Store locally
    this.errors.push(errorReport);

    // Send to backend if configured
    if (this.config.apiEndpoint) {
      this.sendToBackend('/api/v1/monitoring/frontend-error', errorReport);
    }

    // Log to console in development
    if (this.config.environment === 'development') {
      console.error('Frontend Error:', errorReport);
    }
  }

  /**
   * Report a performance metric
   */
  public reportPerformanceMetric(metric: PerformanceMetric) {
    // Add user context
    const enrichedMetric = {
      ...metric,
      userId: this.userId
    };

    // Store locally
    this.performanceMetrics.push(enrichedMetric);

    // Send to backend if configured
    if (this.config.apiEndpoint) {
      this.sendToBackend('/api/v1/monitoring/frontend-metrics', enrichedMetric);
    }

    // Log in development
    if (this.config.environment === 'development') {
      console.log('Performance Metric:', enrichedMetric);
    }
  }

  /**
   * Set user context for error reporting
   */
  public setUser(userId: string, additionalContext?: Record<string, any>) {
    this.userId = userId;

    // Set user context in Sentry if available
    if (window.Sentry) {
      window.Sentry.setUser({
        id: userId,
        ...additionalContext
      });
    }
  }

  /**
   * Send data to backend monitoring endpoint
   */
  private async sendToBackend(endpoint: string, data: any) {
    try {
      await fetch(`${this.config.apiEndpoint}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
    } catch (error) {
      // Silently fail to avoid error loops
      console.warn('Failed to send monitoring data to backend:', error);
    }
  }

  /**
   * Get error summary for debugging
   */
  public getErrorSummary() {
    return {
      totalErrors: this.errors.length,
      recentErrors: this.errors.slice(-10),
      errorsByType: this.groupErrorsByType()
    };
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary() {
    const metrics = this.performanceMetrics;
    
    return {
      totalMetrics: metrics.length,
      averagePageLoad: this.calculateAverage(metrics.filter(m => m.name === 'PageLoadTime')),
      averageAPIResponse: this.calculateAverage(metrics.filter(m => m.name === 'APIResponseTime')),
      coreWebVitals: {
        LCP: this.getLatestMetric('LCP'),
        FID: this.getLatestMetric('FID'),
        CLS: this.getLatestMetric('CLS')
      }
    };
  }

  private groupErrorsByType() {
    const groups: Record<string, number> = {};
    this.errors.forEach(error => {
      const type = error.message?.split(':')[0] || 'Unknown';
      groups[type] = (groups[type] || 0) + 1;
    });
    return groups;
  }

  private calculateAverage(metrics: PerformanceMetric[]) {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }

  private getLatestMetric(name: string) {
    const metrics = this.performanceMetrics.filter(m => m.name === name);
    return metrics.length > 0 ? metrics[metrics.length - 1].value : null;
  }
}

// Export singleton instance
export const frontendMonitoring = new FrontendMonitoring({
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  apiEndpoint: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  enablePerformanceTracking: true,
  enableErrorBoundary: true,
  sampleRate: import.meta.env.VITE_ENVIRONMENT === 'production' ? 0.1 : 1.0
});

export default FrontendMonitoring;