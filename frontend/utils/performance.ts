/**
 * Performance Monitoring and Optimization Utilities
 *
 * Tools for measuring and improving binary trading system performance
 */

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Performance metrics storage
 */
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

const performanceMetrics: PerformanceMetric[] = [];
const MAX_METRICS = 100; // Keep last 100 measurements

/**
 * Measure execution time of a function
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T,
  logToConsole = false
): T {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  // Store metric
  performanceMetrics.push({
    name,
    duration,
    timestamp: Date.now(),
  });

  // Keep only last MAX_METRICS
  if (performanceMetrics.length > MAX_METRICS) {
    performanceMetrics.shift();
  }

  if (logToConsole) {
    console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Measure async function performance
 */
export async function measurePerformanceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  logToConsole = false
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  performanceMetrics.push({
    name,
    duration,
    timestamp: Date.now(),
  });

  if (performanceMetrics.length > MAX_METRICS) {
    performanceMetrics.shift();
  }

  if (logToConsole) {
    console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Get performance statistics for a specific operation
 */
export function getPerformanceStats(name: string): {
  count: number;
  average: number;
  min: number;
  max: number;
  last: number;
} {
  const metrics = performanceMetrics.filter((m) => m.name === name);

  if (metrics.length === 0) {
    return { count: 0, average: 0, min: 0, max: 0, last: 0 };
  }

  const durations = metrics.map((m) => m.duration);
  const sum = durations.reduce((a, b) => a + b, 0);

  return {
    count: metrics.length,
    average: sum / metrics.length,
    min: Math.min(...durations),
    max: Math.max(...durations),
    last: durations[durations.length - 1],
  };
}

/**
 * Get all performance metrics
 */
export function getAllPerformanceMetrics(): PerformanceMetric[] {
  return [...performanceMetrics];
}

/**
 * Clear all performance metrics
 */
export function clearPerformanceMetrics(): void {
  performanceMetrics.length = 0;
}

/**
 * Log performance summary to console
 */
export function logPerformanceSummary(): void {
  const uniqueNames = [...new Set(performanceMetrics.map((m) => m.name))];

  console.log("📊 Performance Summary:");
  console.table(
    uniqueNames.map((name) => {
      const stats = getPerformanceStats(name);
      return {
        Operation: name,
        Count: stats.count,
        Avg: `${stats.average.toFixed(2)}ms`,
        Min: `${stats.min.toFixed(2)}ms`,
        Max: `${stats.max.toFixed(2)}ms`,
        Last: `${stats.last.toFixed(2)}ms`,
      };
    })
  );
}

// ============================================================================
// THROTTLE & DEBOUNCE
// ============================================================================

/**
 * Throttle function - limits execution rate
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Debounce function - delays execution until after wait period
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

// ============================================================================
// MEMOIZATION
// ============================================================================

/**
 * Simple memoization for pure functions
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  maxCacheSize = 100
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);

    // Limit cache size (LRU-like)
    if (cache.size > maxCacheSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    return result;
  }) as T;
}

// ============================================================================
// REQUEST ANIMATION FRAME HELPERS
// ============================================================================

/**
 * Batch updates using requestAnimationFrame
 */
export class RafBatcher {
  private pending: Set<() => void> = new Set();
  private rafId: number | null = null;

  schedule(callback: () => void): void {
    this.pending.add(callback);

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        const callbacks = Array.from(this.pending);
        this.pending.clear();
        this.rafId = null;

        callbacks.forEach((cb) => cb());
      });
    }
  }

  cancel(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pending.clear();
  }
}

// ============================================================================
// VIEWPORT CULLING
// ============================================================================

/**
 * Check if element is in viewport
 */
export function isInViewport(
  elementX: number,
  elementY: number,
  viewportX: number,
  viewportY: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = 0
): boolean {
  return (
    elementX >= viewportX - margin &&
    elementX <= viewportX + viewportWidth + margin &&
    elementY >= viewportY - margin &&
    elementY <= viewportY + viewportHeight + margin
  );
}

/**
 * Filter items that are in viewport
 */
export function filterInViewport<T>(
  items: T[],
  getPosition: (item: T) => { x: number; y: number },
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  margin = 100
): T[] {
  return items.filter((item) => {
    const pos = getPosition(item);
    return isInViewport(
      pos.x,
      pos.y,
      viewport.x,
      viewport.y,
      viewport.width,
      viewport.height,
      margin
    );
  });
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process large array in batches to avoid blocking UI
 */
export async function processBatched<T, R>(
  items: T[],
  processor: (item: T) => R,
  batchSize = 100,
  delayBetweenBatches = 0
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = batch.map(processor);
    results.push(...batchResults);

    // Yield to browser between batches
    if (delayBetweenBatches > 0 && i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}

// ============================================================================
// CANVAS OPTIMIZATION
// ============================================================================

/**
 * Create offscreen canvas for pre-rendering
 */
export function createOffscreenCanvas(
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Canvas render cache
 */
export class CanvasCache {
  private cache = new Map<string, HTMLCanvasElement>();
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  get(key: string): HTMLCanvasElement | null {
    return this.cache.get(key) || null;
  }

  set(key: string, canvas: HTMLCanvasElement): void {
    this.cache.set(key, canvas);

    // LRU eviction
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// FRAME RATE MONITORING
// ============================================================================

/**
 * FPS monitor
 */
export class FPSMonitor {
  private frames: number[] = [];
  private lastTime = performance.now();

  update(): number {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    const fps = 1000 / delta;
    this.frames.push(fps);

    // Keep last 60 frames
    if (this.frames.length > 60) {
      this.frames.shift();
    }

    return fps;
  }

  getAverageFPS(): number {
    if (this.frames.length === 0) return 0;
    const sum = this.frames.reduce((a, b) => a + b, 0);
    return sum / this.frames.length;
  }

  reset(): void {
    this.frames = [];
    this.lastTime = performance.now();
  }
}

// ============================================================================
// MEMORY OPTIMIZATION
// ============================================================================

/**
 * Object pool for reusing objects
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    initialSize = 10,
    maxSize = 100
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }

  size(): number {
    return this.pool.length;
  }

  clear(): void {
    this.pool = [];
  }
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export const perfUtils = {
  measure: measurePerformance,
  measureAsync: measurePerformanceAsync,
  getStats: getPerformanceStats,
  logSummary: logPerformanceSummary,
  clear: clearPerformanceMetrics,
  throttle,
  debounce,
  memoize,
  RafBatcher,
  isInViewport,
  filterInViewport,
  processBatched,
  createOffscreenCanvas,
  CanvasCache,
  FPSMonitor,
  ObjectPool,
};
