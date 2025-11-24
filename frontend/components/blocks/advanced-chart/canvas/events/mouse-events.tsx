"use client";

import type React from "react";
import { useCallback, useRef } from "react";
import { isInMainChartArea } from "./helpers";

// Hook for mouse event handlers
export function useMouseEvents({
  mousePosition,
  isDragging,
  dragStart,
  dimensions,
  visibleRange,
  candleData,
  setVisibleRange,
  setDragStart,
  setMousePosition,
  setIsDragging,
  isThrottled,
  triggerRender,
  priceScaleWidth,
  throttle,
  setHoverEffect,
  chartTop,
  priceChartHeight,
  shouldFetchOlderData,
  fetchOlderData,
}: any) {
  // Use refs to track the last position to avoid unnecessary updates
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const lastDragUpdateRef = useRef(0);

  // Add a safe check function
  const checkAndFetchOlderData = useCallback(() => {
    if (typeof shouldFetchOlderData === "function" && shouldFetchOlderData()) {
      fetchOlderData();
    }
  }, [shouldFetchOlderData, fetchOlderData]);

  // Update mouse move handler to be more efficient
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = e.currentTarget;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Only update if position changed significantly (by at least 2px)
      const positionChanged =
        !lastPositionRef.current ||
        Math.abs(lastPositionRef.current.x - x) > 2 ||
        Math.abs(lastPositionRef.current.y - y) > 2;

      if (positionChanged) {
        // Update the last position ref
        lastPositionRef.current = { x, y };

        // Update mouse position state (debounced)
        if (!isDragging) {
          // Only update mouse position if not dragging to reduce state updates
          // Use a function to update state based on previous value to avoid dependency issues
          setMousePosition((prev) => {
            // Only update if the position has actually changed
            if (!prev || Math.abs(prev.x - x) > 2 || Math.abs(prev.y - y) > 2) {
              return { x, y };
            }
            return prev;
          });
        }

        // Check if we're in the main chart area
        const inMainChartArea = isInMainChartArea(
          x,
          y,
          chartTop,
          priceChartHeight,
          dimensions.width,
          priceScaleWidth
        );

        // Update hover effect only when necessary, not during dragging
        if (!isDragging && inMainChartArea) {
          const chartWidth = dimensions.width - priceScaleWidth;
          if (x < chartWidth) {
            // Check if we're hovering near a candle
            const visibleCount = visibleRange.end - visibleRange.start;
            const candleIndex = Math.floor(
              (x / chartWidth) * visibleCount + visibleRange.start
            );

            if (candleIndex >= 0 && candleIndex < candleData.length) {
              setHoverEffect((prev) => {
                // Only update if the hover effect has changed
                if (
                  !prev ||
                  Math.abs(prev.x - x) > 2 ||
                  Math.abs(prev.y - y) > 2
                ) {
                  return {
                    x,
                    y,
                    radius: 5,
                  };
                }
                return prev;
              });
            } else {
              setHoverEffect((prev) => (prev ? null : prev));
            }
          }
        } else {
          // Clear hover effect during dragging
          setHoverEffect((prev) => (prev ? null : prev));
        }
      }

      // Only handle dragging in the main chart area
      if (
        isDragging &&
        isInMainChartArea(
          x,
          y,
          chartTop,
          priceChartHeight,
          dimensions.width,
          priceScaleWidth
        )
      ) {
        // Throttle drag updates to prevent too many state changes
        const now = Date.now();
        if (now - lastDragUpdateRef.current < 16) {
          // Limit to ~60fps
          return;
        }
        lastDragUpdateRef.current = now;

        const deltaX = x - dragStart.x;
        const chartWidth = dimensions.width - priceScaleWidth;
        const visibleCount = visibleRange.end - visibleRange.start;

        // Calculate move amount based on drag distance with reduced sensitivity for PC
        const pcSensitivity = 0.3; // Much lower sensitivity for smoother PC dragging
        const moveAmount = (deltaX / chartWidth) * visibleCount * pcSensitivity * -1;

        // Store the current visible range width to maintain zoom level
        const rangeWidth = visibleRange.end - visibleRange.start;

        setVisibleRange((prev: any) => {
          let newStart = prev.start + moveAmount;
          let newEnd = prev.end + moveAmount;

          // Store the current visible range width to maintain zoom level
          const rangeWidth = prev.end - prev.start;

          // Calculate minimum visible candles based on zoom level
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

        setDragStart({ x, y });
        triggerRender();
      }
    },
    [
      isDragging,
      dragStart,
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
    ]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = e.currentTarget;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Only allow dragging in the main chart area
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

      // Remove the ripple effect animation
      setHoverEffect(null);

      setIsDragging(true);
      setDragStart({ x, y });

      // Add CSS class for hardware acceleration during dragging
      if (canvas.parentElement) {
        canvas.parentElement.classList.add("dragging");
      }

      // Set cursor style directly for immediate feedback
      canvas.style.cursor = "grabbing";
    },
    [
      setIsDragging,
      setDragStart,
      setHoverEffect,
      chartTop,
      priceChartHeight,
      dimensions.width,
      priceScaleWidth,
    ]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDragging(false);

      // Remove CSS class for hardware acceleration
      const canvas = e.currentTarget;
      if (canvas.parentElement) {
        canvas.parentElement.classList.remove("dragging");
      }

      // Reset cursor style
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Only set grab cursor in the main chart area
      if (
        isInMainChartArea(
          x,
          y,
          chartTop,
          priceChartHeight,
          dimensions.width,
          priceScaleWidth
        )
      ) {
        canvas.style.cursor = "grab";
      } else {
        canvas.style.cursor = "default";
      }
    },
    [
      setIsDragging,
      chartTop,
      priceChartHeight,
      dimensions.width,
      priceScaleWidth,
    ]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDragging(false);
      setMousePosition(null);
      setHoverEffect(null);

      // Remove CSS class for hardware acceleration
      const canvas = e.currentTarget;
      if (canvas.parentElement) {
        canvas.parentElement.classList.remove("dragging");
      }

      // Reset cursor style
      canvas.style.cursor = "default";
    },
    [setIsDragging, setMousePosition, setHoverEffect]
  );

  // Replace the handleWheel function with this simplified, direct implementation
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      // Get the canvas and mouse position
      const canvas = e.currentTarget;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Only allow zooming in the main chart area
      if (
        !isInMainChartArea(
          mouseX,
          mouseY,
          chartTop,
          priceChartHeight,
          dimensions.width,
          priceScaleWidth
        )
      ) {
        return;
      }

      const chartWidth = dimensions.width - priceScaleWidth;

      // Calculate zoom center point in data space
      const visibleCount = visibleRange.end - visibleRange.start;
      const zoomCenterIndex =
        (mouseX / chartWidth) * visibleCount + visibleRange.start;

      // Determine zoom direction and factor - use a much larger factor for immediate response
      const zoomDirection = e.deltaY > 0 ? 1 : -1;
      const zoomFactor = 1 + zoomDirection * 0.2; // Increased from 0.15 to 0.2 for more immediate effect

      // Calculate new visible range directly
      const newVisibleCount = visibleCount * zoomFactor;

      // Ensure we don't zoom in too far or out too far
      const minVisibleCount = 10;
      const maxVisibleCount = candleData.length * 1.2;
      const clampedVisibleCount = Math.max(
        minVisibleCount,
        Math.min(maxVisibleCount, newVisibleCount)
      );

      // Calculate new start and end while keeping the mouse position fixed
      const zoomCenterRatio =
        (zoomCenterIndex - visibleRange.start) / visibleCount;
      const newStart = zoomCenterIndex - zoomCenterRatio * clampedVisibleCount;
      const newEnd = newStart + clampedVisibleCount;

      // Limit future viewing to 50% of visible range beyond the last candle
      const maxEnd = candleData.length + clampedVisibleCount * 0.75;

      // Apply boundaries while preserving zoom level
      let adjustedStart = newStart;
      let adjustedEnd = newEnd;

      if (adjustedEnd > maxEnd) {
        adjustedEnd = maxEnd;
        adjustedStart = adjustedEnd - clampedVisibleCount;
      }

      // Ensure we always keep at least some candles visible
      if (
        adjustedStart >=
        candleData.length - Math.max(10, clampedVisibleCount * 0.3)
      ) {
        adjustedStart =
          candleData.length - Math.max(10, clampedVisibleCount * 0.3);
        adjustedEnd = adjustedStart + clampedVisibleCount;
      }

      // Check if we need to fetch older data
      if (adjustedStart <= 5) {
        checkAndFetchOlderData();
      }

      // Update visible range
      setVisibleRange({ start: Math.max(0, adjustedStart), end: adjustedEnd });

      // Force an IMMEDIATE render without waiting for React
      triggerRender();
    },
    [
      dimensions,
      visibleRange,
      candleData.length,
      setVisibleRange,
      triggerRender,
      priceScaleWidth,
      chartTop,
      priceChartHeight,
      checkAndFetchOlderData,
    ]
  );

  // Return the updated handlers
  return {
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handleWheel,
  };
}
