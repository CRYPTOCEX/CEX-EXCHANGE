/**
 * Data caching system for chart performance optimization
 * Implements LRU cache, computed value caching, and efficient data structures
 */

interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
}

interface ComputedValue<T> {
  value: T;
  dependencies: string[];
  computed: number;
  valid: boolean;
}

class DataCache {
  private static instance: DataCache;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private computedCache: Map<string, ComputedValue<any>> = new Map();
  private readonly maxSize: number = 1000;
  private readonly maxAge: number = 300000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  static getInstance(): DataCache {
    if (!DataCache.instance) {
      DataCache.instance = new DataCache();
    }
    return DataCache.instance;
  }

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T): void {
    const now = Date.now();

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      key,
      value,
      timestamp: now,
      accessCount: 0,
      lastAccess: now,
    });
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();

    // Check if entry is expired
    if (now - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccess = now;

    return entry.value as T;
  }

  /**
   * Check if a key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.computedCache.clear();
  }

  /**
   * Cache computed values with dependency tracking
   */
  setComputed<T>(key: string, value: T, dependencies: string[] = []): void {
    this.computedCache.set(key, {
      value,
      dependencies,
      computed: Date.now(),
      valid: true,
    });
  }

  /**
   * Get computed value if still valid
   */
  getComputed<T>(key: string): T | null {
    const computed = this.computedCache.get(key);
    if (!computed || !computed.valid) {
      return null;
    }

    // Check if dependencies are still valid
    for (const dep of computed.dependencies) {
      if (!this.has(dep)) {
        computed.valid = false;
        return null;
      }
    }

    return computed.value as T;
  }

  /**
   * Invalidate computed values that depend on a key
   */
  invalidateDependent(key: string): void {
    for (const [computedKey, computed] of this.computedCache.entries()) {
      if (computed.dependencies.includes(key)) {
        computed.valid = false;
      }
    }
  }

  /**
   * Memoize expensive calculations
   */
  memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

      if (cache.has(key)) {
        return cache.get(key)!;
      }

      const result = fn(...args);
      cache.set(key, result);

      // Clean up cache if it gets too large
      if (cache.size > 100) {
        const keys = Array.from(cache.keys());
        const toDelete = keys.slice(0, 50);
        toDelete.forEach((k) => cache.delete(k));
      }

      return result;
    }) as T;
  }

  /**
   * Cache candlestick data with smart invalidation
   */
  setCandleData(symbol: string, timeframe: string, data: any[]): void {
    const key = `candles_${symbol}_${timeframe}`;
    this.set(key, data);

    // Invalidate computed values that depend on this data
    this.invalidateDependent(key);
  }

  /**
   * Get cached candlestick data
   */
  getCandleData(symbol: string, timeframe: string): any[] | null {
    const key = `candles_${symbol}_${timeframe}`;
    return this.get(key);
  }

  /**
   * Cache indicator calculations
   */
  setIndicatorData(
    symbol: string,
    timeframe: string,
    indicatorType: string,
    params: any,
    data: any
  ): void {
    const key = `indicator_${symbol}_${timeframe}_${indicatorType}_${JSON.stringify(params)}`;
    const candleKey = `candles_${symbol}_${timeframe}`;

    this.setComputed(key, data, [candleKey]);
  }

  /**
   * Get cached indicator data
   */
  getIndicatorData(
    symbol: string,
    timeframe: string,
    indicatorType: string,
    params: any
  ): any | null {
    const key = `indicator_${symbol}_${timeframe}_${indicatorType}_${JSON.stringify(params)}`;
    return this.getComputed(key);
  }

  /**
   * Cache rendered frame data
   */
  setRenderCache(key: string, imageData: ImageData | HTMLCanvasElement): void {
    // Only cache small render artifacts to avoid memory issues
    if (imageData instanceof ImageData && imageData.data.length < 1000000) {
      this.set(`render_${key}`, imageData);
    }
  }

  /**
   * Get cached render data
   */
  getRenderCache(key: string): ImageData | HTMLCanvasElement | null {
    return this.get(`render_${key}`);
  }

  /**
   * Evict oldest entries based on LRU algorithm
   */
  private evictOldest(): void {
    let oldestKey = "";
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Prefer to evict entries with low access count and old last access time
      const score = entry.lastAccess - entry.accessCount * 10000;
      if (score < oldestTime) {
        oldestTime = score;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean up main cache
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }

    // Clean up computed cache
    for (const [key, computed] of this.computedCache.entries()) {
      if (!computed.valid || now - computed.computed > this.maxAge) {
        this.computedCache.delete(key);
      }
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    computedSize: number;
  } {
    const hits = Array.from(this.cache.values()).reduce(
      (total, entry) => total + entry.accessCount,
      0
    );
    const misses = this.cache.size; // Approximation

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: hits / (hits + misses) || 0,
      computedSize: this.computedCache.size,
    };
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

export default DataCache;
