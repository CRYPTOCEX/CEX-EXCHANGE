/**
 * Performance monitoring utility for chart optimization
 * Tracks FPS, render times, memory usage, and provides insights
 */

interface PerformanceMetrics {
  fps: number;
  avgRenderTime: number;
  maxRenderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  renderCount: number;
  droppedFrames: number;
}

interface PerformanceConfig {
  enableLogging: boolean;
  sampleSize: number;
  warningThresholds: {
    minFps: number;
    maxRenderTime: number;
    maxMemoryMB: number;
  };
  virtualRendering?: {
    renderedCandles: number;
    totalCandles: number;
    memoryReduction: number;
    cacheHitRate: number;
  };
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private config: PerformanceConfig;
  private renderTimes: number[] = [];
  private frameTimestamps: number[] = [];
  private renderCount = 0;
  private droppedFrames = 0;
  private lastFrameTime = 0;
  private performanceObserver: PerformanceObserver | null = null;

  private readonly DEFAULT_CONFIG: PerformanceConfig = {
    enableLogging: process.env.NODE_ENV === "development",
    sampleSize: 60, // Track last 60 frames
    warningThresholds: {
      minFps: 30,
      maxRenderTime: 16, // 16ms for 60fps
      maxMemoryMB: 100,
    },
    virtualRendering: {
      renderedCandles: 0,
      totalCandles: 0,
      memoryReduction: 0,
      cacheHitRate: 0,
    },
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.initializePerformanceObserver();
  }

  /**
   * Initialize Performance Observer for detailed metrics
   */
  private initializePerformanceObserver(): void {
    if (typeof PerformanceObserver !== "undefined") {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (
            entry.entryType === "measure" &&
            entry.name.startsWith("chart-")
          ) {
            this.recordRenderTime(entry.duration);
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ["measure"] });
    }
  }

  /**
   * Mark the start of a render operation
   */
  startRender(name = "chart-render"): string {
    const markName = `${name}-start-${this.renderCount}`;
    if (typeof performance !== "undefined" && performance.mark) {
      performance.mark(markName);
    }
    return markName;
  }

  /**
   * Mark the end of a render operation
   */
  endRender(startMarkName: string, name = "chart-render"): number {
    const endMarkName = `${name}-end-${this.renderCount}`;
    const measureName = `${name}-${this.renderCount}`;

    let duration = 0;

    if (
      typeof performance !== "undefined" &&
      performance.mark &&
      performance.measure
    ) {
      performance.mark(endMarkName);

      try {
        performance.measure(measureName, startMarkName, endMarkName);
        const entries = performance.getEntriesByName(measureName);
        if (entries.length > 0) {
          duration = entries[0].duration;
        }
      } catch (error) {
        // Fallback if marks don't exist
        console.warn("Performance measurement failed:", error);
      }
    }

    this.recordRenderTime(duration);
    this.renderCount++;

    return duration;
  }

  /**
   * Record render time manually
   */
  recordRenderTime(duration: number): void {
    this.renderTimes.push(duration);

    // Keep only recent samples
    if (this.renderTimes.length > this.config.sampleSize) {
      this.renderTimes.shift();
    }

    // Check for performance warnings
    this.checkPerformanceWarnings(duration);
  }

  /**
   * Record frame timestamp for FPS calculation
   */
  recordFrame(): void {
    const now = performance.now();
    this.frameTimestamps.push(now);

    // Keep only recent frames
    if (this.frameTimestamps.length > this.config.sampleSize) {
      this.frameTimestamps.shift();
    }

    // Check for dropped frames
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      if (frameTime > 33) {
        // More than 30fps threshold
        this.droppedFrames++;
      }
    }

    this.lastFrameTime = now;
  }

  /**
   * Calculate current FPS
   */
  private calculateFPS(): number {
    if (this.frameTimestamps.length < 2) return 0;

    const timeSpan =
      this.frameTimestamps[this.frameTimestamps.length - 1] -
      this.frameTimestamps[0];
    const frameCount = this.frameTimestamps.length - 1;

    return frameCount / (timeSpan / 1000);
  }

  /**
   * Calculate average render time
   */
  private calculateAvgRenderTime(): number {
    if (this.renderTimes.length === 0) return 0;

    const sum = this.renderTimes.reduce((a, b) => a + b, 0);
    return sum / this.renderTimes.length;
  }

  /**
   * Calculate maximum render time
   */
  private calculateMaxRenderTime(): number {
    if (this.renderTimes.length === 0) return 0;
    return Math.max(...this.renderTimes);
  }

  /**
   * Get memory usage information
   */
  private getMemoryUsage(): number {
    if (typeof (performance as any).memory !== "undefined") {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1048576; // Convert to MB
    }
    return 0;
  }

  /**
   * Check for performance warnings
   */
  private checkPerformanceWarnings(renderTime: number): void {
    if (!this.config.enableLogging) return;

    const fps = this.calculateFPS();
    const memoryMB = this.getMemoryUsage();

    // Check FPS warning
    if (fps > 0 && fps < this.config.warningThresholds.minFps) {
      console.warn(
        `Chart Performance Warning: Low FPS detected (${fps.toFixed(1)})`
      );
    }

    // Check render time warning
    if (renderTime > this.config.warningThresholds.maxRenderTime) {
      console.warn(
        `Chart Performance Warning: Slow render detected (${renderTime.toFixed(2)}ms)`
      );
    }

    // Check memory warning
    if (memoryMB > this.config.warningThresholds.maxMemoryMB) {
      console.warn(
        `Chart Performance Warning: High memory usage (${memoryMB.toFixed(1)}MB)`
      );
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      fps: this.calculateFPS(),
      avgRenderTime: this.calculateAvgRenderTime(),
      maxRenderTime: this.calculateMaxRenderTime(),
      memoryUsage: this.getMemoryUsage(),
      cacheHitRate: 0, // To be implemented with cache integration
      renderCount: this.renderCount,
      droppedFrames: this.droppedFrames,
    };
  }

  /**
   * Get performance summary for debugging
   */
  getSummary(): string {
    const metrics = this.getMetrics();

    return `Chart Performance Summary:
FPS: ${metrics.fps.toFixed(1)}
Avg Render Time: ${metrics.avgRenderTime.toFixed(2)}ms
Max Render Time: ${metrics.maxRenderTime.toFixed(2)}ms
Memory Usage: ${metrics.memoryUsage.toFixed(1)}MB
Total Renders: ${metrics.renderCount}
Dropped Frames: ${metrics.droppedFrames}`;
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    if (this.config.enableLogging) {
      console.log(this.getSummary());
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.renderTimes = [];
    this.frameTimestamps = [];
    this.renderCount = 0;
    this.droppedFrames = 0;
    this.lastFrameTime = 0;
  }

  /**
   * Create a performance-monitored wrapper for functions
   */
  monitor<T extends (...args: any[]) => any>(
    fn: T,
    name?: string
  ): (...args: Parameters<T>) => ReturnType<T> {
    return (...args: Parameters<T>): ReturnType<T> => {
      const startMark = this.startRender(name);
      const result = fn(...args);
      this.endRender(startMark, name);
      return result;
    };
  }

  /**
   * Get optimization recommendations based on metrics
   */
  getOptimizationRecommendations(): string[] {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];

    if (metrics.fps < this.config.warningThresholds.minFps) {
      recommendations.push(
        "Consider reducing render complexity or increasing throttling intervals"
      );
    }

    if (metrics.avgRenderTime > this.config.warningThresholds.maxRenderTime) {
      recommendations.push(
        "Optimize rendering pipeline - consider caching or reducing draw operations"
      );
    }

    if (metrics.memoryUsage > this.config.warningThresholds.maxMemoryMB) {
      recommendations.push(
        "Review memory usage - consider object pooling or garbage collection optimization"
      );
    }

    if (metrics.droppedFrames > metrics.renderCount * 0.1) {
      recommendations.push(
        "High frame drop rate detected - consider adaptive quality settings"
      );
    }

    return recommendations;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    this.reset();
  }
}

export default PerformanceMonitor;
export type { PerformanceMetrics, PerformanceConfig };
