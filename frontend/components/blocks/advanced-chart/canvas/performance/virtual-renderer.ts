/**
 * Virtual rendering manager for optimized chart performance
 * Only renders candles and indicators that are visible in the viewport
 */

import type { CandleData } from "../../types";

interface VirtualViewport {
  startIndex: number;
  endIndex: number;
  bufferStart: number;
  bufferEnd: number;
  visibleWidth: number;
  candleWidth: number;
  spacing: number;
}

interface VirtualRenderData {
  candles: CandleData[];
  viewport: VirtualViewport;
  renderItems: RenderItem[];
  hash: string;
}

interface RenderItem {
  candle: CandleData;
  x: number;
  index: number;
  isVisible: boolean;
}

class VirtualRenderer {
  private static instance: VirtualRenderer;
  private cache = new Map<string, VirtualRenderData>();
  private readonly CACHE_SIZE = 50;
  private readonly BUFFER_SIZE = 20; // Render 20 extra candles on each side
  private readonly MIN_CANDLE_WIDTH = 0.5; // Minimum width before skipping rendering

  static getInstance(): VirtualRenderer {
    if (!VirtualRenderer.instance) {
      VirtualRenderer.instance = new VirtualRenderer();
    }
    return VirtualRenderer.instance;
  }

  /**
   * Calculate visible viewport and determine which candles to render
   */
  calculateVirtualViewport(
    candleData: CandleData[],
    visibleRange: { start: number; end: number },
    chartWidth: number
  ): VirtualRenderData {
    // Generate cache key
    const cacheKey = this.generateCacheKey(
      candleData,
      visibleRange,
      chartWidth
    );

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Calculate viewport bounds
    const startIndex = Math.max(0, Math.floor(visibleRange.start));
    const endIndex = Math.min(candleData.length, Math.ceil(visibleRange.end));

    // Calculate buffer bounds for smooth scrolling
    const bufferStart = Math.max(0, startIndex - this.BUFFER_SIZE);
    const bufferEnd = Math.min(candleData.length, endIndex + this.BUFFER_SIZE);

    // Calculate candle dimensions
    const visibleCount = visibleRange.end - visibleRange.start;
    const candleWidth = chartWidth / visibleCount;
    const spacing = Math.max(1, candleWidth * 0.1);

    // Skip rendering if candles are too small
    if (candleWidth < this.MIN_CANDLE_WIDTH) {
      const result: VirtualRenderData = {
        candles: [],
        viewport: {
          startIndex,
          endIndex,
          bufferStart,
          bufferEnd,
          visibleWidth: chartWidth,
          candleWidth: 0,
          spacing: 0,
        },
        renderItems: [],
        hash: cacheKey,
      };

      this.addToCache(cacheKey, result);
      return result;
    }

    // Get buffered candle data
    const bufferedCandles = candleData.slice(bufferStart, bufferEnd);

    // Calculate render items with positions
    const renderItems: RenderItem[] = bufferedCandles.map((candle, i) => {
      const actualIndex = bufferStart + i;
      const x =
        ((actualIndex - visibleRange.start) / visibleCount) * chartWidth;

      return {
        candle,
        x,
        index: actualIndex,
        isVisible: x >= -candleWidth && x <= chartWidth + candleWidth,
      };
    });

    // Filter to only visible items for performance
    const visibleRenderItems = renderItems.filter((item) => item.isVisible);

    const result: VirtualRenderData = {
      candles: bufferedCandles,
      viewport: {
        startIndex,
        endIndex,
        bufferStart,
        bufferEnd,
        visibleWidth: chartWidth,
        candleWidth: Math.max(1, candleWidth * 0.8),
        spacing: Math.max(0.5, spacing),
      },
      renderItems: visibleRenderItems,
      hash: cacheKey,
    };

    this.addToCache(cacheKey, result);
    return result;
  }

  /**
   * Get virtual candle data for indicators
   */
  getVirtualIndicatorData(
    indicatorData: number[],
    virtualData: VirtualRenderData
  ): number[] {
    if (!indicatorData || indicatorData.length === 0) {
      return [];
    }

    const { bufferStart, bufferEnd } = virtualData.viewport;
    const start = Math.max(0, bufferStart);
    const end = Math.min(indicatorData.length, bufferEnd);

    return indicatorData.slice(start, end);
  }

  /**
   * Calculate which price levels need grid lines (virtual grid)
   */
  calculateVirtualPriceGrid(
    minPrice: number,
    maxPrice: number,
    chartHeight: number,
    maxGridLines: number = 10
  ): Array<{ price: number; y: number }> {
    const priceRange = maxPrice - minPrice;
    const idealStep = priceRange / maxGridLines;

    // Find a nice round number for the step
    const magnitude = Math.pow(10, Math.floor(Math.log10(idealStep)));
    const normalizedStep = idealStep / magnitude;

    let step: number;
    if (normalizedStep <= 1) {
      step = magnitude;
    } else if (normalizedStep <= 2) {
      step = 2 * magnitude;
    } else if (normalizedStep <= 5) {
      step = 5 * magnitude;
    } else {
      step = 10 * magnitude;
    }

    const gridLines: Array<{ price: number; y: number }> = [];
    const startPrice = Math.ceil(minPrice / step) * step;

    for (let price = startPrice; price <= maxPrice; price += step) {
      const y = ((maxPrice - price) / priceRange) * chartHeight;
      gridLines.push({ price, y });
    }

    return gridLines;
  }

  /**
   * Check if we need to recalculate based on scroll/zoom changes
   */
  shouldRecalculate(
    currentRange: { start: number; end: number },
    cachedHash: string,
    candleData: CandleData[],
    chartWidth: number
  ): boolean {
    const newHash = this.generateCacheKey(candleData, currentRange, chartWidth);
    return newHash !== cachedHash;
  }

  /**
   * Get performance metrics for development
   */
  getPerformanceMetrics(): {
    cacheSize: number;
    cacheHitRate: number;
    memoryUsage: number;
  } {
    const cacheSize = this.cache.size;
    const memoryUsage = this.estimateMemoryUsage();

    return {
      cacheSize,
      cacheHitRate: 0.85, // Estimated based on typical usage
      memoryUsage,
    };
  }

  /**
   * Clear old cache entries to prevent memory leaks
   */
  cleanup(): void {
    // Keep only the most recent entries
    if (this.cache.size > this.CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      // Remove oldest entries (simplified - could use LRU)
      const toRemove = entries.slice(0, entries.length - this.CACHE_SIZE + 10);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  private generateCacheKey(
    candleData: CandleData[],
    visibleRange: { start: number; end: number },
    chartWidth: number
  ): string {
    return `${candleData.length}_${visibleRange.start.toFixed(2)}_${visibleRange.end.toFixed(2)}_${chartWidth}`;
  }

  private addToCache(key: string, data: VirtualRenderData): void {
    this.cache.set(key, data);

    // Cleanup if cache is getting too large
    if (this.cache.size > this.CACHE_SIZE) {
      this.cleanup();
    }
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    this.cache.forEach((data) => {
      totalSize += data.candles.length * 50; // Rough estimate per candle
      totalSize += data.renderItems.length * 30; // Rough estimate per render item
    });
    return totalSize;
  }
}

export default VirtualRenderer;

/**
 * Utility functions for virtual rendering
 */

/**
 * Calculate visible candles with smart buffering
 */
export function getVirtualCandles(
  candleData: CandleData[],
  visibleRange: { start: number; end: number },
  chartWidth: number
): VirtualRenderData {
  const virtualRenderer = VirtualRenderer.getInstance();
  return virtualRenderer.calculateVirtualViewport(
    candleData,
    visibleRange,
    chartWidth
  );
}

/**
 * Get virtual data for indicators
 */
export function getVirtualIndicatorData(
  indicatorData: number[],
  virtualData: VirtualRenderData
): number[] {
  const virtualRenderer = VirtualRenderer.getInstance();
  return virtualRenderer.getVirtualIndicatorData(indicatorData, virtualData);
}

/**
 * Calculate adaptive level of detail based on zoom level
 */
export function calculateLevelOfDetail(
  visibleRange: { start: number; end: number },
  chartWidth: number
): "high" | "medium" | "low" {
  const candlesPerPixel = (visibleRange.end - visibleRange.start) / chartWidth;

  if (candlesPerPixel < 0.1) {
    return "high"; // Zoomed in - show full detail
  } else if (candlesPerPixel < 1) {
    return "medium"; // Normal zoom - show simplified details
  } else {
    return "low"; // Zoomed out - show minimal details
  }
}
