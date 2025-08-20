"use client";

import type React from "react";

import { useCallback, useRef, useEffect } from "react";
import { isInMainChartArea } from "./helpers";

// Hook for touch event handlers
export function useTouchEvents({
  setTouchStartX,
  setTouchStartY,
  setLastTouchDistance,
  touchStartX,
  touchStartY,
  lastTouchDistance,
  setDragStart,
  setIsDragging,
  dimensions,
  visibleRange,
  candleData,
  setVisibleRange,
  triggerRender,
  priceScaleWidth,
  chartTop,
  priceChartHeight,
  shouldFetchOlderData,
  fetchOlderData,
}: any) {
  // Add a safe check function
  const checkAndFetchOlderData = useCallback(() => {
    if (typeof shouldFetchOlderData === "function" && shouldFetchOlderData()) {
      fetchOlderData();
    }
  }, [shouldFetchOlderData, fetchOlderData]);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastTouchUpdateRef = useRef(0);

  // Refs to store touch handlers for cleanup - initialize with null
  const touchStartHandlerRef = useRef<((e: TouchEvent) => void) | null>(null);
  const touchMoveHandlerRef = useRef<((e: TouchEvent) => void) | null>(null);
  const touchEndHandlerRef = useRef<((e: TouchEvent) => void) | null>(null);

  // Ref to the canvas element
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      // Store the canvas reference
      canvasRef.current = e.currentTarget;

      if (e.touches.length === 1) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;

        // Only allow touch interactions in the main chart area
        if (
          !isInMainChartArea(
            x,
            y,
            chartTop,
            priceChartHeight,
            dimensions.width,
            priceScaleWidth
          )
        ) {
          return;
        }

        // Single touch - prepare for drag
        setTouchStartX(e.touches[0].clientX);
        setTouchStartY(e.touches[0].clientY);
        setIsDragging(true);
        dragStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        setDragStart({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        });

        // Add CSS class for hardware acceleration during dragging
        if (e.currentTarget.parentElement) {
          e.currentTarget.parentElement.classList.add("dragging");
        }
      } else if (e.touches.length === 2) {
        // Check if both touches are in the main chart area
        const rect = e.currentTarget.getBoundingClientRect();
        const x1 = e.touches[0].clientX - rect.left;
        const y1 = e.touches[0].clientY - rect.top;
        const x2 = e.touches[1].clientX - rect.left;
        const y2 = e.touches[1].clientY - rect.top;

        if (
          !isInMainChartArea(
            x1,
            y1,
            chartTop,
            priceChartHeight,
            dimensions.width,
            priceScaleWidth
          ) ||
          !isInMainChartArea(
            x2,
            y2,
            chartTop,
            priceChartHeight,
            dimensions.width,
            priceScaleWidth
          )
        ) {
          return;
        }

        // Two touches - prepare for pinch zoom
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        setLastTouchDistance(distance);

        // Calculate center point between the two touches
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        // Update drag start to center point
        setDragStart({ x: centerX, y: centerY });
      }
    },
    [
      setTouchStartX,
      setTouchStartY,
      setIsDragging,
      setDragStart,
      setLastTouchDistance,
      chartTop,
      priceChartHeight,
      dimensions.width,
      priceScaleWidth,
    ]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault(); // Prevent scrolling

      // Throttle touch updates to prevent too many state changes
      const now = Date.now();
      if (now - lastTouchUpdateRef.current < 16) {
        // Limit to ~60fps
        return;
      }
      lastTouchUpdateRef.current = now;

      const rect = e.currentTarget.getBoundingClientRect();

      if (
        e.touches.length === 1 &&
        touchStartX !== null &&
        touchStartY !== null
      ) {
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;

        // Only process touch move in the main chart area
        if (
          !isInMainChartArea(
            x,
            y,
            chartTop,
            priceChartHeight,
            dimensions.width,
            priceScaleWidth
          )
        ) {
          return;
        }

        // Single touch - handle drag
        const deltaX = e.touches[0].clientX - dragStartRef.current.x;
        const deltaY = e.touches[0].clientY - dragStartRef.current.y;

        // Only process if moved more than a threshold to avoid accidental drags
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          const chartWidth = dimensions.width - priceScaleWidth;
          const visibleCount = visibleRange.end - visibleRange.start;
          const rangeWidth = visibleRange.end - visibleRange.start;

          // Calculate move amount based on drag distance with reduced sensitivity
          // Reduce the sensitivity by applying a damping factor
          const touchSensitivityFactor = 0.2; // Balanced sensitivity for mobile touch
          const moveAmount =
            (deltaX / chartWidth) * visibleCount * touchSensitivityFactor * -1;

          setVisibleRange((prev: any) => {
            let newStart = prev.start + moveAmount;
            let newEnd = prev.end + moveAmount;

            // Store the current visible range width to maintain zoom level
            const rangeWidth = visibleRange.end - visibleRange.start;

            // Calculate minimum visible candles based on zoom level (at least 5 or 30% of visible range)
            const minVisibleCandles = Math.max(10, visibleCount * 0.3);

            // Limit future viewing to 100% of chart width beyond the last candle
            // This respects the current zoom level by using the rangeWidth
            const maxEnd = candleData.length + rangeWidth * 1.0;

            // Handle boundary conditions while preserving zoom level
            if (newStart < -visibleCount * 0.1) {
              // If we hit the left boundary, clamp to a small negative value
              newStart = -visibleCount * 0.1;
              newEnd = newStart + rangeWidth;
            } else if (newEnd > maxEnd) {
              // If we hit the right boundary, clamp to max but maintain the range width
              newEnd = maxEnd;
              newStart = newEnd - rangeWidth;
            }

            // Modified check to ensure we always allow scrolling to the right
            // Even at maximum zoom, we should be able to see future area
            if (newStart >= candleData.length - 5) {
              // Ensure at least 5 candles are visible
              newStart = candleData.length - 5;
              newEnd = newStart + rangeWidth;
            }

            // Check if we need to fetch older data
            if (newStart <= 5) {
              checkAndFetchOlderData();
            }

            return {
              start: newStart,
              end: newEnd,
            };
          });

          setDragStart({
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          });

          triggerRender();
        }
      } else if (e.touches.length === 2 && lastTouchDistance !== null) {
        // Check if both touches are in the main chart area
        const x1 = e.touches[0].clientX - rect.left;
        const y1 = e.touches[0].clientY - rect.top;
        const x2 = e.touches[1].clientX - rect.left;
        const y2 = e.touches[1].clientY - rect.top;

        if (
          !isInMainChartArea(
            x1,
            y1,
            chartTop,
            priceChartHeight,
            dimensions.width,
            priceScaleWidth
          ) ||
          !isInMainChartArea(
            x2,
            y2,
            chartTop,
            priceChartHeight,
            dimensions.width,
            priceScaleWidth
          )
        ) {
          return;
        }

        // Two touches - handle pinch zoom
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );

        // Calculate zoom factor based on pinch distance change
        let zoomFactor = lastTouchDistance / distance;

        // Calculate zoom factor based on pinch distance change with improved sensitivity
        const pinchSensitivityFactor = 0.7; // Adjust between 0.5-0.9 for best feel
        // Apply damping to the zoom factor to make it less aggressive
        zoomFactor =
          1 + (lastTouchDistance / distance - 1) * pinchSensitivityFactor;

        setLastTouchDistance(distance);

        // Only process if zoom factor is significant
        if (Math.abs(zoomFactor - 1) > 0.02) {
          // Calculate center point between the two touches
          const centerX =
            (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
          const chartWidth = dimensions.width - priceScaleWidth;

          // Calculate zoom center in data space
          const visibleCount = visibleRange.end - visibleRange.start;
          const zoomCenterIndex =
            (centerX / chartWidth) * visibleCount + visibleRange.start;

          // Apply zoom with limits
          const newVisibleCount = Math.max(
            10,
            Math.min(candleData.length * 1.5, visibleCount * zoomFactor)
          );

          // Calculate new start and end while keeping the center position fixed
          const zoomCenterRatio =
            (zoomCenterIndex - visibleRange.start) / visibleCount;
          const newStart = zoomCenterIndex - zoomCenterRatio * newVisibleCount;
          const newEnd = newStart + newVisibleCount;

          // Check if we need to fetch older data
          if (newStart <= 5) {
            checkAndFetchOlderData();
          }

          // Ensure we stay within bounds
          let adjustedStart = Math.max(0, newStart);
          let adjustedEnd = Math.min(candleData.length * 1.5, newEnd);

          // If we hit a boundary, adjust the other end to maintain the zoom level
          if (adjustedStart === 0) {
            adjustedEnd = Math.min(
              candleData.length * 1.5,
              adjustedStart + newVisibleCount
            );
          } else if (adjustedEnd === candleData.length * 1.5) {
            adjustedStart = Math.max(0, adjustedEnd - newVisibleCount);
          }

          setVisibleRange({ start: adjustedStart, end: adjustedEnd });

          // Update drag start to new center point
          setDragStart({
            x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
            y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
          });

          triggerRender();
        }
      }
    },
    [
      touchStartX,
      touchStartY,
      lastTouchDistance,
      dimensions,
      visibleRange,
      candleData.length,
      setVisibleRange,
      setDragStart,
      triggerRender,
      priceScaleWidth,
      chartTop,
      priceChartHeight,
      checkAndFetchOlderData,
      setLastTouchDistance,
    ]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setTouchStartX(null);
    setTouchStartY(null);
    setLastTouchDistance(null);

    // Remove the dragging class
    if (canvasRef.current?.parentElement) {
      canvasRef.current.parentElement.classList.remove("dragging");
    }
  }, [setIsDragging, setTouchStartX, setTouchStartY, setLastTouchDistance]);

  // Set up non-passive touch event listeners
  useEffect(() => {
    // Create native event handlers that can be removed later
    touchStartHandlerRef.current = (e: TouchEvent) => {
      if (!canvasRef.current) return;

      // Convert to a React-like event object
      const syntheticEvent = {
        currentTarget: canvasRef.current,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        touches: e.touches,
        targetTouches: e.targetTouches,
        changedTouches: e.changedTouches,
      } as unknown as React.TouchEvent<HTMLCanvasElement>;

      handleTouchStart(syntheticEvent);
    };

    touchMoveHandlerRef.current = (e: TouchEvent) => {
      if (!canvasRef.current) return;

      // Convert to a React-like event object
      const syntheticEvent = {
        currentTarget: canvasRef.current,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        touches: e.touches,
        targetTouches: e.targetTouches,
        changedTouches: e.changedTouches,
      } as unknown as React.TouchEvent<HTMLCanvasElement>;

      handleTouchMove(syntheticEvent);
    };

    touchEndHandlerRef.current = (e: TouchEvent) => {
      handleTouchEnd();
    };

    // Add the event listeners to the document to ensure they capture all touch events
    if (touchStartHandlerRef.current) {
      document.addEventListener("touchstart", touchStartHandlerRef.current, {
        passive: false,
      });
    }

    if (touchMoveHandlerRef.current) {
      document.addEventListener("touchmove", touchMoveHandlerRef.current, {
        passive: false,
      });
    }

    if (touchEndHandlerRef.current) {
      document.addEventListener("touchend", touchEndHandlerRef.current, {
        passive: false,
      });
      document.addEventListener("touchcancel", touchEndHandlerRef.current, {
        passive: false,
      });
    }

    // Clean up
    return () => {
      if (touchStartHandlerRef.current) {
        document.removeEventListener(
          "touchstart",
          touchStartHandlerRef.current
        );
      }
      if (touchMoveHandlerRef.current) {
        document.removeEventListener("touchmove", touchMoveHandlerRef.current);
      }
      if (touchEndHandlerRef.current) {
        document.removeEventListener("touchend", touchEndHandlerRef.current);
        document.removeEventListener("touchcancel", touchEndHandlerRef.current);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
