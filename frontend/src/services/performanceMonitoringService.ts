/**
 * Enhanced Performance Monitoring Service for ChordMe Milestone 3
 * 
 * Provides comprehensive performance monitoring for:
 * - Real-time collaboration (≤100ms latency target)
 * - Audio synchronization accuracy (50ms tolerance)
 * - Memory usage optimization
 * - Network efficiency monitoring
 * - Performance regression detection
 */

interface CollaborationMetrics {
  latency: number;
  timestamp: number;
  operation: string;
  userId: string;
  success: boolean;
}

interface AudioSyncMetrics {
  accuracy: number; // ms tolerance
  timestamp: number;
  expectedPosition: number;
  actualPosition: number;
  deviation: number;
}

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  jsHeapSizeLimit: number;
  timestamp: number;
  sessionDuration: number;
}

interface NetworkMetrics {
  requestSize: number;
  responseSize: number;
  latency: number;
  endpoint: string;
  timestamp: number;
  compressionRatio?: number;
}

interface PerformanceAlert {
  type: 'collaboration_latency' | 'audio_sync_accuracy' | 'memory_usage' | 'network_efficiency';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

class PerformanceMonitoringService {
  private collaborationMetrics: CollaborationMetrics[] = [];
  private audioSyncMetrics: AudioSyncMetrics[] = [];
  private memoryMetrics: MemoryMetrics[] = [];
  private networkMetrics: NetworkMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  
  // Performance thresholds
  private readonly COLLABORATION_LATENCY_WARNING = 80; // ms
  private readonly COLLABORATION_LATENCY_CRITICAL = 100; // ms
  private readonly AUDIO_SYNC_WARNING = 40; // ms
  private readonly AUDIO_SYNC_CRITICAL = 50; // ms
  private readonly MEMORY_USAGE_WARNING = 0.8; // 80% of heap limit
  private readonly MEMORY_USAGE_CRITICAL = 0.9; // 90% of heap limit
  
  private monitoringInterval: number | null = null;
  private sessionStartTime: number = Date.now();
  private listeners: Array<(metrics: unknown) => void> = [];

  constructor() {
    this.startMonitoring();
  }

  /**
   * Start continuous performance monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = window.setInterval(() => {
      this.collectMemoryMetrics();
      this.checkThresholds();
    }, 1000); // Check every second

    // Monitor network performance by intercepting fetch
    this.setupNetworkMonitoring();
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Record real-time collaboration performance metrics
   */
  public recordCollaborationLatency(
    latency: number,
    operation: string,
    userId: string,
    success: boolean = true
  ): void {
    const metric: CollaborationMetrics = {
      latency,
      timestamp: Date.now(),
      operation,
      userId,
      success
    };

    this.collaborationMetrics.push(metric);
    
    // Keep only last 1000 metrics for memory efficiency
    if (this.collaborationMetrics.length > 1000) {
      this.collaborationMetrics = this.collaborationMetrics.slice(-1000);
    }

    // Check thresholds
    if (latency > this.COLLABORATION_LATENCY_CRITICAL) {
      this.createAlert('collaboration_latency', 'critical', 
        `Collaboration latency exceeded critical threshold: ${latency}ms`, 
        latency, this.COLLABORATION_LATENCY_CRITICAL);
    } else if (latency > this.COLLABORATION_LATENCY_WARNING) {
      this.createAlert('collaboration_latency', 'warning',
        `Collaboration latency exceeded warning threshold: ${latency}ms`,
        latency, this.COLLABORATION_LATENCY_WARNING);
    }
  }

  /**
   * Record audio synchronization accuracy metrics
   */
  public recordAudioSyncAccuracy(
    expectedPosition: number,
    actualPosition: number
  ): void {
    const deviation = Math.abs(expectedPosition - actualPosition);
    const metric: AudioSyncMetrics = {
      accuracy: deviation,
      timestamp: Date.now(),
      expectedPosition,
      actualPosition,
      deviation
    };

    this.audioSyncMetrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.audioSyncMetrics.length > 1000) {
      this.audioSyncMetrics = this.audioSyncMetrics.slice(-1000);
    }

    // Check accuracy thresholds
    if (deviation > this.AUDIO_SYNC_CRITICAL) {
      this.createAlert('audio_sync_accuracy', 'critical',
        `Audio sync deviation exceeded critical threshold: ${deviation}ms`,
        deviation, this.AUDIO_SYNC_CRITICAL);
    } else if (deviation > this.AUDIO_SYNC_WARNING) {
      this.createAlert('audio_sync_accuracy', 'warning',
        `Audio sync deviation exceeded warning threshold: ${deviation}ms`,
        deviation, this.AUDIO_SYNC_WARNING);
    }
  }

  /**
   * Collect memory usage metrics
   */
  private collectMemoryMetrics(): void {
    if (!('memory' in performance)) {
      return; // Memory API not supported
    }

    const memory = (performance as any).memory;
    const sessionDuration = Date.now() - this.sessionStartTime;
    
    const metric: MemoryMetrics = {
      heapUsed: memory.usedJSHeapSize,
      heapTotal: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: Date.now(),
      sessionDuration
    };

    this.memoryMetrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.memoryMetrics.length > 1000) {
      this.memoryMetrics = this.memoryMetrics.slice(-1000);
    }

    // Check memory usage thresholds
    const memoryUsageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    
    if (memoryUsageRatio > this.MEMORY_USAGE_CRITICAL) {
      this.createAlert('memory_usage', 'critical',
        `Memory usage exceeded critical threshold: ${(memoryUsageRatio * 100).toFixed(1)}%`,
        memoryUsageRatio, this.MEMORY_USAGE_CRITICAL);
    } else if (memoryUsageRatio > this.MEMORY_USAGE_WARNING) {
      this.createAlert('memory_usage', 'warning',
        `Memory usage exceeded warning threshold: ${(memoryUsageRatio * 100).toFixed(1)}%`,
        memoryUsageRatio, this.MEMORY_USAGE_WARNING);
    }
  }

  /**
   * Setup network performance monitoring
   */
  private setupNetworkMonitoring(): void {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0]?.toString() || 'unknown';
      
      // Calculate request size
      const requestSize = this.calculateRequestSize(args[1]);
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        // Calculate response size
        const responseSize = this.calculateResponseSize(response);
        
        const metric: NetworkMetrics = {
          requestSize,
          responseSize,
          latency,
          endpoint: url,
          timestamp: Date.now(),
          compressionRatio: requestSize > 0 ? responseSize / requestSize : undefined
        };

        this.networkMetrics.push(metric);
        
        // Keep only last 1000 metrics
        if (this.networkMetrics.length > 1000) {
          this.networkMetrics = this.networkMetrics.slice(-1000);
        }

        return response;
      } catch (error) {
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        // Record failed request
        const metric: NetworkMetrics = {
          requestSize,
          responseSize: 0,
          latency,
          endpoint: url,
          timestamp: Date.now()
        };

        this.networkMetrics.push(metric);
        throw error;
      }
    };
  }

  /**
   * Calculate request size in bytes
   */
  private calculateRequestSize(options?: RequestInit): number {
    if (!options?.body) return 0;
    
    if (typeof options.body === 'string') {
      return new Blob([options.body]).size;
    }
    
    if (options.body instanceof FormData) {
      // Approximate size calculation for FormData
      return 1024; // Default approximation
    }
    
    return 0;
  }

  /**
   * Calculate response size in bytes
   */
  private calculateResponseSize(response: Response): number {
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  /**
   * Create performance alert
   */
  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    value: number,
    threshold: number
  ): void {
    const alert: PerformanceAlert = {
      type,
      severity,
      message,
      value,
      threshold,
      timestamp: Date.now()
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Notify listeners
    this.notifyListeners({ type: 'alert', alert });
  }

  /**
   * Check all performance thresholds
   */
  private checkThresholds(): void {
    // This method can be extended for additional threshold checks
    // Currently, individual metrics handle their own threshold checking
  }

  /**
   * Add performance metrics listener
   */
  public addListener(callback: (metrics: unknown) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove performance metrics listener
   */
  public removeListener(callback: (metrics: unknown) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(data: unknown): void {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.warn('Performance monitoring listener error:', error);
      }
    });
  }

  /**
   * Get current performance summary
   */
  public getPerformanceSummary() {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Recent collaboration metrics
    const recentCollaboration = this.collaborationMetrics.filter(m => m.timestamp > fiveMinutesAgo);
    const avgCollaborationLatency = recentCollaboration.length > 0 
      ? recentCollaboration.reduce((sum, m) => sum + m.latency, 0) / recentCollaboration.length
      : 0;

    // Recent audio sync metrics
    const recentAudioSync = this.audioSyncMetrics.filter(m => m.timestamp > fiveMinutesAgo);
    const avgAudioSyncAccuracy = recentAudioSync.length > 0
      ? recentAudioSync.reduce((sum, m) => sum + m.deviation, 0) / recentAudioSync.length
      : 0;

    // Current memory usage
    const latestMemory = this.memoryMetrics[this.memoryMetrics.length - 1];
    const memoryUsageRatio = latestMemory 
      ? latestMemory.heapUsed / latestMemory.jsHeapSizeLimit
      : 0;

    // Recent network metrics
    const recentNetwork = this.networkMetrics.filter(m => m.timestamp > fiveMinutesAgo);
    const avgNetworkLatency = recentNetwork.length > 0
      ? recentNetwork.reduce((sum, m) => sum + m.latency, 0) / recentNetwork.length
      : 0;

    return {
      collaboration: {
        averageLatency: Math.round(avgCollaborationLatency),
        withinThreshold: avgCollaborationLatency <= this.COLLABORATION_LATENCY_CRITICAL,
        threshold: this.COLLABORATION_LATENCY_CRITICAL,
        recentOperations: recentCollaboration.length
      },
      audioSync: {
        averageAccuracy: Math.round(avgAudioSyncAccuracy),
        withinThreshold: avgAudioSyncAccuracy <= this.AUDIO_SYNC_CRITICAL,
        threshold: this.AUDIO_SYNC_CRITICAL,
        recentMeasurements: recentAudioSync.length
      },
      memory: {
        usageRatio: Math.round(memoryUsageRatio * 100) / 100,
        withinThreshold: memoryUsageRatio <= this.MEMORY_USAGE_CRITICAL,
        threshold: this.MEMORY_USAGE_CRITICAL,
        heapUsed: latestMemory?.heapUsed || 0,
        heapLimit: latestMemory?.jsHeapSizeLimit || 0
      },
      network: {
        averageLatency: Math.round(avgNetworkLatency),
        recentRequests: recentNetwork.length,
        totalDataTransferred: recentNetwork.reduce((sum, m) => sum + m.requestSize + m.responseSize, 0)
      },
      alerts: {
        total: this.alerts.length,
        critical: this.alerts.filter(a => a.severity === 'critical').length,
        warning: this.alerts.filter(a => a.severity === 'warning').length,
        recent: this.alerts.filter(a => a.timestamp > fiveMinutesAgo).length
      }
    };
  }

  /**
   * Get detailed metrics for dashboard
   */
  public getDetailedMetrics() {
    return {
      collaboration: [...this.collaborationMetrics],
      audioSync: [...this.audioSyncMetrics],
      memory: [...this.memoryMetrics],
      network: [...this.networkMetrics],
      alerts: [...this.alerts]
    };
  }

  /**
   * Clear all metrics (useful for testing or reset)
   */
  public clearMetrics(): void {
    this.collaborationMetrics = [];
    this.audioSyncMetrics = [];
    this.memoryMetrics = [];
    this.networkMetrics = [];
    this.alerts = [];
  }

  /**
   * Export metrics to backend for persistence
   */
  public async exportMetrics(): Promise<void> {
    try {
      const metrics = this.getDetailedMetrics();
      const summary = this.getPerformanceSummary();
      
      await fetch('/api/v1/monitoring/performance-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary,
          metrics,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.warn('Failed to export performance metrics:', error);
    }
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();
export default PerformanceMonitoringService;
export type { CollaborationMetrics, AudioSyncMetrics, MemoryMetrics, NetworkMetrics, PerformanceAlert };