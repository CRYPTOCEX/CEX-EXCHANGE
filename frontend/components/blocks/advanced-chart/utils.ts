import type React from "react";
import type { CandleData } from "./types";

// Import time functions from the new location
import { getChartSynchronizedTime, formatChartTime } from "@/utils/time-sync";
import { formatPriceWithPrecision, type MarketMetadata } from "@/lib/precision-utils";

// Global reference to candleData for time-based slicing
let globalCandleData: CandleData[] = [];

// Current price range that can be accessed by other components
export const currentPriceRange = { min: 0, max: 0 };

// Format price with appropriate precision
export function formatPrice(price: number, metadata?: MarketMetadata): string {
  if (typeof price !== "number") return "0.00";

  // Use metadata precision if available
  if (metadata) {
    return formatPriceWithPrecision(price, metadata);
  }

  // Fallback to original logic
  if (price >= 1000) {
    return price.toFixed(2);
  } else if (price >= 100) {
    return price.toFixed(3);
  } else if (price >= 10) {
    return price.toFixed(4);
  } else if (price >= 1) {
    return price.toFixed(5);
  } else {
    // For very small numbers, use scientific notation
    return price.toFixed(8);
  }
}

// Format large numbers with K, M, B suffixes
export function formatLargeNumber(num: number): string {
  if (typeof num !== "number") return "0";

  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + "B";
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  } else {
    return num.toFixed(0);
  }
}

// Format date for display
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString();
}

// Format time for display
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Convert Binance kline data to our format
export function formatKlineData(data: any[]): any[] {
  return data.map((kline) => {
    const time = Math.floor(kline[0] / 1000); // Binance timestamp is in milliseconds
    const date = new Date(kline[0]);
    const open = Number.parseFloat(kline[1]);
    const high = Number.parseFloat(kline[2]);
    const low = Number.parseFloat(kline[3]);
    const close = Number.parseFloat(kline[4]);
    const volume = Number.parseFloat(kline[5]);
    const isBullish = close >= open;

    return {
      time,
      timestamp: date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: date.toLocaleDateString([], { month: "short", day: "numeric" }),
      open,
      high,
      low,
      close,
      volume,
      color: isBullish ? "#22c55e" : "#ef4444",
    };
  });
}

// Convert timeframe to Binance interval format
export function getIntervalString(timeFrame: string): string {
  const intervals: Record<string, string> = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "1h": "1h",
    "4h": "4h",
    "1d": "1d",
  };
  return intervals[timeFrame] || "1m";
}

// Helper to convert interval string to milliseconds
export function getIntervalMs(interval: string): number {
  const unit = interval.slice(-1);
  const value = Number.parseInt(interval.slice(0, -1));

  switch (unit) {
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "w":
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      return 60 * 1000; // Default to 1m
  }
}

// Calculate the number of candles needed to fill a time range
export function calculateCandlesNeeded(
  startTime: number,
  endTime: number,
  timeFrame: string
): number {
  const intervalMs = getIntervalMs(timeFrame);
  const timeRangeMs = endTime - startTime;
  return Math.ceil(timeRangeMs / intervalMs);
}

// Calculate the start time for fetching a specific number of candles before an end time
export function calculateStartTime(
  endTime: number,
  candleCount: number,
  timeFrame: string
): number {
  const intervalMs = getIntervalMs(timeFrame);
  return endTime - candleCount * intervalMs;
}

// Set global candle data for indicator rendering
export function setGlobalCandleData(data: any[]): void {
  if (typeof window !== "undefined") {
    (window as any).globalCandleData = data;
  }
  globalCandleData = data;
}

// Convert price to Y coordinate
export function priceToY(
  price: number,
  candleData: any[],
  visibleRange: { start: number; end: number },
  dimensions: { width: number; height: number },
  timeScaleHeight: number
): number {
  if (candleData.length === 0) return 0;

  // Calculate visible data
  const start = Math.max(0, Math.floor(visibleRange.start));
  const end = Math.min(candleData.length, Math.ceil(visibleRange.end));
  const visibleData = candleData.slice(start, end);

  if (visibleData.length === 0) return 0;

  // Calculate price range with padding
  let minPrice = Math.min(...visibleData.map((d: any) => d.low));
  let maxPrice = Math.max(...visibleData.map((d: any) => d.high));
  const priceRange = maxPrice - minPrice;
  const pricePadding = priceRange * 0.1;
  minPrice = Math.max(0, minPrice - pricePadding);
  maxPrice = maxPrice + pricePadding;

  const chartHeight = dimensions.height * 0.8 - timeScaleHeight;
  return ((maxPrice - price) / (maxPrice - minPrice)) * chartHeight;
}

// Convert Y coordinate to price
export function yToPrice(
  y: number,
  candleData: any[],
  visibleRange: { start: number; end: number },
  dimensions: { width: number; height: number },
  timeScaleHeight: number
): number {
  if (candleData.length === 0) return 0;

  // Calculate visible data
  const start = Math.max(0, Math.floor(visibleRange.start));
  const end = Math.min(candleData.length, Math.ceil(visibleRange.end));
  const visibleData = candleData.slice(start, end);

  if (visibleData.length === 0) return 0;

  // Calculate price range with padding
  let minPrice = Math.min(...visibleData.map((d: any) => d.low));
  let maxPrice = Math.max(...visibleData.map((d: any) => d.high));
  const priceRange = maxPrice - minPrice;
  const pricePadding = priceRange * 0.1;
  minPrice = Math.max(0, minPrice - pricePadding);
  maxPrice = maxPrice + pricePadding;

  const chartHeight = dimensions.height * 0.8 - timeScaleHeight;
  return maxPrice - (y / chartHeight) * (maxPrice - minPrice);
}

// Zoom in function
export function zoomIn(
  visibleRange: { start: number; end: number },
  isInteractingRef: React.MutableRefObject<boolean>,
  setVisibleRange: (range: { start: number; end: number }) => void
): void {
  isInteractingRef.current = true;

  const visibleCount = visibleRange.end - visibleRange.start;

  // Calculate zoom center (middle of current view)
  const center = (visibleRange.start + visibleRange.end) / 2;

  // Use a larger zoom factor for more immediate response
  const zoomFactor = 0.7; // Zoom in by 30% for more immediate effect

  // Reduce the minimum visible candles from 10 to 5 to allow more zoom
  const newVisibleCount = Math.max(5, visibleCount * zoomFactor);

  // Calculate new start and end while keeping the center point fixed
  const newStart = center - newVisibleCount / 2;
  const newEnd = center + newVisibleCount / 2;

  // Update the visible range directly
  setVisibleRange({ start: newStart, end: newEnd });

  // Force an immediate render by dispatching a custom event
  if (typeof window !== "undefined") {
    const event = new CustomEvent("chartZoom", {
      detail: { start: newStart, end: newEnd },
    });
    window.dispatchEvent(event);
  }
}

// Zoom out function
export function zoomOut(
  visibleRange: { start: number; end: number },
  candleData: any[],
  isInteractingRef: React.MutableRefObject<boolean>,
  setVisibleRange: (range: { start: number; end: number }) => void
): void {
  isInteractingRef.current = true;

  const visibleCount = visibleRange.end - visibleRange.start;

  // Calculate zoom center (middle of current view)
  const center = (visibleRange.start + visibleRange.end) / 2;

  // Use a larger zoom factor for more immediate response
  const zoomFactor = 1.4; // Zoom out by 40% for more immediate effect

  const newVisibleCount = Math.min(
    candleData.length * 1.2,
    visibleCount * zoomFactor
  );

  // Calculate new start and end while keeping the center point fixed
  const newStart = center - newVisibleCount / 2;
  const newEnd = center + newVisibleCount / 2;

  // Update the visible range directly
  setVisibleRange({ start: newStart, end: newEnd });

  // Force an immediate render by dispatching a custom event
  if (typeof window !== "undefined") {
    const event = new CustomEvent("chartZoom", {
      detail: { start: newStart, end: newEnd },
    });
    window.dispatchEvent(event);
  }
}

// Reset zoom function
export function resetZoom(
  candleData: any[],
  setVisibleRange: (range: { start: number; end: number }) => void
): void {
  if (candleData.length > 0) {
    setVisibleRange({
      start: Math.max(0, candleData.length - 100),
      end: candleData.length,
    });

    // Force an immediate render
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        // This empty callback forces a repaint
      });
    }
  }
}

// Re-export these functions
export { getChartSynchronizedTime, formatChartTime };

// Format time label based on timestamp
export function formatTimeLabel(timestamp: number): string {
  try {
    const date = new Date(timestamp);

    // For timestamps that are valid dates
    if (!isNaN(date.getTime())) {
      // Format: HH:MM
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // Fallback for invalid timestamps
    return "";
  } catch (error) {
    console.error("Error formatting time label:", error);
    return "";
  }
}

// Get visible data with buffer but without generating future candles
export function getVisibleDataWithBuffer(
  data: CandleData[],
  visibleRange: { start: number; end: number } | undefined
) {
  // If visibleRange is undefined, use the entire dataset
  if (!visibleRange) {
    return data;
  }

  // Calculate visible data - ONLY process what's in view and exists
  const start = Math.max(0, Math.floor(visibleRange.start));
  const end = Math.min(data.length, Math.ceil(visibleRange.end));

  // If there's no data in the visible range, return empty array
  if (start >= end) return [];

  // Add a buffer to prevent popping at edges (load a bit more data than visible)
  const bufferSize = Math.min(20, Math.floor((end - start) * 0.1)); // 10% buffer or max 20 candles
  const bufferedStart = Math.max(0, start - bufferSize);
  const bufferedEnd = Math.min(data.length, end + bufferSize);
  const bufferedVisibleData = data.slice(bufferedStart, bufferedEnd);

  return bufferedVisibleData;
}

// Function to render the top blur gradient directly on the canvas
export function renderTopBlurGradient(
  ctx: CanvasRenderingContext2D,
  chartWidth: number,
  chartHeight: number,
  chartTop: number
) {
  // Save the current context state
  ctx.save();

  // Create a gradient from top to bottom
  const gradientHeight = 120; // Height of the gradient effect
  const gradient = ctx.createLinearGradient(
    0,
    chartTop,
    0,
    chartTop + gradientHeight
  );

  // Add color stops for a dark gradient that fades out
  gradient.addColorStop(0, "rgba(19, 23, 34, 0.8)"); // Darkest at the top
  gradient.addColorStop(0.5, "rgba(19, 23, 34, 0.4)"); // Medium in the middle
  gradient.addColorStop(1, "rgba(19, 23, 34, 0)"); // Transparent at the bottom

  // Fill the gradient area
  ctx.fillStyle = gradient;
  ctx.fillRect(0, chartTop, chartWidth, gradientHeight);

  // Restore the context state
  ctx.restore();
}

// Export the global candle data for use in other modules
export { globalCandleData };
