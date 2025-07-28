/**
 * Performance-optimized render manager for chart rendering
 * Implements efficient rendering using RAF, throttling, and caching
 */

interface RenderOptions {
  forceRender?: boolean;
  highPriority?: boolean;
  skipCache?: boolean;
}

interface RenderState {
  lastRenderTime: number;
  renderQueued: boolean;
  lastHash: string;
  frameId: number | null;
}

class RenderManager {
  private static instance: RenderManager;
  private renderState: RenderState = {
    lastRenderTime: 0,
    renderQueued: false,
    lastHash: "",
    frameId: null,
  };

  private readonly THROTTLE_INTERVAL = 16; // ~60fps
  private readonly HIGH_PRIORITY_INTERVAL = 8; // ~120fps for interactions
  private readonly MAX_RENDER_TIME = 100; // Max time between renders

  static getInstance(): RenderManager {
    if (!RenderManager.instance) {
      RenderManager.instance = new RenderManager();
    }
    return RenderManager.instance;
  }

  /**
   * Queue a render operation with throttling
   */
  queueRender(renderFn: () => void, options: RenderOptions = {}): void {
    const now = performance.now();
    const timeSinceLastRender = now - this.renderState.lastRenderTime;

    // Determine throttle interval based on priority
    const throttleInterval = options.highPriority
      ? this.HIGH_PRIORITY_INTERVAL
      : this.THROTTLE_INTERVAL;

    // Force render if enough time has passed or if explicitly requested
    const shouldForceRender =
      options.forceRender || timeSinceLastRender > this.MAX_RENDER_TIME;

    // Skip if render is already queued and not high priority
    if (
      this.renderState.renderQueued &&
      !options.highPriority &&
      !shouldForceRender
    ) {
      return;
    }

    // Cancel existing frame if we have a higher priority render
    if (this.renderState.frameId !== null && options.highPriority) {
      cancelAnimationFrame(this.renderState.frameId);
      this.renderState.frameId = null;
    }

    // Throttle non-critical renders
    if (!shouldForceRender && timeSinceLastRender < throttleInterval) {
      if (!this.renderState.renderQueued) {
        this.renderState.renderQueued = true;
        this.renderState.frameId = requestAnimationFrame(() => {
          this.executeRender(renderFn, options);
        });
      }
      return;
    }

    // Execute immediately for high priority or overdue renders
    this.executeRender(renderFn, options);
  }

  private executeRender(renderFn: () => void, options: RenderOptions): void {
    const startTime = performance.now();

    try {
      renderFn();
      this.renderState.lastRenderTime = performance.now();
    } catch (error) {
      console.error("Render error:", error);
    } finally {
      this.renderState.renderQueued = false;
      this.renderState.frameId = null;

      // Log performance for development
      if (process.env.NODE_ENV === "development") {
        const renderTime = performance.now() - startTime;
        if (renderTime > 16) {
          console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`);
        }
      }
    }
  }

  /**
   * Generate a hash for render data to detect changes
   */
  generateRenderHash(data: any): string {
    // Simple hash function for detecting data changes
    return JSON.stringify({
      dataLength: data.candleData?.length || 0,
      visibleStart: data.visibleRange?.start || 0,
      visibleEnd: data.visibleRange?.end || 0,
      mouseX: data.mousePosition?.x || 0,
      mouseY: data.mousePosition?.y || 0,
      chartType: data.chartType,
      indicators: data.indicators?.map((i: any) => i.id).join(",") || "",
      theme: data.theme,
      isDragging: data.isDragging,
    });
  }

  /**
   * Check if render is needed based on data changes
   */
  shouldRender(data: any, options: RenderOptions = {}): boolean {
    if (options.forceRender || options.skipCache) {
      return true;
    }

    const currentHash = this.generateRenderHash(data);
    const hasChanged = currentHash !== this.renderState.lastHash;

    if (hasChanged) {
      this.renderState.lastHash = currentHash;
    }

    return hasChanged;
  }

  /**
   * Force render for resize events
   */
  forceRenderForResize(renderFn: () => void): void {
    // Cancel any existing render
    if (this.renderState.frameId !== null) {
      cancelAnimationFrame(this.renderState.frameId);
      this.renderState.frameId = null;
    }

    // Execute immediately with highest priority
    this.executeRender(renderFn, { forceRender: true, highPriority: true });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.renderState.frameId !== null) {
      cancelAnimationFrame(this.renderState.frameId);
      this.renderState.frameId = null;
    }
    this.renderState.renderQueued = false;
  }
}

export default RenderManager;
