/**
 * Memory management utilities for chart performance optimization
 * Handles canvas memory, object pooling, and efficient data structures
 */

interface PooledCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  inUse: boolean;
  lastUsed: number;
}

interface PooledObject {
  [key: string]: any;
  poolId?: string;
  inUse?: boolean;
}

class MemoryManager {
  private static instance: MemoryManager;
  private canvasPool: PooledCanvas[] = [];
  private objectPools: Map<string, PooledObject[]> = new Map();
  private readonly MAX_POOL_SIZE = 10;
  private readonly POOL_CLEANUP_INTERVAL = 30000; // 30 seconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Get or create a canvas from the pool
   */
  getCanvas(width: number, height: number): PooledCanvas {
    // Try to find an unused canvas with matching dimensions
    let pooledCanvas = this.canvasPool.find(
      (pc) =>
        !pc.inUse && pc.canvas.width === width && pc.canvas.height === height
    );

    if (!pooledCanvas) {
      // Create new canvas if none available
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", {
        alpha: false,
        desynchronized: true, // Better performance for frequent updates
      });

      if (!ctx) {
        throw new Error("Failed to get 2D context");
      }

      canvas.width = width;
      canvas.height = height;

      pooledCanvas = {
        canvas,
        ctx,
        inUse: false,
        lastUsed: Date.now(),
      };

      // Add to pool if under limit
      if (this.canvasPool.length < this.MAX_POOL_SIZE) {
        this.canvasPool.push(pooledCanvas);
      }
    }

    pooledCanvas.inUse = true;
    pooledCanvas.lastUsed = Date.now();
    return pooledCanvas;
  }

  /**
   * Return a canvas to the pool
   */
  releaseCanvas(pooledCanvas: PooledCanvas): void {
    pooledCanvas.inUse = false;
    pooledCanvas.lastUsed = Date.now();

    // Clear the canvas for reuse
    const { canvas, ctx } = pooledCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * Get an object from a typed pool
   */
  getPooledObject<T extends PooledObject>(
    poolName: string,
    factory: () => T
  ): T {
    let pool = this.objectPools.get(poolName);
    if (!pool) {
      pool = [];
      this.objectPools.set(poolName, pool);
    }

    // Find unused object
    let obj = pool.find((o) => !o.inUse) as T;

    if (!obj) {
      // Create new object if none available
      obj = factory();
      obj.poolId = poolName;

      // Add to pool if under limit
      if (pool.length < this.MAX_POOL_SIZE) {
        pool.push(obj);
      }
    }

    obj.inUse = true;
    return obj;
  }

  /**
   * Return an object to its pool
   */
  releasePooledObject(obj: PooledObject): void {
    obj.inUse = false;

    // Reset object properties (except pool metadata)
    Object.keys(obj).forEach((key) => {
      if (key !== "poolId" && key !== "inUse") {
        delete obj[key];
      }
    });
  }

  /**
   * Optimize canvas for better performance
   */
  optimizeCanvas(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ): void {
    // Set canvas properties for better performance
    ctx.imageSmoothingEnabled = false;

    // Use device pixel ratio for crisp rendering
    const pixelRatio = window.devicePixelRatio || 1;
    if (pixelRatio !== 1) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * pixelRatio;
      canvas.height = rect.height * pixelRatio;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.scale(pixelRatio, pixelRatio);
    }
  }

  /**
   * Efficient array operations for large datasets
   */
  sliceDataEfficiently<T>(
    data: T[],
    start: number,
    end: number,
    buffer: number = 50
  ): T[] {
    // Add buffer to reduce frequent re-slicing
    const bufferedStart = Math.max(0, start - buffer);
    const bufferedEnd = Math.min(data.length, end + buffer);

    return data.slice(bufferedStart, bufferedEnd);
  }

  /**
   * Debounce function for reducing excessive calls
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Throttle function for limiting call frequency
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;

    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  /**
   * Start cleanup interval for unused resources
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.POOL_CLEANUP_INTERVAL);
  }

  /**
   * Clean up unused resources
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 60000; // 1 minute

    // Clean up canvas pool
    this.canvasPool = this.canvasPool.filter((pc) => {
      if (!pc.inUse && now - pc.lastUsed > maxAge) {
        // Remove canvas from DOM if needed
        if (pc.canvas.parentNode) {
          pc.canvas.parentNode.removeChild(pc.canvas);
        }
        return false;
      }
      return true;
    });

    // Clean up object pools
    this.objectPools.forEach((pool, poolName) => {
      const cleanPool = pool.filter((obj) => obj.inUse);
      if (cleanPool.length === 0) {
        this.objectPools.delete(poolName);
      } else if (cleanPool.length < pool.length) {
        this.objectPools.set(poolName, cleanPool);
      }
    });
  }

  /**
   * Force cleanup and destroy all resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Clean up all canvases
    this.canvasPool.forEach((pc) => {
      if (pc.canvas.parentNode) {
        pc.canvas.parentNode.removeChild(pc.canvas);
      }
    });
    this.canvasPool = [];

    // Clear all object pools
    this.objectPools.clear();
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    canvasPoolSize: number;
    activeCanvases: number;
    objectPoolsCount: number;
    totalPooledObjects: number;
  } {
    const totalPooledObjects = Array.from(this.objectPools.values()).reduce(
      (total, pool) => total + pool.length,
      0
    );

    return {
      canvasPoolSize: this.canvasPool.length,
      activeCanvases: this.canvasPool.filter((pc) => pc.inUse).length,
      objectPoolsCount: this.objectPools.size,
      totalPooledObjects,
    };
  }

  /**
   * Track virtual rendering metrics for memory optimization
   */
  private virtualRenderingMetrics = {
    renderedCandles: 0,
    totalCandles: 0,
    lastUpdate: 0,
  };

  /**
   * Update virtual rendering metrics
   */
  updateVirtualRenderingMetrics(
    renderedCandles: number,
    totalCandles: number
  ): void {
    this.virtualRenderingMetrics = {
      renderedCandles,
      totalCandles,
      lastUpdate: performance.now(),
    };
  }

  /**
   * Get virtual rendering memory savings
   */
  getVirtualRenderingStats(): {
    renderedCandles: number;
    totalCandles: number;
    memoryReduction: number;
    estimatedSavingsMB: number;
  } {
    const { renderedCandles, totalCandles } = this.virtualRenderingMetrics;
    const memoryReduction =
      totalCandles > 0
        ? ((totalCandles - renderedCandles) / totalCandles) * 100
        : 0;

    // Estimate memory savings (rough calculation: ~1KB per candle including indicators)
    const savedCandles = totalCandles - renderedCandles;
    const estimatedSavingsMB = (savedCandles * 1024) / (1024 * 1024);

    return {
      renderedCandles,
      totalCandles,
      memoryReduction,
      estimatedSavingsMB,
    };
  }
}

export default MemoryManager;
