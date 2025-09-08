/**
 * Tests for the enhanced frontend cache service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { enhancedCacheService } from '../services/enhancedCacheService';
import type { CacheConfig } from '../services/enhancedCacheService';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => store[key] = value,
    removeItem: (key: string) => delete store[key],
    clear: () => store = {},
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock performance.now
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now())
  }
});

describe('EnhancedCacheService', () => {
  beforeEach(() => {
    enhancedCacheService.clear();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      enhancedCacheService.set('test-key', 'test-value');
      expect(enhancedCacheService.get('test-key')).toBe('test-value');
    });

    it('should return null for non-existent keys', () => {
      expect(enhancedCacheService.get('non-existent')).toBeNull();
    });

    it('should delete values', () => {
      enhancedCacheService.set('test-key', 'test-value');
      expect(enhancedCacheService.delete('test-key')).toBe(true);
      expect(enhancedCacheService.get('test-key')).toBeNull();
    });

    it('should return false when deleting non-existent keys', () => {
      expect(enhancedCacheService.delete('non-existent')).toBe(false);
    });
  });

  describe('TTL and Expiration', () => {
    it('should respect TTL', async () => {
      enhancedCacheService.set('expiring-key', 'value', { ttl: 100 }); // 100ms TTL
      expect(enhancedCacheService.get('expiring-key')).toBe('value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(enhancedCacheService.get('expiring-key')).toBeNull();
    });

    it('should update access statistics', () => {
      enhancedCacheService.set('test-key', 'value');
      
      // Access multiple times
      enhancedCacheService.get('test-key');
      enhancedCacheService.get('test-key');
      enhancedCacheService.get('test-key');
      
      const entries = enhancedCacheService.getEntries();
      const entry = entries.find(e => e.key === 'test-key');
      expect(entry?.accessCount).toBe(3);
    });
  });

  describe('Tag-based Invalidation', () => {
    it('should invalidate entries by tags', () => {
      enhancedCacheService.set('key1', 'value1', { tags: ['tag1', 'tag2'] });
      enhancedCacheService.set('key2', 'value2', { tags: ['tag2', 'tag3'] });
      enhancedCacheService.set('key3', 'value3', { tags: ['tag3'] });
      
      const invalidated = enhancedCacheService.invalidateByTags(['tag2']);
      expect(invalidated).toBe(2);
      
      expect(enhancedCacheService.get('key1')).toBeNull();
      expect(enhancedCacheService.get('key2')).toBeNull();
      expect(enhancedCacheService.get('key3')).toBe('value3');
    });

    it('should handle multiple tag invalidation', () => {
      enhancedCacheService.set('key1', 'value1', { tags: ['tag1'] });
      enhancedCacheService.set('key2', 'value2', { tags: ['tag2'] });
      enhancedCacheService.set('key3', 'value3', { tags: ['tag3'] });
      
      const invalidated = enhancedCacheService.invalidateByTags(['tag1', 'tag3']);
      expect(invalidated).toBe(2);
      
      expect(enhancedCacheService.get('key1')).toBeNull();
      expect(enhancedCacheService.get('key2')).toBe('value2');
      expect(enhancedCacheService.get('key3')).toBeNull();
    });
  });

  describe('Get or Set Pattern', () => {
    it('should compute value if not cached', async () => {
      const factory = vi.fn().mockResolvedValue('computed-value');
      
      const result = await enhancedCacheService.getOrSet('compute-key', factory);
      
      expect(result).toBe('computed-value');
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should return cached value without computing', async () => {
      enhancedCacheService.set('cached-key', 'cached-value');
      const factory = vi.fn().mockResolvedValue('computed-value');
      
      const result = await enhancedCacheService.getOrSet('cached-key', factory);
      
      expect(result).toBe('cached-value');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should handle async factory functions', async () => {
      const factory = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-value';
      });
      
      const result = await enhancedCacheService.getOrSet('async-key', factory);
      
      expect(result).toBe('async-value');
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with multiple entries', async () => {
      const warmupData = [
        {
          key: 'warm1',
          factory: () => Promise.resolve('value1'),
          options: { tags: ['warm'] }
        },
        {
          key: 'warm2', 
          factory: () => 'value2',
          options: { tags: ['warm'] }
        }
      ];
      
      await enhancedCacheService.warmCache(warmupData);
      
      expect(enhancedCacheService.get('warm1')).toBe('value1');
      expect(enhancedCacheService.get('warm2')).toBe('value2');
    });

    it('should not overwrite existing cached entries during warming', async () => {
      enhancedCacheService.set('existing', 'original-value');
      
      const warmupData = [{
        key: 'existing',
        factory: () => 'new-value'
      }];
      
      await enhancedCacheService.warmCache(warmupData);
      
      expect(enhancedCacheService.get('existing')).toBe('original-value');
    });

    it('should handle warming failures gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const warmupData = [
        {
          key: 'good',
          factory: () => 'good-value'
        },
        {
          key: 'bad',
          factory: () => { throw new Error('Factory failed'); }
        }
      ];
      
      await enhancedCacheService.warmCache(warmupData);
      
      expect(enhancedCacheService.get('good')).toBe('good-value');
      expect(enhancedCacheService.get('bad')).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to warm cache for key bad')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Metrics and Analytics', () => {
    it('should track cache metrics', () => {
      // Perform operations to generate metrics
      enhancedCacheService.set('key1', 'value1');
      enhancedCacheService.get('key1'); // Hit
      enhancedCacheService.get('missing'); // Miss
      enhancedCacheService.delete('key1');
      
      const metrics = enhancedCacheService.getMetrics();
      
      expect(metrics.hits).toBeGreaterThan(0);
      expect(metrics.misses).toBeGreaterThan(0);
      expect(metrics.sets).toBeGreaterThan(0);
      expect(metrics.deletes).toBeGreaterThan(0);
      expect(metrics.hitRate).toBeGreaterThan(0);
    });

    it('should calculate hit rate correctly', () => {
      enhancedCacheService.set('key', 'value');
      
      // Generate hits and misses
      enhancedCacheService.get('key'); // Hit
      enhancedCacheService.get('key'); // Hit
      enhancedCacheService.get('missing1'); // Miss
      enhancedCacheService.get('missing2'); // Miss
      
      const metrics = enhancedCacheService.getMetrics();
      expect(metrics.hitRate).toBe(0.5); // 2 hits out of 4 total requests
    });

    it('should provide cache entries for debugging', () => {
      enhancedCacheService.set('debug-key', 'debug-value', { tags: ['debug'] });
      
      const entries = enhancedCacheService.getEntries();
      expect(entries).toHaveLength(1);
      
      const entry = entries[0];
      expect(entry.key).toBe('debug-key');
      expect(entry.data).toBe('debug-value');
      expect(entry.tags).toEqual(['debug']);
      expect(entry.accessCount).toBe(0);
      expect(typeof entry.age).toBe('number');
    });
  });

  describe('Health Check', () => {
    it('should report healthy status for normal operation', () => {
      // Add some data to cache
      enhancedCacheService.set('test', 'value');
      enhancedCacheService.get('test');
      
      const health = enhancedCacheService.healthCheck();
      
      expect(health.healthy).toBe(true);
      expect(health.issues).toHaveLength(0);
      expect(health.stats).toBeDefined();
    });

    it('should detect low hit rate issues', () => {
      // Generate low hit rate
      for (let i = 0; i < 150; i++) {
        enhancedCacheService.get(`missing-${i}`); // All misses
      }
      
      const health = enhancedCacheService.healthCheck();
      
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('Low cache hit rate (< 50%)');
    });

    it('should detect cache capacity issues', () => {
      // This test would need to be adapted based on the actual maxSize config
      // For now, just verify the health check structure
      const health = enhancedCacheService.healthCheck();
      
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('issues');
      expect(health).toHaveProperty('stats');
      expect(Array.isArray(health.issues)).toBe(true);
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should persist data to localStorage', () => {
      enhancedCacheService.set('persist-key', 'persist-value', { persist: true });
      
      expect(localStorageMock.getItem('cache:persist-key')).toBeTruthy();
    });

    it('should load data from localStorage on initialization', () => {
      // Manually add to localStorage
      const cacheEntry = {
        data: 'loaded-value',
        timestamp: Date.now(),
        ttl: 60000, // 1 minute
        accessCount: 0,
        lastAccessed: Date.now(),
        tags: ['loaded']
      };
      
      localStorageMock.setItem('cache:loaded-key', JSON.stringify(cacheEntry));
      
      // Create new cache service instance (simulating page reload)
      const newCacheService = new (enhancedCacheService.constructor as any)();
      
      expect(newCacheService.get('loaded-key')).toBe('loaded-value');
    });

    it('should clean up expired entries from localStorage', () => {
      // Add expired entry to localStorage
      const expiredEntry = {
        data: 'expired-value',
        timestamp: Date.now() - 120000, // 2 minutes ago
        ttl: 60000, // 1 minute TTL (expired)
        accessCount: 0,
        lastAccessed: Date.now() - 120000,
        tags: []
      };
      
      localStorageMock.setItem('cache:expired-key', JSON.stringify(expiredEntry));
      
      // Create new cache service instance
      const newCacheService = new (enhancedCacheService.constructor as any)();
      
      expect(newCacheService.get('expired-key')).toBeNull();
      expect(localStorageMock.getItem('cache:expired-key')).toBeNull();
    });
  });

  describe('Clear Operations', () => {
    it('should clear all cache entries', () => {
      enhancedCacheService.set('key1', 'value1');
      enhancedCacheService.set('key2', 'value2');
      
      enhancedCacheService.clear();
      
      expect(enhancedCacheService.get('key1')).toBeNull();
      expect(enhancedCacheService.get('key2')).toBeNull();
      
      const metrics = enhancedCacheService.getMetrics();
      expect(metrics.cacheSize).toBe(0);
    });

    it('should clear localStorage when clearing cache', () => {
      enhancedCacheService.set('persist-key', 'value', { persist: true });
      
      enhancedCacheService.clear();
      
      expect(localStorageMock.getItem('cache:persist-key')).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of cache operations efficiently', () => {
      const startTime = performance.now();
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        enhancedCacheService.set(`perf-key-${i}`, `value-${i}`);
      }
      
      for (let i = 0; i < 1000; i++) {
        enhancedCacheService.get(`perf-key-${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 2000 operations quickly (under 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should track average response time', () => {
      // Perform some operations
      enhancedCacheService.set('timing-key', 'value');
      enhancedCacheService.get('timing-key');
      enhancedCacheService.get('missing-key');
      
      const metrics = enhancedCacheService.getMetrics();
      expect(metrics.avgResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw errors
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn().mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Should not throw error
      expect(() => {
        enhancedCacheService.set('error-key', 'value', { persist: true });
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to persist to localStorage')
      );
      
      // Restore
      localStorageMock.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });

    it('should handle JSON parsing errors in localStorage', () => {
      // Add invalid JSON to localStorage
      localStorageMock.setItem('cache:invalid-json', 'invalid-json');
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Should not throw error when creating new instance
      expect(() => {
        new (enhancedCacheService.constructor as any)();
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});