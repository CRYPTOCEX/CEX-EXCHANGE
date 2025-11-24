"use client";

import { useMemo, useRef, useCallback, useEffect, useState } from "react";
import type { Element } from "@/types/builder";
import { useTranslations } from "next-intl";

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
  lastAccess: number;
  dependencies: string[];
  memorySize: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  memoryUsage: number;
  entryCount: number;
}

// Advanced LRU Cache with memory management
class ElementCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private maxMemory: number;
  private ttl: number;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    memoryUsage: 0,
    entryCount: 0,
  };

  constructor(maxSize = 1000, maxMemory = 50 * 1024 * 1024, ttl = 300000) {
    this.maxSize = maxSize;
    this.maxMemory = maxMemory; // 50MB default
    this.ttl = ttl; // 5 minutes default
  }

  // Generate cache key from element and dependencies
  private generateKey(
    element: Element,
    dependencies: Record<string, any> = {}
  ): string {
    const elementKey = `${element.id}-${element.type}-${JSON.stringify(element.settings || {})}-${element.content || ""}`;
    const depsKey = Object.keys(dependencies)
      .sort()
      .map((key) => `${key}:${dependencies[key]}`)
      .join("-");
    return `${elementKey}-${depsKey}`;
  }

  // Estimate memory usage of an object
  private estimateMemorySize(value: T): number {
    if (typeof value === "string") return value.length * 2;
    if (typeof value === "number") return 8;
    if (typeof value === "boolean") return 4;
    if (value === null || value === undefined) return 0;

    // Rough estimation for objects/arrays
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024; // Default 1KB for complex objects
    }
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.delete(key);
    }
  }

  // Evict least recently used entries
  private evict(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    // Remove oldest 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove && entries[i]; i++) {
      this.delete(entries[i][0]);
    }
  }

  // Set cache entry
  set(
    element: Element,
    value: T,
    dependencies: Record<string, any> = {}
  ): void {
    const key = this.generateKey(element, dependencies);
    const memorySize = this.estimateMemorySize(value);
    const now = Date.now();

    // Check if we need to cleanup
    if (
      this.cache.size >= this.maxSize ||
      this.stats.memoryUsage + memorySize > this.maxMemory
    ) {
      this.cleanup();

      if (
        this.cache.size >= this.maxSize ||
        this.stats.memoryUsage + memorySize > this.maxMemory
      ) {
        this.evict();
      }
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      hits: 0,
      lastAccess: now,
      dependencies: Object.keys(dependencies),
      memorySize,
    };

    this.cache.set(key, entry);
    this.stats.memoryUsage += memorySize;
    this.stats.entryCount = this.cache.size;
  }

  // Get cache entry
  get(element: Element, dependencies: Record<string, any> = {}): T | undefined {
    const key = this.generateKey(element, dependencies);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update access stats
    entry.hits++;
    entry.lastAccess = Date.now();
    this.stats.hits++;

    return entry.value;
  }

  // Delete cache entry
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.memoryUsage -= entry.memorySize;
      this.stats.evictions++;
      this.cache.delete(key);
      this.stats.entryCount = this.cache.size;
      return true;
    }
    return false;
  }

  // Invalidate entries by element ID
  invalidateElement(elementId: string): void {
    const toDelete: string[] = [];

    for (const [key] of this.cache) {
      if (key.startsWith(elementId)) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.delete(key);
    }
  }

  // Invalidate entries by dependency
  invalidateDependency(dependencyKey: string): void {
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (entry.dependencies.includes(dependencyKey)) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.delete(key);
    }
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      memoryUsage: 0,
      entryCount: 0,
    };
  }

  // Get cache statistics
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Get cache efficiency
  getEfficiency(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }
}

// Global cache instances
const renderCache = new ElementCache<React.ReactNode>(500, 25 * 1024 * 1024);
const styleCache = new ElementCache<React.CSSProperties>(
  1000,
  10 * 1024 * 1024
);
const computationCache = new ElementCache<any>(2000, 15 * 1024 * 1024);

// Hook for cached element rendering
export function useCachedElementRender(
  element: Element,
  renderFn: () => React.ReactNode,
  dependencies: Record<string, any> = {}
): React.ReactNode {
  return useMemo(() => {
    // Try to get from cache first
    const cached = renderCache.get(element, dependencies);
    if (cached) {
      return cached;
    }

    // Render and cache
    const rendered = renderFn();
    renderCache.set(element, rendered, dependencies);
    return rendered;
  }, [
    element.id,
    element.type,
    element.content,
    JSON.stringify(element.settings),
    JSON.stringify(dependencies),
  ]);
}

// Hook for cached style computation
export function useCachedStyles(
  element: Element,
  styleFn: () => React.CSSProperties,
  dependencies: Record<string, any> = {}
): React.CSSProperties {
  return useMemo(() => {
    const cached = styleCache.get(element, dependencies);
    if (cached) {
      return cached;
    }

    const styles = styleFn();
    styleCache.set(element, styles, dependencies);
    return styles;
  }, [
    element.id,
    JSON.stringify(element.settings),
    JSON.stringify(dependencies),
  ]);
}

// Hook for cached computations
export function useCachedComputation<T>(
  element: Element,
  computeFn: () => T,
  dependencies: Record<string, any> = {}
): T {
  return useMemo(() => {
    const cached = computationCache.get(element, dependencies);
    if (cached !== undefined) {
      return cached;
    }

    const result = computeFn();
    computationCache.set(element, result, dependencies);
    return result;
  }, [
    element.id,
    JSON.stringify(element.settings),
    JSON.stringify(dependencies),
  ]);
}

// Hook for cache invalidation
export function useCacheInvalidation() {
  const invalidateElement = useCallback((elementId: string) => {
    renderCache.invalidateElement(elementId);
    styleCache.invalidateElement(elementId);
    computationCache.invalidateElement(elementId);
  }, []);

  const invalidateDependency = useCallback((dependencyKey: string) => {
    renderCache.invalidateDependency(dependencyKey);
    styleCache.invalidateDependency(dependencyKey);
    computationCache.invalidateDependency(dependencyKey);
  }, []);

  const clearAllCaches = useCallback(() => {
    renderCache.clear();
    styleCache.clear();
    computationCache.clear();
  }, []);

  return {
    invalidateElement,
    invalidateDependency,
    clearAllCaches,
  };
}

// Hook for cache monitoring
export function useCacheMonitor() {
  const [stats, setStats] = useState<{
    render: CacheStats;
    style: CacheStats;
    computation: CacheStats;
  }>({
    render: renderCache.getStats(),
    style: styleCache.getStats(),
    computation: computationCache.getStats(),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        render: renderCache.getStats(),
        style: styleCache.getStats(),
        computation: computationCache.getStats(),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const efficiency = useMemo(
    () => ({
      render: renderCache.getEfficiency(),
      style: styleCache.getEfficiency(),
      computation: computationCache.getEfficiency(),
    }),
    [stats]
  );

  return {
    stats,
    efficiency,
    totalMemoryUsage:
      stats.render.memoryUsage +
      stats.style.memoryUsage +
      stats.computation.memoryUsage,
    totalEntries:
      stats.render.entryCount +
      stats.style.entryCount +
      stats.computation.entryCount,
  };
}

// Performance monitoring component
export function CachePerformanceMonitor({
  enabled = false,
}: {
  enabled?: boolean;
}) {
  const t = useTranslations("dashboard");
  const { stats, efficiency, totalMemoryUsage, totalEntries } =
    useCacheMonitor();

  if (!enabled || process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono z-50">
      <div className="mb-2 font-bold">{t("cache_performance")}</div>
      <div>
        {t("memory")}
        {(totalMemoryUsage / 1024 / 1024).toFixed(1)}
        {'MB'}
      </div>
      <div>
        {t("entries")}
        {totalEntries}
      </div>
      <div className="mt-2">
        <div>
          {t("render")}
          {(efficiency.render * 100).toFixed(1)}
          {'% ('}
          {stats.render.hits}
          {'h/'}
          {stats.render.misses}
          {'m)'}
        </div>
        <div>
          {t("style")}
          {(efficiency.style * 100).toFixed(1)}
          {'% ('}
          {stats.style.hits}
          {'h/'}
          {stats.style.misses}
          {'m)'}
        </div>
        <div>
          {t("compute")}
          {(efficiency.computation * 100).toFixed(1)}
          {'% ('}
          {stats.computation.hits}
          {'h/'}
          {stats.computation.misses}
          {'m)'}
        </div>
      </div>
    </div>
  );
}

// Automatic cache cleanup hook
export function useCacheCleanup() {
  useEffect(() => {
    const cleanup = () => {
      // Clean up caches every 5 minutes
      renderCache.cleanup?.();
      styleCache.cleanup?.();
      computationCache.cleanup?.();
    };

    const interval = setInterval(cleanup, 5 * 60 * 1000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, []);
}

export { renderCache, styleCache, computationCache };
