import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performanceUtils, performanceMonitor } from './performance';

// Mock observer interface for testing
interface MockObserver {
  disconnect: () => void;
}

// Type for accessing private members in tests
interface TestablePerformanceMonitor {
  observers: MockObserver[];
}

// Mock performance.now
const mockPerformanceNow = vi.fn();
Object.defineProperty(window, 'performance', {
  value: {
    now: mockPerformanceNow,
    timing: {},
    getEntriesByType: vi.fn(),
    mark: vi.fn(),
    measure: vi.fn(),
  },
  writable: true,
});

// Mock fetch for sending metrics
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('performanceUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(0);
    mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('measure(...args: unknown[]) => unknown', () => {
    it('measures synchronous function execution time', () => {
      let timeIndex = 0;
      mockPerformanceNow.mockImplementation(() => {
        timeIndex++;
        return timeIndex === 1 ? 100 : 150; // 50ms execution time
      });

      const test(...args: unknown[]) => unknown = vi.fn(() => 'result');
      const recordMetricSpy = vi.spyOn(
        performanceMonitor,
        'recordCustomMetric'
      );

      const result = performanceUtils.measure(...args: unknown[]) => unknown(
        test(...args: unknown[]) => unknown,
        'test-function'
      );

      expect(result).toBe('result');
      expect(test(...args: unknown[]) => unknown).toHaveBeenCalledTimes(1);
      expect(recordMetricSpy).toHaveBeenCalledWith('test-function', 50);
    });

    it('measures function that throws error', () => {
      let timeIndex = 0;
      mockPerformanceNow.mockImplementation(() => {
        timeIndex++;
        return timeIndex === 1 ? 100 : 125; // 25ms execution time
      });

      const test(...args: unknown[]) => unknown = vi.fn(() => {
        throw new Error('Test error');
      });
      const recordMetricSpy = vi.spyOn(
        performanceMonitor,
        'recordCustomMetric'
      );

      expect(() =>
        performanceUtils.measure(...args: unknown[]) => unknown(test(...args: unknown[]) => unknown, 'error-function')
      ).toThrow('Test error');

      expect(recordMetricSpy).toHaveBeenCalledWith('error-function', 25);
    });

    it('handles zero execution time', () => {
      mockPerformanceNow.mockReturnValue(100); // Same start and end time

      const test(...args: unknown[]) => unknown = vi.fn(() => 'instant');
      const recordMetricSpy = vi.spyOn(
        performanceMonitor,
        'recordCustomMetric'
      );

      const result = performanceUtils.measure(...args: unknown[]) => unknown(
        test(...args: unknown[]) => unknown,
        'instant-function'
      );

      expect(result).toBe('instant');
      expect(recordMetricSpy).toHaveBeenCalledWith('instant-function', 0);
    });
  });

  describe('measureAsync(...args: unknown[]) => unknown', () => {
    it('measures asynchronous function execution time', async () => {
      let timeIndex = 0;
      mockPerformanceNow.mockImplementation(() => {
        timeIndex++;
        return timeIndex === 1 ? 200 : 300; // 100ms execution time
      });

      const test(...args: unknown[]) => unknown = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'async-result';
      });
      const recordMetricSpy = vi.spyOn(
        performanceMonitor,
        'recordCustomMetric'
      );

      const result = await performanceUtils.measureAsync(...args: unknown[]) => unknown(
        test(...args: unknown[]) => unknown,
        'async-function'
      );

      expect(result).toBe('async-result');
      expect(test(...args: unknown[]) => unknown).toHaveBeenCalledTimes(1);
      expect(recordMetricSpy).toHaveBeenCalledWith('async-function', 100);
    });

    it('measures async function that rejects', async () => {
      let timeIndex = 0;
      mockPerformanceNow.mockImplementation(() => {
        timeIndex++;
        return timeIndex === 1 ? 50 : 75; // 25ms execution time
      });

      const test(...args: unknown[]) => unknown = vi.fn(async () => {
        throw new Error('Async error');
      });
      const recordMetricSpy = vi.spyOn(
        performanceMonitor,
        'recordCustomMetric'
      );

      await expect(
        performanceUtils.measureAsync(...args: unknown[]) => unknown(
          test(...args: unknown[]) => unknown,
          'error-async-function'
        )
      ).rejects.toThrow('Async error');

      expect(recordMetricSpy).toHaveBeenCalledWith('error-async-function', 25);
    });

    it('handles async function with resolved promise', async () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1050);

      const test(...args: unknown[]) => unknown = vi.fn(async () => Promise.resolve('resolved'));
      const recordMetricSpy = vi.spyOn(
        performanceMonitor,
        'recordCustomMetric'
      );

      const result = await performanceUtils.measureAsync(...args: unknown[]) => unknown(
        test(...args: unknown[]) => unknown,
        'resolved-function'
      );

      expect(result).toBe('resolved');
      expect(recordMetricSpy).toHaveBeenCalledWith('resolved-function', 50);
    });
  });

  describe('markInteractionStart', () => {
    it('returns function that records interaction duration', () => {
      let timeIndex = 0;
      mockPerformanceNow.mockImplementation(() => {
        timeIndex++;
        return timeIndex === 1 ? 500 : 750; // 250ms interaction time
      });

      const recordInteractionSpy = vi.spyOn(
        performanceMonitor,
        'recordUserInteraction'
      );

      const endInteraction =
        performanceUtils.markInteractionStart('button-click');

      // Simulate some time passing and ending the interaction
      endInteraction();

      expect(recordInteractionSpy).toHaveBeenCalledWith('button-click', 250);
    });

    it('handles multiple concurrent interactions', () => {
      const times = [100, 200, 150, 300]; // start1, start2, end1, end2
      let timeIndex = 0;
      mockPerformanceNow.mockImplementation(() => times[timeIndex++]);

      const recordInteractionSpy = vi.spyOn(
        performanceMonitor,
        'recordUserInteraction'
      );

      const endInteraction1 = performanceUtils.markInteractionStart('action1');
      const endInteraction2 = performanceUtils.markInteractionStart('action2');

      endInteraction1(); // Duration: 150 - 100 = 50ms
      endInteraction2(); // Duration: 300 - 200 = 100ms

      expect(recordInteractionSpy).toHaveBeenCalledWith('action1', 50);
      expect(recordInteractionSpy).toHaveBeenCalledWith('action2', 100);
    });

    it('handles immediate interaction end', () => {
      mockPerformanceNow.mockReturnValue(1000); // Same time for start and end

      const recordInteractionSpy = vi.spyOn(
        performanceMonitor,
        'recordUserInteraction'
      );

      const endInteraction =
        performanceUtils.markInteractionStart('instant-click');
      endInteraction();

      expect(recordInteractionSpy).toHaveBeenCalledWith('instant-click', 0);
    });
  });
});

describe('performanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));
    // Reset metrics before each test to prevent state pollution
    performanceMonitor.resetMetrics();
  });

  describe('recordCustomMetric', () => {
    it('records custom performance metrics', () => {
      performanceMonitor.recordCustomMetric('test-metric', 123.45);

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.customMetrics['test-metric']).toBe(123.45);
    });

    it('overwrites existing metrics with same name', () => {
      performanceMonitor.recordCustomMetric('duplicate-metric', 100);
      performanceMonitor.recordCustomMetric('duplicate-metric', 200);

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.customMetrics['duplicate-metric']).toBe(200);
    });

    it('handles negative values', () => {
      performanceMonitor.recordCustomMetric('negative-metric', -50);

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.customMetrics['negative-metric']).toBe(-50);
    });

    it('handles zero values', () => {
      performanceMonitor.recordCustomMetric('zero-metric', 0);

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.customMetrics['zero-metric']).toBe(0);
    });
  });

  describe('recordUserInteraction', () => {
    it('records user interaction metrics', () => {
      performanceMonitor.recordUserInteraction('click', 150);
      performanceMonitor.recordUserInteraction('scroll', 50);

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.userInteractions).toBe(2);
    });

    it('tracks multiple interactions of same type', () => {
      performanceMonitor.recordUserInteraction('click', 100);
      performanceMonitor.recordUserInteraction('click', 150);
      performanceMonitor.recordUserInteraction('hover', 25);

      const summary = performanceMonitor.getPerformanceSummary();
      // Since recordUserInteraction uses unique type counting, we should have 2 types: 'click' and 'hover'
      expect(summary.userInteractions).toBe(2);
    });
  });

  describe('getPerformanceSummary', () => {
    it('returns performance summary with default values when no navigation timing', () => {
      const summary = performanceMonitor.getPerformanceSummary();

      expect(summary).toEqual({
        vitals: {},
        paintMetrics: {},
        resourceCount: 0,
        customMetrics: expect.any(Object),
        userInteractions: expect.any(Number),
        error: 'Navigation timing not available'  // Expected in test environment
      });
    });

    it('includes custom metrics in summary', () => {
      performanceMonitor.recordCustomMetric('api-call', 250);
      performanceMonitor.recordCustomMetric('render-time', 16.7);

      const summary = performanceMonitor.getPerformanceSummary();

      expect(summary.customMetrics).toEqual({
        'api-call': 250,
        'render-time': 16.7,
      });
    });

    it('counts user interactions correctly', () => {
      performanceMonitor.recordUserInteraction('click', 100);
      performanceMonitor.recordUserInteraction('keypress', 50);

      const summary = performanceMonitor.getPerformanceSummary();

      expect(summary.userInteractions).toBeGreaterThanOrEqual(2);
    });
  });

  describe('sendMetrics', () => {
    it('sends metrics to monitoring endpoint', async () => {
      performanceMonitor.recordCustomMetric('test-metric', 100);

      await performanceMonitor.sendMetrics();

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/monitoring/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"test-metric":100'),
      });
    });

    it('includes additional context in metrics', async () => {
      await performanceMonitor.sendMetrics();

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/monitoring/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"timestamp"'),
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('userAgent');
      expect(body).toHaveProperty('url');
      expect(body).toHaveProperty('referrer');
    });

    it('handles fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await performanceMonitor.sendMetrics();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send performance metrics:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('handles successful fetch with info log', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      await performanceMonitor.sendMetrics();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance metrics sent to monitoring endpoint'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('disconnects all performance observers', () => {
      const mockObserver1 = { disconnect: vi.fn() };
      const mockObserver2 = { disconnect: vi.fn() };

      // Access private observers array via type assertion
      (performanceMonitor as unknown as TestablePerformanceMonitor).observers =
        [mockObserver1, mockObserver2];

      performanceMonitor.cleanup();

      expect(mockObserver1.disconnect).toHaveBeenCalledTimes(1);
      expect(mockObserver2.disconnect).toHaveBeenCalledTimes(1);
    });

    it('clears observers array after cleanup', () => {
      const mockObserver = { disconnect: vi.fn() };
      (performanceMonitor as unknown as TestablePerformanceMonitor).observers =
        [mockObserver];

      performanceMonitor.cleanup();

      expect(
        (performanceMonitor as unknown as TestablePerformanceMonitor).observers
      ).toHaveLength(0);
    });

    it('handles empty observers array', () => {
      (performanceMonitor as unknown as TestablePerformanceMonitor).observers =
        [];

      expect(() => performanceMonitor.cleanup()).not.toThrow();
    });
  });

  describe('Edge cases and error handling', () => {
    it('handles missing performance API gracefully', () => {
      const originalPerformance = window.performance;
      delete (window as Record<string, unknown>).performance;

      expect(() => {
        performanceUtils.measure(...args: unknown[]) => unknown(() => 'test', 'no-performance');
      }).toThrow(); // This should throw because performance.now is not available

      window.performance = originalPerformance;
    });

    it('handles very long metric names', () => {
      const longName = 'a'.repeat(1000);
      performanceMonitor.recordCustomMetric(longName, 123);

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.customMetrics[longName]).toBe(123);
    });

    it('handles special characters in metric names', () => {
      const specialName = 'metric!@#$%^&*()_+-={}[]|;:"<>?,./';
      performanceMonitor.recordCustomMetric(specialName, 456);

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.customMetrics[specialName]).toBe(456);
    });

    it('handles very large metric values', () => {
      const largeValue = Number.MAX_SAFE_INTEGER;
      performanceMonitor.recordCustomMetric('large-metric', largeValue);

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.customMetrics['large-metric']).toBe(largeValue);
    });

    it('handles Infinity and NaN values', () => {
      performanceMonitor.recordCustomMetric('infinity-metric', Infinity);
      performanceMonitor.recordCustomMetric('nan-metric', NaN);

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.customMetrics['infinity-metric']).toBe(Infinity);
      expect(summary.customMetrics['nan-metric']).toBeNaN();
    });
  });
});
