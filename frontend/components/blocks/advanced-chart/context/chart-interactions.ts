"use client";

import { useCallback } from "react";
import { priceToY, yToPrice, zoomIn, zoomOut, resetZoom } from "../utils";

// Hook to manage chart interactions like zooming and panning
export function useChartInteractions(state: any, dataHooks: any) {
  const {
    visibleRange,
    setVisibleRange,
    isInteractingRef,
    dimensions,
    priceScaleWidth,
    timeScaleHeight,
  } = state;
  const { candleData, dataReady } = dataHooks;

  // Convert price to Y coordinate - only when data is ready
  const priceToYCallback = useCallback(
    (price: number) => {
      if (!dataReady) return 0;
      return priceToY(
        price,
        candleData,
        visibleRange,
        dimensions,
        timeScaleHeight
      );
    },
    [candleData, visibleRange, dimensions, timeScaleHeight, dataReady]
  );

  // Convert Y coordinate to price - only when data is ready
  const yToPriceCallback = useCallback(
    (y: number) => {
      if (!dataReady) return 0;
      return yToPrice(y, candleData, visibleRange, dimensions, timeScaleHeight);
    },
    [candleData, visibleRange, dimensions, timeScaleHeight, dataReady]
  );

  // Improve the zoom functions to be more responsive
  const zoomInCallback = useCallback(() => {
    zoomIn(visibleRange, isInteractingRef, setVisibleRange);
  }, [visibleRange, setVisibleRange, isInteractingRef]);

  const zoomOutCallback = useCallback(() => {
    zoomOut(visibleRange, candleData, isInteractingRef, setVisibleRange);
  }, [visibleRange, candleData, isInteractingRef, setVisibleRange]);

  const resetZoomCallback = useCallback(() => {
    resetZoom(candleData, setVisibleRange);
  }, [candleData, setVisibleRange]);

  return {
    priceToY: priceToYCallback,
    yToPrice: yToPriceCallback,
    resetZoom: resetZoomCallback,
    zoomIn: zoomInCallback,
    zoomOut: zoomOutCallback,
  };
}
