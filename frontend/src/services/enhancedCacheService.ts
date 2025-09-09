/**
 * Enhanced Frontend Cache Service
 * 
 * Provides multi-layer caching for the frontend including:
 * - In-memory caching with LRU eviction
 * - Local Storage persistence
 * - Service Worker caching integration
 * - Cache analytics and monitoring
 * - Intelligent cache warming
 */

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
  size?: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  totalRequests: number;
  hitRate: number;
  avgResponseTime: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  persistToLocalStorage: boolean;
  useServiceWorker: boolean;
  enableAnalytics: boolean;
  compressionThreshold: number; // bytes
}

class EnhancedCacheService {
  private cache = new Map<string, CacheEntry>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    totalRequests: 0,
    hitRate: 0,
    avgResponseTime: 0
  };
  
  private tagIndex = new Map<string, Set<string>>(); // tag -> Set of keys
  private responseTimeAccumulator = 0;
  
  constructor(private config: CacheConfig = {
    maxSize: 1000,
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    persistToLocalStorage: true,
    useServiceWorker: false,
    enableAnalytics: true,
    compressionThreshold: 1024
  }) {
    this.loadFromLocalStorage();
    this.setupPeriodicCleanup();
  }

  /**
   * Get item from cache with performance tracking
   */
  get<T>(key: string): T | null {
    const startTime = performance.now();
    this.metrics.totalRequests++;
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.misses++;
      this.updateMetrics(startTime);
      return null;
    }
    
    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.metrics.misses++;
      this.updateMetrics(startTime);
      return null;
    }
    
    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.metrics.hits++;
    this.updateMetrics(startTime);
    
    return entry.data;
  }

  /**
   * Set item in cache with compression and persistence
   */
  set<T>(key: string, data: T, options: {
    ttl?: number;
    tags?: string[];
    persist?: boolean;
  } = {}): void {
    const startTime = performance.now();
    
    const ttl = options.ttl || this.config.defaultTTL;
    const tags = options.tags || [];
    
    // Calculate size for memory management
    const size = this.calculateSize(data);
    
    // Compress if needed
    const processedData = this.shouldCompress(data, size) 
      ? this.compress(data) 
      : data;
    
    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      tags,
      size
    };
    
    // Enforce cache size limit
    this.evictIfNecessary();
    
    // Store in memory cache
    this.cache.set(key, entry);
    
    // Update tag index
    this.updateTagIndex(key, tags);
    
    // Persist to localStorage if enabled
    if (this.config.persistToLocalStorage && (options.persist !== false)) {
      this.persistToStorage(key, entry);
    }
    
    this.metrics.sets++;
    this.updateMetrics(startTime);
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const startTime = performance.now();
    
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    
    // Remove from memory cache
    this.cache.delete(key);
    
    // Remove from tag index
    this.removeFromTagIndex(key, entry.tags);
    
    // Remove from localStorage
    if (this.config.persistToLocalStorage) {
      try {
        localStorage.removeItem(`cache:${key}`);
      } catch (e) {
        console.warn('Failed to remove from localStorage:', e);
      }
    }
    
    this.metrics.deletes++;
    this.updateMetrics(startTime);
    
    return true;
  }

  /**
   * Invalidate cache entries by tags
   */
  invalidateByTags(tags: string[]): number {
    let invalidatedCount = 0;
    
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        for (const key of keys) {
          if (this.delete(key)) {
            invalidatedCount++;
          }
        }
        this.tagIndex.delete(tag);
      }
    }
    
    return invalidatedCount;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    
    if (this.config.persistToLocalStorage) {
      this.clearLocalStorage();
    }
  }

  /**
   * Get or set pattern - compute value if not cached
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T> | T,
    options?: { ttl?: number; tags?: string[]; persist?: boolean }
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    this.set(key, value, options);
    return value;
  }

  /**
   * Warm cache with commonly accessed data
   */
  async warmCache(warmupData: Array<{
    key: string;
    factory: () => Promise<any> | any;
    options?: { ttl?: number; tags?: string[] };
  }>): Promise<void> {
    const promises = warmupData.map(async ({ key, factory, options }) => {
      try {
        // Only warm if not already cached
        if (this.get(key) === null) {
          const value = await factory();
          this.set(key, value, options);
        }
      } catch (error) {
        console.warn(`Failed to warm cache for key ${key}:`, error);
      }
    });
    
    await Promise.allSettled(promises);
  }

  /**
   * Get comprehensive cache metrics
   */
  getMetrics(): CacheMetrics & {
    memoryUsage: number;
    cacheSize: number;
    tagCount: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    this.updateHitRate();
    
    let oldestEntry = Date.now();
    let newestEntry = 0;
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      oldestEntry = Math.min(oldestEntry, entry.timestamp);
      newestEntry = Math.max(newestEntry, entry.timestamp);
      totalSize += entry.size || 0;
    }
    
    return {
      ...this.metrics,
      memoryUsage: totalSize,
      cacheSize: this.cache.size,
      tagCount: this.tagIndex.size,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Get cache entries for debugging/monitoring
   */
  getEntries(): Array<{
    key: string;
    data: any;
    timestamp: number;
    age: number;
    accessCount: number;
    tags: string[];
  }> {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      data: entry.data,
      timestamp: entry.timestamp,
      age: now - entry.timestamp,
      accessCount: entry.accessCount,
      tags: entry.tags
    }));
  }

  /**
   * Check if cache is healthy
   */
  healthCheck(): {
    healthy: boolean;
    issues: string[];
    stats: CacheMetrics;
  } {
    const issues: string[] = [];
    
    // Check hit rate
    if (this.metrics.hitRate < 0.5 && this.metrics.totalRequests > 100) {
      issues.push('Low cache hit rate (< 50%)');
    }
    
    // Check cache size
    if (this.cache.size >= this.config.maxSize * 0.9) {
      issues.push('Cache nearing capacity');
    }
    
    // Check for expired entries
    const expiredCount = this.countExpiredEntries();
    if (expiredCount > this.cache.size * 0.1) {
      issues.push('High number of expired entries - consider cleanup');
    }
    
    // Check localStorage availability
    if (this.config.persistToLocalStorage && !this.isLocalStorageAvailable()) {
      issues.push('localStorage not available but persistence enabled');
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      stats: this.metrics
    };
  }

  // Private methods

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictIfNecessary(): void {
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestAccess = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      this.metrics.evictions++;
    }
  }

  private updateTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  private removeFromTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  private calculateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return JSON.stringify(data).length * 2; // Rough estimate
    }
  }

  private shouldCompress(data: any, size: number): boolean {
    return size > this.config.compressionThreshold && typeof data === 'object';
  }

  private compress(data: any): any {
    // Simple compression simulation - in real implementation, 
    // you might use libraries like pako for gzip compression
    try {
      const jsonString = JSON.stringify(data);
      return {
        _compressed: true,
        _data: btoa(jsonString) // Base64 encoding as simple compression
      };
    } catch {
      return data; // Fallback to uncompressed
    }
  }

  private decompress(compressedData: any): any {
    if (compressedData && compressedData._compressed) {
      try {
        return JSON.parse(atob(compressedData._data));
      } catch {
        return compressedData; // Fallback
      }
    }
    return compressedData;
  }

  private persistToStorage(key: string, entry: CacheEntry): void {
    if (!this.isLocalStorageAvailable()) return;
    
    try {
      const storageData = {
        ...entry,
        data: this.shouldCompress(entry.data, entry.size || 0) 
          ? this.compress(entry.data) 
          : entry.data
      };
      localStorage.setItem(`cache:${key}`, JSON.stringify(storageData));
    } catch (e) {
      console.warn('Failed to persist to localStorage:', e);
    }
  }

  private loadFromLocalStorage(): void {
    if (!this.config.persistToLocalStorage || !this.isLocalStorageAvailable()) {
      return;
    }
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache:')) {
          const cacheKey = key.substring(6); // Remove 'cache:' prefix
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const entry: CacheEntry = JSON.parse(data);
              
              // Check if not expired
              if (!this.isExpired(entry)) {
                // Decompress if needed
                entry.data = this.decompress(entry.data);
                this.cache.set(cacheKey, entry);
                this.updateTagIndex(cacheKey, entry.tags);
              } else {
                // Clean up expired entry
                localStorage.removeItem(key);
              }
            } catch (e) {
              console.warn(`Failed to restore cache entry ${cacheKey}:`, e);
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
  }

  private clearLocalStorage(): void {
    if (!this.isLocalStorageAvailable()) return;
    
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cache:')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove ${key} from localStorage:`, e);
      }
    });
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private countExpiredEntries(): number {
    let count = 0;
    for (const entry of this.cache.values()) {
      if (this.isExpired(entry)) {
        count++;
      }
    }
    return count;
  }

  private setupPeriodicCleanup(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredEntries(): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    
    if (keysToDelete.length > 0 && this.config.enableAnalytics) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  private updateMetrics(startTime: number): void {
    const responseTime = performance.now() - startTime;
    this.responseTimeAccumulator += responseTime;
    this.metrics.avgResponseTime = this.responseTimeAccumulator / this.metrics.totalRequests;
    this.updateHitRate();
  }

  private updateHitRate(): void {
    if (this.metrics.totalRequests > 0) {
      this.metrics.hitRate = this.metrics.hits / this.metrics.totalRequests;
    }
  }
}

// Create and export singleton instance
export const enhancedCacheService = new EnhancedCacheService();

// Export types for use in other modules
export type { CacheEntry, CacheMetrics, CacheConfig };